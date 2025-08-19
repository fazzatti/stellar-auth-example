import {
  Account,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { config, rpc } from "../config/env.ts";
import { sendTransaction } from "./send-transaction-fn.ts";

const { assetA, assetB, issuer, user } = config.swapDemo;

const inclusionFee = 1000;

let issuerAccount: Account;
try {
  issuerAccount = await rpc.getAccount(issuer.publicKey());
} catch (error) {
  console.error("Error checking issuer account:", error);
  throw error;
}

try {
  await rpc.getAccount(user.publicKey());
} catch (error) {
  console.error("Error checking user account:", error);
  throw error;
}

console.log("Funding user(Account B) with Asset A and Asset B...");

const tx = new TransactionBuilder(issuerAccount, {
  fee: inclusionFee.toString(),
  networkPassphrase: Networks.TESTNET,
})
  .addOperation(
    Operation.changeTrust({
      asset: assetA,
      source: user.publicKey(),
    })
  )
  .addOperation(
    Operation.changeTrust({
      asset: assetB,
      source: user.publicKey(),
    })
  )
  .addOperation(
    Operation.payment({
      destination: user.publicKey(),
      asset: assetA,
      amount: "1000000",
    })
  )
  .addOperation(
    Operation.payment({
      destination: user.publicKey(),
      asset: assetB,
      amount: "1000000",
    })
  )
  .setTimeout(90)
  .build();

tx.sign(issuer);
tx.sign(user);

await sendTransaction(tx);

console.log("Funded user with 1M units of Asset A and Asset B");
