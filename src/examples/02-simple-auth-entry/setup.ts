import { Account, Keypair } from "stellar-sdk";
import { initializeWithFriendbot } from "../../utils/initialize-with-friendbot.ts";
import { config, getRpc } from "../../config/env.ts";
import { saveToJsonFile } from "../../utils/io.ts";
import { SimpleAuthEntryDemoInput } from "./simulated-auth-entries.ts";
import { getExpirationLedger } from "../../utils/get-expiration-ledger.ts";

const rpc = getRpc();
const sourceKeys = Keypair.random();
const senderKeys = Keypair.random();
const receiverKeys = Keypair.random();
const { io } = config;

console.log("=============================================");
console.log("Setup of Example 02 - Simple Auth Entry");
console.log("=============================================");
console.log("Initializing Source Account:", sourceKeys.publicKey(), "...");
await initializeWithFriendbot(sourceKeys.publicKey());

console.log("Initializing Sender Account:", senderKeys.publicKey(), "...");
await initializeWithFriendbot(senderKeys.publicKey());

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

console.log("Loading latest ledger...");
const minsFromNow = 600;
const validUntilLedgerSeq = await getExpirationLedger(minsFromNow);

console.log(
  "Setting the 'valid until ledger sequence' to:",
  validUntilLedgerSeq
);
console.log(`About ${minsFromNow} minutes from now`);

const output: SimpleAuthEntryDemoInput = {
  sourceSk: sourceKeys.secret(),
  senderSk: senderKeys.secret(),
  receiverPk: receiverKeys.publicKey(),
  sourceSequence: sourceAccount.sequenceNumber().toString(),
  validUntilLedgerSeq,
};

await saveToJsonFile<SimpleAuthEntryDemoInput>(
  output,
  io.simpleAuthEntryInputFileName
);
console.log("Setup complete!");
