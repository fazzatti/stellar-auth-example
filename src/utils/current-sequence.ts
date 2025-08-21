import { Keypair } from "stellar-sdk";
import { getRpc } from "../config/env.ts";
import { getArgs } from "./get-args.ts";

const rpc = getRpc();
const sourceArg = getArgs(1)[0];

const isSecret = sourceArg.startsWith("S");
const sourceKeys = isSecret
  ? Keypair.fromSecret(sourceArg)
  : Keypair.fromPublicKey(sourceArg);

try {
  const sourceAccount = await rpc.getAccount(sourceKeys.publicKey());
  console.log("\nLoaded account:", sourceAccount.accountId());
  console.log("Current sequence Number:", sourceAccount.sequenceNumber());
} catch (error) {
  console.error("Error checking source account:", error);
  throw error;
}
