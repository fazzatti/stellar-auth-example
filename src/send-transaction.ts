import { Api } from "stellar-sdk/rpc";
import { args, config, rpc } from "./config/env.ts";
import { TransactionBuilder } from "stellar-sdk";

const { stellarNetwork } = config;
const { tx } = args;

if (!tx) {
  throw new Error("Transaction XDR (--tx) is required");
}

const transaction = TransactionBuilder.fromXDR(tx, stellarNetwork);

console.log("Submitting transaction...");

rpc
  .sendTransaction(transaction)
  .then(async (reply) => {
    if (reply.status !== "PENDING") {
      throw reply;
    }
    ``;

    console.log(
      `Transaction sent, waiting for confirmation... \nHash: ${reply.hash}`
    );

    return rpc.pollTransaction(reply.hash, {
      sleepStrategy: (_iter: number) => 1000,
      attempts: 5,
    });
  })
  .then((finalStatus) => {
    switch (finalStatus.status) {
      case Api.GetTransactionStatus.FAILED:
      case Api.GetTransactionStatus.NOT_FOUND:
        throw new Error(
          `Transaction failed with status: ${finalStatus.status}`
        );
      case Api.GetTransactionStatus.SUCCESS:
        console.log("Transaction succeeded!");
        return finalStatus.status;
    }
  })
  .then(function (result) {
    console.log("Success! Results:", result);
  })
  .catch(function (error) {
    console.error("Something went wrong for transaction!", error);
  });
