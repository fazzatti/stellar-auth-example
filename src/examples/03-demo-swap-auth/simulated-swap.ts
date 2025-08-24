import {
  Account,
  Address,
  authorizeEntry,
  Keypair,
  nativeToScVal,
  Operation,
  TimeoutInfinite,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { Api } from "stellar-sdk/rpc";
import { config, getRpc } from "../../config/env.ts";
import { saveTransactionXdr } from "../../utils/save-transaction.ts";
import { readFromJsonFile } from "../../utils/io.ts";

export interface SwapDemoInput {
  contractId: string;
  sourceSk: string;
  userSk: string;
  validUntilLedgerSeq: number;
  sourceSequence?: string;
  issuerSk?: string;
  wasmHash?: string;
}

const { io, network } = config;

const inputArgs = await readFromJsonFile<SwapDemoInput>(
  io.swapDemoInputFileName
);
const { userSk, sourceSk, validUntilLedgerSeq, contractId } = inputArgs;
const rpc = getRpc();

const sourceKeys = Keypair.fromSecret(sourceSk);
const userKeys = Keypair.fromSecret(userSk);

// const { network, sourceKeys, userKeys, contractId, validUntilLedgerSeq } =
//   getDemoSwapAuthConfig();
// const rpc = getRpc();

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
const scValuAccount = nativeToScVal(userKeys.publicKey(), {
  type: "address",
});

// The amount to swap
const scValAmount = nativeToScVal(BigInt(10_0000000), {
  type: "i128",
});

const args: xdr.ScVal[] = [scValIsSellAssetA, scValuAccount, scValAmount];

// ===================================================
// Prepare additional data for the transaction
// ===================================================

// The inclusion fee is the fee charged for including the transaction in a ledger
const inclusionFee = 1000;

// User the RPC to load the source account data from the ledger
// This ensures the account exists and also retrieves the current sequence number
// Here we're using the issuer account as the source account for the transaction.
let sourceAccount: Account;
try {
  sourceAccount = await rpc.getAccount(sourceKeys.publicKey());
} catch (error) {
  console.error("Error checking source account:", error);
  throw error;
}

// ===================================================
// Assemble the transaction object
// ===================================================
const tx = new TransactionBuilder(sourceAccount, {
  fee: inclusionFee.toString(),
  networkPassphrase: network,
})
  .addOperation(
    Operation.invokeContractFunction({
      contract: contractId,
      function: "swap",
      args,
    })
  )
  .setTimeout(TimeoutInfinite)
  .build();

// ===================================================
// Simulate and authorize entries for the transaction
// ===================================================
//
// Since this transaction needs an authorization from the sender account,
// which differs from the source account, this means we will need to
// provide additional authorization as the source-account auth wouldn't be sufficient

// Simulate the transaction and get the respose object
const simulatedTransaction = (await rpc.simulateTransaction(
  tx
)) as Api.SimulateTransactionSuccessResponse;

// Check if the simulation was has authorization entries
const entries = simulatedTransaction.result?.auth;
if (!entries || entries.length === 0) {
  throw new Error("No auth entries returned from simulation");
}

// Check each entry and sign the necessary ones
//
const signedEntries = [];

console.log("Verifying Auth Entries from simulation:");
for (const entry of entries) {
  // Here we know we're only dealing with account signers
  // but depending on the use case you might want to handle contract signers too
  const requiredSigner = Address.account(
    entry.credentials().address().address().accountId().value()
  ).toString();

  if (entry.credentials().switch().name === "sorobanCredentialsSourceAccount") {
    console.log("Source Account Entry found for account:", requiredSigner);

    continue; // Source account entry, no need to sign the entry individually
  }

  // look for our user authorization entry and sign it
  if (requiredSigner === userKeys.publicKey()) {
    console.log("Signing for required signer:", requiredSigner);
    signedEntries.push(
      await authorizeEntry(
        entry,
        userKeys,
        Number(validUntilLedgerSeq),
        network
      )
    );
    continue;
  }

  // If we reach here, it means we have an unexpected auth entry
  // for this given transaction
  throw new Error(
    "Unexpected auth entry for required signer: " + requiredSigner
  );
}

// ===================================================
// Update the transaction with the signed entries and simulation data
// ===================================================
//
// Now we need to assemble a transaction object that is equal to the original
// but also includes:
// - The signed entries
// - The simulation data (Footprint, resource fee, etc.)
// - The updated fee to account for the resource fee too

const transactionData = simulatedTransaction.transactionData.build();

const resourceFee = Number(transactionData.resourceFee().toBigInt());

const op = tx.toEnvelope().v1().tx().operations()[0];

// Here we add the signed entries to the operation object
const authorizedOperation = Operation.invokeHostFunction({
  func: op.body().invokeHostFunctionOp().hostFunction(),
  auth: signedEntries,
});

// When a transaction object is assembled, the sequence is automatically bumped
// to the next sequence number, so we need to ensure that the source account
// sequence number is not bumped by the transaction builder again.
const updatedSourceAccount = new Account(
  tx.source,
  (Number(tx.sequence) - 1).toString()
);

const updatedTx = new TransactionBuilder(updatedSourceAccount, {
  fee: (inclusionFee + resourceFee).toString(),
  networkPassphrase: network,
  sorobanData: transactionData,
  timebounds: tx.timeBounds,
  minAccountSequence: tx.minAccountSequence,
  minAccountSequenceAge: tx.minAccountSequenceAge,
  minAccountSequenceLedgerGap: tx.minAccountSequenceLedgerGap,
});

updatedTx.addOperation(authorizedOperation);

const finalTx = updatedTx.build();

finalTx.sign(sourceKeys);

console.log("Signed Transaction:\n\n", finalTx.toXDR(), "\n\n");

saveTransactionXdr(finalTx.toXDR());
