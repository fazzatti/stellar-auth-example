import {
  Account,
  Address,
  Asset,
  Keypair,
  nativeToScVal,
  Operation,
  TransactionBuilder,
  xdr,
} from "stellar-sdk";
import { initializeWithFriendbot } from "../../utils/initialize-with-friendbot.ts";
import { config, getRpc } from "../../config/env.ts";
import { saveToJsonFile } from "../../utils/io.ts";
import { getExpirationLedger } from "../../utils/get-expiration-ledger.ts";
import { SwapDemoInput } from "./simulated-swap.ts";
import { loadWasmFile } from "../../utils/load-wasm.ts";
import { sendTransaction } from "../../utils/send-transaction-fn.ts";
import { Buffer } from "buffer";
import { generateRandomSalt } from "../../utils/generate-random-salt.ts";

const { io, swapDemo, network } = config;
const { assetACode, assetBCode } = swapDemo;

const rpc = getRpc();
const issuerKeys = Keypair.random();
const userKeys = Keypair.random();

const assetA = new Asset(assetACode, issuerKeys.publicKey());
const assetB = new Asset(assetBCode, issuerKeys.publicKey());

console.log("=============================================");
console.log("Setup of Example 03 - Simple Swap Demo");
console.log("=============================================");
console.log("Initializing Issuer Account:", issuerKeys.publicKey(), "...");
await initializeWithFriendbot(issuerKeys.publicKey());

console.log("Initializing User Account:", userKeys.publicKey(), "...");
await initializeWithFriendbot(userKeys.publicKey());

console.log("Loading WASM file...");
const wasm = await loadWasmFile(
  "./target/wasm32v1-none/release/simple_swap.wasm"
);

const inclusionFee = 1000;

let issuerAccount: Account;
try {
  issuerAccount = await rpc.getAccount(issuerKeys.publicKey());
} catch (error) {
  console.error("Error checking source account:", error);
  throw error;
}

console.log("Uploading WASM...");
const uploadWasmtx = new TransactionBuilder(issuerAccount, {
  fee: inclusionFee.toString(),
  networkPassphrase: network,
})
  .addOperation(
    Operation.uploadContractWasm({
      wasm,
    })
  )
  .setTimeout(90)
  .build();

const uploadWasmtxPrep = await rpc.prepareTransaction(uploadWasmtx);

uploadWasmtxPrep.sign(issuerKeys);

const uploadResult = await sendTransaction(uploadWasmtxPrep);

const wasmHash = (
  uploadResult.resultMetaXdr
    .v4()
    .sorobanMeta()
    ?.returnValue()
    ?.value() as Buffer
).toString("hex") as string;

console.log("WASM uploaded with hash:", wasmHash);

console.log("Deploying contract...");

const scValAssetA = nativeToScVal(assetA.contractId(network), {
  type: "address",
});
const scValAssetB = nativeToScVal(assetB.contractId(network), {
  type: "address",
});

const constructorArgs: xdr.ScVal[] = [scValAssetA, scValAssetB];

const deployTx = new TransactionBuilder(issuerAccount, {
  fee: inclusionFee.toString(),
  networkPassphrase: network,
})
  .addOperation(
    Operation.createCustomContract({
      address: new Address(issuerKeys.publicKey()),
      wasmHash: Buffer.from(wasmHash!, "hex"),
      salt: generateRandomSalt(),

      constructorArgs: constructorArgs,
    })
  )
  .setTimeout(90)
  .build();

const deployTxPrep = await rpc.prepareTransaction(deployTx);

deployTxPrep.sign(issuerKeys);

const deployResult = await sendTransaction(deployTxPrep);

const contractId = Address.fromScAddress(
  deployResult.resultMetaXdr
    .v4()
    .sorobanMeta()
    ?.returnValue()
    ?.address() as xdr.ScAddress
).toString();

console.log("Contract deployed with ID:", contractId);

console.log("Wrapping Asset A...");

const wrapAssetATx = new TransactionBuilder(issuerAccount, {
  fee: inclusionFee.toString(),
  networkPassphrase: network,
})
  .addOperation(
    Operation.createStellarAssetContract({
      asset: assetA,
    })
  )
  .setTimeout(90)
  .build();

const wrapAssetATxPrep = await rpc
  .prepareTransaction(wrapAssetATx)
  .catch((e) => {
    const errorString = e.toString();
    if (errorString.includes("contract already exists")) {
      console.log("Asset A contract already exists, skipping...");
      return; // Skip this error and continue
    }
    console.error("Error simulating wrap of  Asset A:", e);
    throw e;
  });

// Only submit the transaction if it was prepared successfully
// otherwise, skip since it is already wrapped
if (wrapAssetATxPrep) {
  wrapAssetATxPrep.sign(issuerKeys);
  await sendTransaction(wrapAssetATxPrep);
  console.log("Asset A wrapped");
}

console.log("Wrapping Asset B...");

// reload the issuer account to ensure we have the latest sequence number
// as the transaction above might've been skipped, the sequence could've been bumped
// in the account object even though the transaction was not submitted
issuerAccount = await rpc.getAccount(issuerKeys.publicKey());

