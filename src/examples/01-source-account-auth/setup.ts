import { Account, Keypair } from "stellar-sdk";
import { initializeWithFriendbot } from "../../utils/initialize-with-friendbot.ts";
import { config, getRpc } from "../../config/env.ts";
import { SourceAccountDemoInput } from "./simulated-source-account.ts";
import { saveToJsonFile } from "../../utils/io.ts";

const rpc = getRpc();
const sourceKeys = Keypair.random();
const receiverKeys = Keypair.random();
const { io } = config;
console.log("=============================================");
console.log("Setup of Example 01 - Source Account Auth");
console.log("=============================================");
console.log("Initializing Source Account:", sourceKeys.publicKey(), "...");
await initializeWithFriendbot(sourceKeys.publicKey());
console.log("Initializing Receiver Account:", receiverKeys.publicKey(), "...");
await initializeWithFriendbot(receiverKeys.publicKey());

console.log("Loading Source Account...");

let sourceAccount: Account;
try {
  sourceAccount = await rpc.getAccount(sourceKeys.publicKey());
} catch (error) {
  console.error("Error checking source account:", error);
  throw error;
}

const output: SourceAccountDemoInput = {
  sourceSk: sourceKeys.secret(),
  receiverPk: receiverKeys.publicKey(),
  sourceSequence: sourceAccount.sequenceNumber().toString(),
};

await saveToJsonFile<SourceAccountDemoInput>(
  output,
  io.sourceAccountAuthInputFileName
);
console.log("Setup complete!");
