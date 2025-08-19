import { args, config } from "../config/env.ts";
import { TransactionBuilder } from "stellar-sdk";
import { sendTransaction } from "./send-transaction-fn.ts";

const { stellarNetwork } = config;
const { tx } = args;

if (!tx) {
  throw new Error("Transaction XDR (--tx) is required");
}

const transaction = TransactionBuilder.fromXDR(tx, stellarNetwork);

console.log("Submitting transaction...");
sendTransaction(transaction);
