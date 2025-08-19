import {
  Account,
  Address,
  nativeToScVal,
  Networks,
  Operation,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { config, rpc } from "../config/env.ts";
import { loadWasmFile } from "./load-wasm.ts";
import { sendTransaction } from "./send-transaction-fn.ts";
import { Buffer } from "buffer";
import { generateRandomSalt } from "./generate-random-salt.ts";

const wasm = await loadWasmFile(
  "./target/wasm32v1-none/release/simple_swap.wasm"
);

const { assetA, assetB, issuer } = config.swapDemo;

const inclusionFee = 1000;

let issuerAccount: Account;
try {
  issuerAccount = await rpc.getAccount(issuer.publicKey());
} catch (error) {
  console.error("Error checking source account:", error);
  throw error;
}

console.log("Uploading WASM...");
const uploadWasmtx = new TransactionBuilder(issuerAccount, {
  fee: inclusionFee.toString(),
  networkPassphrase: Networks.TESTNET,
})
  .addOperation(
    Operation.uploadContractWasm({
      wasm,
    })
  )
  .setTimeout(90)
  .build();

const uploadWasmtxPrep = await rpc.prepareTransaction(uploadWasmtx);

uploadWasmtxPrep.sign(issuer);

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

const scValAssetA = nativeToScVal(assetA.contractId(config.stellarNetwork), {
  type: "address",
});
const scValAssetB = nativeToScVal(assetB.contractId(config.stellarNetwork), {
  type: "address",
});

const constructorArgs: xdr.ScVal[] = [scValAssetA, scValAssetB];

const deployTx = new TransactionBuilder(issuerAccount, {
  fee: inclusionFee.toString(),
  networkPassphrase: Networks.TESTNET,
})
  .addOperation(
    Operation.createCustomContract({
      address: new Address(issuer.publicKey()),
      wasmHash: Buffer.from(wasmHash!, "hex"),
      salt: generateRandomSalt(),

      constructorArgs: constructorArgs,
    })
  )
  .setTimeout(90)
  .build();

const deployTxPrep = await rpc.prepareTransaction(deployTx);

deployTxPrep.sign(issuer);

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
  networkPassphrase: Networks.TESTNET,
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
  wrapAssetATxPrep.sign(issuer);
  await sendTransaction(wrapAssetATxPrep);
  console.log("Asset A wrapped");
}

console.log("Wrapping Asset B...");

// reload the issuer account to ensure we have the latest sequence number
// as the transaction above might've been skipped, the sequence could've been bumped
// in the account object even though the transaction was not submitted
issuerAccount = await rpc.getAccount(issuer.publicKey());

const wrapAssetBTx = new TransactionBuilder(issuerAccount, {
  fee: inclusionFee.toString(),
  networkPassphrase: Networks.TESTNET,
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
  wrapAssetBTxPrep.sign(issuer);
  await sendTransaction(wrapAssetBTxPrep);
  console.log("Asset B wrapped");
}

console.log("Depositing funds in the contract...");

// reload the issuer account to ensure we have the latest sequence number
// as the transaction above might've been skipped, the sequence could've been bumped
// in the account object even though the transaction was not submitted
issuerAccount = await rpc.getAccount(issuer.publicKey());

const fromAddress = nativeToScVal(issuer.publicKey(), {
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
  networkPassphrase: Networks.TESTNET,
})
  .addOperation(
    Operation.invokeContractFunction({
      contract: assetA.contractId(Networks.TESTNET),
      function: "transfer",
      args: transferArgs,
    })
  )
  .setTimeout(90)
  .build();

const transferATxPrep = await rpc.prepareTransaction(transferATx);

transferATxPrep.sign(issuer);

await sendTransaction(transferATxPrep);

console.log("Asset A funds(1M) deposited in the contract");

const transferBTx = new TransactionBuilder(issuerAccount, {
  fee: inclusionFee.toString(),
  networkPassphrase: Networks.TESTNET,
})
  .addOperation(
    Operation.invokeContractFunction({
      contract: assetB.contractId(Networks.TESTNET),
      function: "transfer",
      args: transferArgs,
    })
  )
  .setTimeout(90)
  .build();

const transferBTxPrep = await rpc.prepareTransaction(transferBTx);

transferBTxPrep.sign(issuer);

await sendTransaction(transferBTxPrep);

console.log("Asset B funds(1M) deposited in the contract");

console.log("All done!");

console.log(`\n\n
------------------------------------------------------------
Code Uploaded - Wasm Hash: ${wasmHash}
Swap Contract deployed - ID: ${contractId}
`);
