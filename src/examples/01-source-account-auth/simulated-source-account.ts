import {
  Account,
  Asset,
  Keypair,
  nativeToScVal,
  Operation,
  TimeoutInfinite,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { config, getRpc } from "../../config/env.ts";
import { readFromJsonFile } from "../../utils/io.ts";
import { saveTransactionXdr } from "../../utils/save-transaction.ts";

export interface SourceAccountDemoInput {
  sourceSk: string;
  receiverPk: string;
  sourceSequence?: string;
}

const { io, network } = config;

const inputArgs = await readFromJsonFile<SourceAccountDemoInput>(
  io.sourceAccountAuthInputFileName
);

const { receiverPk, sourceSk } = inputArgs;
const rpc = getRpc();

const sourceKeys = Keypair.fromSecret(sourceSk);

// ===================================================
// Encode the arguments for a 'transfer' invocation
// ===================================================
const xlm = Asset.native();

const fromAddress = nativeToScVal(sourceKeys.publicKey(), {
  type: "address",
});
const toAddress = nativeToScVal(receiverPk, {
  type: "address",
});
const amount = nativeToScVal(BigInt(10_0000000), {
  type: "i128",
});
const args: xdr.ScVal[] = [fromAddress, toAddress, amount];

// ===================================================
// Prepare additional data for the transaction
// ===================================================

// The inclusion fee is the fee charged for including the transaction in a ledger
const inclusionFee = 1000;

// User the RPC to load the source account data from the ledger
// This ensures the account exists and also retrieves the current sequence number
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
      contract: xlm.contractId(network),
      function: "transfer",
      args,
    })
  )
  .setTimeout(TimeoutInfinite)
  .build();

// Since we're using the RPC and this transaction will only require the
// source-account authorization, we won't need to extract and sign indivitual
// authorization entries. Instead, we can directly use the 'prepareTransaction' feature
// to simulate and update the transaction object automatically
const simulatedTransaction = await rpc.prepareTransaction(tx);

// Sign the transaction with the source account keypair
simulatedTransaction.sign(sourceKeys);

console.log("Signed Transaction:\n\n", simulatedTransaction.toXDR(), "\n\n");

saveTransactionXdr(simulatedTransaction.toXDR());
