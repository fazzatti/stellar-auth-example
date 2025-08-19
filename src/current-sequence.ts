import { config, rpc } from "./config/env.ts";

const { sourceAccountKeypair: sourceKeys } = config;

try {
  const sourceAccount = await rpc.getAccount(sourceKeys.publicKey());
  console.log("\nLoaded account:", sourceAccount.accountId());
  console.log("Current sequence Number:", sourceAccount.sequenceNumber());
} catch (error) {
  console.error("Error checking source account:", error);
  throw error;
}
