import { Account, Operation, TransactionBuilder } from "@stellar/stellar-sdk";

import { sendTransaction } from "./send-transaction-fn.ts";
import { getDemoSwapFundConfig, getRpc } from "../config/env.ts";

const { network, assetA, assetB, issuerKeys, userKeys } =
  getDemoSwapFundConfig();
const rpc = getRpc();

const inclusionFee = 1000;

let issuerAccount: Account;
try {
  issuerAccount = await rpc.getAccount(issuerKeys.publicKey());
} catch (error) {
  console.error("Error checking issuer account:", error);
  throw error;
}

try {
  await rpc.getAccount(userKeys.publicKey());
} catch (error) {
  console.error("Error checking user account:", error);
  throw error;
}

console.log("Funding user(Account B) with Asset A and Asset B...");

const tx = new TransactionBuilder(issuerAccount, {
  fee: inclusionFee.toString(),
  networkPassphrase: network,
})
  .addOperation(
    Operation.changeTrust({
      asset: assetA,
      source: userKeys.publicKey(),
    })
  )
  .addOperation(
    Operation.changeTrust({
      asset: assetB,
      source: userKeys.publicKey(),
    })
  )
  .addOperation(
    Operation.payment({
      destination: userKeys.publicKey(),
      asset: assetA,
      amount: "1000000",
    })
  )
  .addOperation(
    Operation.payment({
      destination: userKeys.publicKey(),
      asset: assetB,
      amount: "1000000",
    })
  )
  .setTimeout(90)
  .build();

tx.sign(issuerKeys);
tx.sign(userKeys);

await sendTransaction(tx);

console.log("Funded user with 1M units of Asset A and Asset B");
