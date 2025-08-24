import { stellarNetwork } from "../config/env.ts";
import { TransactionBuilder } from "stellar-sdk";
import { sendTransaction } from "./send-transaction-fn.ts";
import { readTransactionXdr } from "./save-transaction.ts";

const tx = await readTransactionXdr();
const transaction = TransactionBuilder.fromXDR(tx, stellarNetwork);

console.log("Submitting transaction...");
sendTransaction(transaction);
