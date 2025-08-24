import {
  Account,
  Address,
  Asset,
  authorizeEntry,
  Keypair,
  nativeToScVal,
  Operation,
  SorobanDataBuilder,
  TimeoutInfinite,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";

import { Buffer } from "buffer";
import { config } from "../../config/env.ts";
import { saveTransactionXdr } from "../../utils/save-transaction.ts";
import { readFromJsonFile } from "../../utils/io.ts";
import { SwapDemoInput } from "./simulated-swap.ts";

const { io, network, swapDemo } = config;
const { assetACode, assetBCode } = swapDemo;

const inputArgs = await readFromJsonFile<SwapDemoInput>(
  io.swapDemoInputFileName
);
const {
  userSk,
  sourceSk,
  issuerSk,
  validUntilLedgerSeq,
  contractId,
  wasmHash,
  sourceSequence,
} = inputArgs;

if (!sourceSequence)
  throw new Error(
    "Source account sequence number is not provided in the input file."
  );

if (!wasmHash) throw new Error("WASM hash is not provided in the input file.");

if (!issuerSk)
  throw new Error("Issuer secret key is not provided in the input file.");

const sourceKeys = Keypair.fromSecret(sourceSk);
const userKeys = Keypair.fromSecret(userSk);
const issuerKeys = Keypair.fromSecret(issuerSk);

const assetA = new Asset(assetACode, issuerKeys.publicKey());
const assetB = new Asset(assetBCode, issuerKeys.publicKey());

// ===================================================
// Encode the arguments for a 'swap' invocation
// ===================================================
//

const isSellAssetA = true;

// Bollean to indicate if the swap is for asset A or B
const scValIsSellAssetA = nativeToScVal(isSellAssetA, {
  type: "bool",
});

// The address of the account performing the swap
const scValAccount = nativeToScVal(userKeys.publicKey(), {
  type: "address",
});

// The amount to swap
const scValAmount = nativeToScVal(BigInt(10_0000000), {
  type: "i128",
});

const args: xdr.ScVal[] = [scValIsSellAssetA, scValAccount, scValAmount];

// ===================================================
// Encode the arguments for the subinvocation of the
// 'transfer' function
// ===================================================
//

// The address of the 'from' account
// Here the user account is used as the 'from' account
// as the subinvocation refers to the transfer of the asset
// from the user account to the swap contract.
const scValFrom = scValAccount;

// The address of the account performing the swap
const swapContractAddress = new Address(contractId);
const scValTo = swapContractAddress.toScVal();

const subInvocationArgs: xdr.ScVal[] = [scValFrom, scValTo, scValAmount];

// ===================================================
// Manually assemble the additional data for the
// transaction
// ===================================================

// The account object for the source account to be used in this transaction
// Since an RPC is not used, we need to create the account object manually
// and provide the sequence number directly.
const sourceAccount: Account = new Account(
  sourceKeys.publicKey(),
  sourceSequence
);

// Prepare the footprint of the transaction
// This defines which accounts and contract instances are read and written to
// during the transaction execution.

// Generate a unique random nonce which will be used for the user authorization entry
const randomNonce = new xdr.Int64(
  Math.floor(Math.random() * 100000000000000000)
);

const accountLedgerEntry = xdr.LedgerKey.account(
  new xdr.LedgerKeyAccount({
    accountId: scValAccount.address().accountId(),
  })
);

const swapContractInstanceLedgerEntry = xdr.LedgerKey.contractData(
  new xdr.LedgerKeyContractData({
    contract: swapContractAddress.toScAddress(),
    key: xdr.ScVal.scvLedgerKeyContractInstance(),
    durability: xdr.ContractDataDurability.persistent(),
  })
);

const swapContractCodeLedgerEntry = xdr.LedgerKey.contractCode(
  new xdr.LedgerKeyContractCode({
    hash: Buffer.from(wasmHash, "hex"),
  })
);

const assetAContractAddress = new Address(assetA.contractId(network));
const assetAContractInstanceLedgerEntry = xdr.LedgerKey.contractData(
  new xdr.LedgerKeyContractData({
    contract: assetAContractAddress.toScAddress(),
    key: xdr.ScVal.scvLedgerKeyContractInstance(),
    durability: xdr.ContractDataDurability.persistent(),
  })
);

const assetBContractAddress = new Address(assetB.contractId(network));
const assetBContractInstanceLedgerEntry = xdr.LedgerKey.contractData(
  new xdr.LedgerKeyContractData({
    contract: assetBContractAddress.toScAddress(),
    key: xdr.ScVal.scvLedgerKeyContractInstance(),
    durability: xdr.ContractDataDurability.persistent(),
  })
);

const readOnlyEntries: xdr.LedgerKey[] = [
  accountLedgerEntry,
  swapContractInstanceLedgerEntry,
  assetBContractInstanceLedgerEntry,
  assetAContractInstanceLedgerEntry,
  swapContractCodeLedgerEntry,
];

const assetATrustlineLedgerEntry = xdr.LedgerKey.trustline(
  new xdr.LedgerKeyTrustLine({
    accountId: scValAccount.address().accountId(),
    asset: assetA.toTrustLineXDRObject(),
  })
);

const assetBTrustlineLedgerEntry = xdr.LedgerKey.trustline(
  new xdr.LedgerKeyTrustLine({
    accountId: scValAccount.address().accountId(),
    asset: assetB.toTrustLineXDRObject(),
  })
);

// the temporary entry to store the nonce for the user account account
const nonce = xdr.LedgerKey.contractData(
  new xdr.LedgerKeyContractData({
    contract: scValAccount.address(), // The nonce is stored under the user account address
    key: xdr.ScVal.scvLedgerKeyNonce(
      new xdr.ScNonceKey({ nonce: randomNonce })
    ),
    durability: xdr.ContractDataDurability.temporary(),
  })
);

const assetABalanceLedgerEntry = xdr.LedgerKey.contractData(
  new xdr.LedgerKeyContractData({
    contract: assetAContractAddress.toScAddress(),
    key: xdr.ScVal.scvVec([
      nativeToScVal("Balance", { type: "symbol" }),
      swapContractAddress.toScVal(),
    ]),
    durability: xdr.ContractDataDurability.persistent(),
  })
);

const assetBBalanceLedgerEntry = xdr.LedgerKey.contractData(
  new xdr.LedgerKeyContractData({
    contract: assetBContractAddress.toScAddress(),
    key: xdr.ScVal.scvVec([
      nativeToScVal("Balance", { type: "symbol" }),
      swapContractAddress.toScVal(),
    ]),
    durability: xdr.ContractDataDurability.persistent(),
  })
);

const readWriteEntries: xdr.LedgerKey[] = [
  assetATrustlineLedgerEntry,
  assetBTrustlineLedgerEntry,
  nonce,
  assetBBalanceLedgerEntry,
  assetABalanceLedgerEntry,
];

// These are the resources used by the transaction
// When using the RPC, these are automatically calculated
// during the simulation step. When adding the data manually,
// it is important to set a value that is sufficient for the transaction to succeed.
// If the values are too low, the transaction will fail with a resource limit error.
const cpuInstructions = 1743877;
const readBytes = 392;
const writeBytes = 772;

// The resource fee is the fee charged for the resources used by the transaction
// This is also automatically calculated by the RPC during the simulation step.
// When adding the data manually, it is important to set a value that is sufficient for the transaction to succeed.
// If the value is too low, the transaction will fail with a resource limit error.
const resourceFee = 269952;
// The inclusion fee is the fee charged for including the transaction in a ledger
const inclusionFee = 1000;

const sorobanData = new SorobanDataBuilder()
  .appendFootprint(readOnlyEntries, readWriteEntries)
  .setResources(cpuInstructions, readBytes, writeBytes)
  .setResourceFee(resourceFee)
  .build();

// Prepare the authorization entry for the address of the sender account
// This is the entry that authorizes the invocation of the transfer function.
const addressAuthEntry = new xdr.SorobanAuthorizationEntry({
  credentials: xdr.SorobanCredentials.sorobanCredentialsAddress(
    new xdr.SorobanAddressCredentials({
      address: scValAccount.address(),
      nonce: randomNonce,
      signatureExpirationLedger: Number(validUntilLedgerSeq),
      signature: xdr.ScVal.scvVoid(), // Placeholder, will be filled later
    })
  ),
  rootInvocation: new xdr.SorobanAuthorizedInvocation({
    function:
      xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
        new xdr.InvokeContractArgs({
          contractAddress: swapContractAddress.toScAddress(),
          functionName: "swap",
          args: args,
        })
      ),
    subInvocations: [
      new xdr.SorobanAuthorizedInvocation({
        function:
          xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
            new xdr.InvokeContractArgs({
              contractAddress: isSellAssetA
                ? assetAContractAddress.toScAddress()
                : assetBContractAddress.toScAddress(),
              functionName: "transfer",
              args: subInvocationArgs,
            })
          ),
        subInvocations: [],
      }),
    ],
  }),
});

// Now that we have the authorization entry, we need to sign it with the sender's keys
const signedAddressAuthEntry = await authorizeEntry(
  addressAuthEntry,
  userKeys,
  Number(validUntilLedgerSeq),
  network
);

const authEntries: xdr.SorobanAuthorizationEntry[] = [signedAddressAuthEntry];

// ===================================================
// Assemble the transaction object
// ===================================================
const tx = new TransactionBuilder(sourceAccount, {
  fee: (inclusionFee + resourceFee).toString(),
  networkPassphrase: network,
  sorobanData,
})
  .addOperation(
    Operation.invokeContractFunction({
      contract: contractId,
      function: "swap",
      args,
      auth: authEntries,
    })
  )
  .setTimeout(TimeoutInfinite)
  .build();

tx.sign(sourceKeys);

console.log("Signed Transaction:\n\n", tx.toXDR(), "\n\n");

saveTransactionXdr(tx.toXDR());