const wrapAssetBTx = new TransactionBuilder(issuerAccount, {
  fee: inclusionFee.toString(),
  networkPassphrase: network,
})
  .addOperation(
    Operation.createStellarAssetContract({
      asset: assetB,
    })
  )
  .setTimeout(90)
  .build();

const wrapAssetBTxPrep = await rpc
  .prepareTransaction(wrapAssetBTx)
  .catch((e) => {
    const errorString = e.toString();
    if (errorString.includes("contract already exists")) {
      console.log("Asset B contract already exists, skipping...");
      return; // Skip this error and continue
    }
    console.error("Error simulating wrap of  Asset B:", e);
    throw e;
  });

// Only submit the transaction if it was prepared successfully
// otherwise, skip since it is already wrapped
if (wrapAssetBTxPrep) {
  wrapAssetBTxPrep.sign(issuerKeys);
  await sendTransaction(wrapAssetBTxPrep);
  console.log("Asset B wrapped");
}

console.log("Depositing funds in the contract...");

// reload the issuer account to ensure we have the latest sequence number
// as the transaction above might've been skipped, the sequence could've been bumped
// in the account object even though the transaction was not submitted
issuerAccount = await rpc.getAccount(issuerKeys.publicKey());

const fromAddress = nativeToScVal(issuerKeys.publicKey(), {
  type: "address",
});
const toAddress = nativeToScVal(contractId, {
  type: "address",
});
const amount = nativeToScVal(BigInt(1_000_000_0000000), {
  type: "i128",
});
const transferArgs: xdr.ScVal[] = [fromAddress, toAddress, amount];

const transferATx = new TransactionBuilder(issuerAccount, {
  fee: inclusionFee.toString(),
  networkPassphrase: network,
})
  .addOperation(
    Operation.invokeContractFunction({
      contract: assetA.contractId(network),
      function: "transfer",
      args: transferArgs,
    })
  )
  .setTimeout(90)
  .build();

const transferATxPrep = await rpc.prepareTransaction(transferATx);

transferATxPrep.sign(issuerKeys);

await sendTransaction(transferATxPrep);

console.log("Asset A funds(1M) deposited in the contract");

const transferBTx = new TransactionBuilder(issuerAccount, {
  fee: inclusionFee.toString(),
  networkPassphrase: network,
})
  .addOperation(
    Operation.invokeContractFunction({
      contract: assetB.contractId(network),
      function: "transfer",
      args: transferArgs,
    })
  )
  .setTimeout(90)
  .build();

const transferBTxPrep = await rpc.prepareTransaction(transferBTx);

transferBTxPrep.sign(issuerKeys);

await sendTransaction(transferBTxPrep);

console.log("Asset B funds(1M) deposited in the contract");

try {
  issuerAccount = await rpc.getAccount(issuerKeys.publicKey());
} catch (error) {
  console.error("Error checking issuer account:", error);
  throw error;
}

try {
  await rpc.getAccount(userKeys.publicKey());
} catch (error) {
  console.error("Error checking user account:", error);
  throw error;
}

console.log("Funding user(Account B) with Asset A and Asset B...");

const tx = new TransactionBuilder(issuerAccount, {
  fee: inclusionFee.toString(),
  networkPassphrase: network,
})
  .addOperation(
    Operation.changeTrust({
      asset: assetA,
      source: userKeys.publicKey(),
    })
  )
  .addOperation(
    Operation.changeTrust({
      asset: assetB,
      source: userKeys.publicKey(),
    })
  )
  .addOperation(
    Operation.payment({
      destination: userKeys.publicKey(),
      asset: assetA,
      amount: "1000000",
    })
  )
  .addOperation(
    Operation.payment({
      destination: userKeys.publicKey(),
      asset: assetB,
      amount: "1000000",
    })
  )
  .setTimeout(90)
  .build();

tx.sign(issuerKeys);
tx.sign(userKeys);

await sendTransaction(tx);

console.log("Funded user with 1M units of Asset A and Asset B");

console.log("Loading Source Account...");

try {
  issuerAccount = await rpc.getAccount(issuerKeys.publicKey());
} catch (error) {
  console.error("Error checking issuer account:", error);
  throw error;
}

console.log("Loading latest ledger...");
const minsFromNow = 600;
const validUntilLedgerSeq = await getExpirationLedger(minsFromNow);

console.log(
  "Setting the 'valid until ledger sequence' to:",
  validUntilLedgerSeq
);
console.log(`About ${minsFromNow} minutes from now`);

const output: SwapDemoInput = {
  contractId: contractId,
  wasmHash: wasmHash,
  sourceSk: issuerKeys.secret(),
  userSk: userKeys.secret(),
  issuerSk: issuerKeys.secret(),
  sourceSequence: issuerAccount.sequenceNumber().toString(),
  validUntilLedgerSeq,
};

await saveToJsonFile<SwapDemoInput>(output, io.swapDemoInputFileName);
console.log("Setup complete!");
