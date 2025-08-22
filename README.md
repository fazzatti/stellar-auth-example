# Stellar Auth Examples

This repository compiles a number of examples around Stellar authorization for smart contracts. These range from simple contract invocations with minimal authorization required to more complex call stacks.

## Requirements

- [Deno](https://deno.land/) - Modern runtime for JavaScript and TypeScript
- [Stellar CLI](https://developers.stellar.org/docs/tools/cli/stellar-cli) - The command line interface to Stellar smart contracts

## Setup

1. Copy the environment configuration:

   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your configuration. A base Stellar configuration is shared across all examples and depending on the given example you'll be running, additional variables might be required. Refer to the file's comments and example's description.

**Important:** Make sure the accounts you're using are initialized on-chain. For testnet and futurenet, this can be done with the Friendbot in [Stellar Lab](https://lab.stellar.org/).

## Usage

Select a demo example below and follow it's steps to execute. Additional utility commands can be used along with the examples and are described under the section 'Utilities'.

### Example 01 - Source Account Auth

This example cover the steps to assemble and authorize a smart contract invocation of a `transfer` function of a Stellar Asset Contract([SAC](https://developers.stellar.org/docs/tokens/stellar-asset-contract)). The source code can be seen under `./src/examples/01-source-account-auth/`

**Authorization details:**
This transaction is configured so the **source account of the transaction** is the same account as the `from` parameter of the `transfer` function. This means that the same account is responsible for authorizing both the transfer of funds as well as the transaction submission(consuming the 'sequence number' and covering the 'network fees').

In such cases, the transaction will contain an Authorization Entry for `source-account`. This indicates that when processing this transaction, the same signature provided by the source account in the transaction object is also enough to authorize the authorization entry related to the smart contract invocation.

**Running the demo:**
First, make sure you have filled the `.env` with the variables required for this example.
Then, run the following command:

```bash
deno task account-source
```

This command will execute the script, output the XDR-encoded transaction fully signed and also output it to the `.json` directory under the file `transaction-xdr.json`.

You can use the provided XDR to inspect this transaction in detail using the [Stellar Lab](https://lab.stellar.org/), or use [Send Transaction](#send-transaction) utility to submit the transaction.

**Manual Variant (No RPC)**
This demo has a manual variant that assembles the entire transaction manually, without using the RPC for loading chain state or simulating the transaction. The purpose of this example is to highlight the granular details that go in such a transaction configuration and authorization.

This variant requires additional variables in the `.env` to indicate:

- **Source sequence number**: The current sequence number of the source account of the transaction. It must match the current number on-chain or the transaction will fail. You can usee the [Sequence](#sequence) utility to fetch the current number.

To execute this variant, run the following command:

```bash
deno task account-source:manual
```

### Example 02 - Simple Auth Entry

This example cover the steps to assemble and authorize a smart contract invocation of a `transfer` function of a Stellar Asset Contract([SAC](https://developers.stellar.org/docs/tokens/stellar-asset-contract)). The source code can be seen under `./src/examples/02-simple-auth-entry/`

**Authorization details:**
This transaction is configured so the **source account of the transaction** is **different** than the account set as the `from` parameter of the `transfer` function. This means that we have one account authorizing the transfer of funds and another one authorizing the transaction submission(consuming the 'sequence number' and covering the 'network fees').

In such cases, the transaction will contain an Authorization Entry for `address`, with the specific credentials and call stack related to the smart contract invocation. This entry needs to be signed by the `from` account separately from the transaction object signature.

When authorizing this transaction, the auth entry is signed first and added to the transaction object. Then once all auth entries are signed and embedded in the transaction, the source account will sign the transaction object.

**Running the demo:**
First, make sure you have filled the `.env` with the variables required for this example.
Then, run the following command:

```bash
deno task simple-auth-entry
```

This command will execute the script, output the XDR-encoded transaction fully signed and also output it to the `.json` directory under the file `transaction-xdr.json`.

You can use the provided XDR to inspect this transaction in detail using the [Stellar Lab](https://lab.stellar.org/), or use [Send Transaction](#send-transaction) utility to submit the transaction.

**Manual Variant (No RPC)**
This demo has a manual variant that assembles the entire transaction manually, without using the RPC for loading chain state or simulating the transaction. The purpose of this example is to highlight the granular details that go in such a transaction configuration and authorization.

This variant requires additional variables in the `.env` to indicate:

- **Source sequence number**: The current sequence number of the source account of the transaction. It must match the current number on-chain or the transaction will fail. You can usee the [Sequence](#sequence) utility to fetch the current number.

To execute this variant, run the following command:

```bash
deno task simple-auth-entry:manual
```

### Example 03 - Demo Swap Auth

This example cover the steps to assemble and authorize a smart contract invocation of a `swap` function of a demo contract provided in this project. See the section [Simple Swap Contract](#simple-swap-contract) and make sure to follow its required steps before running this example.

The source code for this example can be an be seen under `./src/examples/03-demo-swap-auth/`

**Authorization details:**
This transaction is a bit more complex than the other examples. It requires the following authorization:

- **Transaction Source:** A signature at the transaction level produced by the `source account` of the transaction to authorize the sequence number consumption and covering the network fees. Here we are using the `issuer` account only for this purpose.
- **Contract invocation:** Depending on the invocation stack, auth entries need to be signed and provided for each requirement. In this demo, the `swap` function requires authorization from the address performing the swap which will be the `user` account. Also, as parte of a cross-contract call,deeper in the invocation stack, the asset contract moving the funds from this account will also require authorization from the `user` account when executing the `transfer` function.

In such cases, the transaction will contain one or multiple Authorization Entries for `address`, with the specific credentials and call stack related to the smart contract invocation. This entry needs to be signed by the address specified.

When authorizing this transaction, the auth entry/entries is/are signed first and added to the transaction object. Then once all auth entries are signed and embedded in the transaction, the source account will sign the transaction object.

**Running the demo:**
First, make sure you have filled the `.env` with the variables required for this example.
Then, run the following command:

```bash
deno task swap
```

This command will execute the script, output the XDR-encoded transaction fully signed and also output it to the `.json` directory under the file `transaction-xdr.json`.

You can use the provided XDR to inspect this transaction in detail using the [Stellar Lab](https://lab.stellar.org/), or use [Send Transaction](#send-transaction) utility to submit the transaction.

**Manual Variant (No RPC)**
This demo has a manual variant that assembles the entire transaction manually, without using the RPC for loading chain state or simulating the transaction. The purpose of this example is to highlight the granular details that go in such a transaction configuration and authorization.

This variant requires additional variables in the `.env` to indicate:

- **Source sequence number**: The current sequence number of the source account of the transaction. It must match the current number on-chain or the transaction will fail. You can usee the [Sequence](#sequence) utility to fetch the current number.

To execute this variant, run the following command:

```bash
deno task swap:manual
```

## Simple Swap Contract

This project has a contract implementation for the `simple-swap` contract that can be found under `./contracts/simple-swap`. This contract is initialized with a pair of assets(`AssetA` and `AssetB`) and funded with both assets after initialization. It then provides a `swap` function that exchanges in a 1:1 ratio one asset for the other.

The `swap` function helps demonstrate nested requirements for auth as it contains a `require_auth()` at the root level of the function but also as it triggers invocations to the assets's contracts, the underlying `transfer` functions will also require the authorization of the `from` address.

To setup this contract for the examples above follow these steps:

1. Make sure you've filled in the `.env` variables required by the 'Simple Swap Contract Configuration' under 'PRE-DEPLOYMENT PARAMETERS' section.
2. Build the contract, generating its WASM binary.

```bash
stellar contract build
```

3. Run the command below to trigger a script that will upload the wasm, deploy a new instance, wrap two demo assets in SAC contracts and also initialize and fund the swap contract with these assets. This will use the `issuer` account provided in the env variables.

```bash
deno task swap:deploy
```

At the end of the script, copy the `contract id` and `wasm hash` values outputed and use them in the `.env` file under the 'POST-DEPLOYMENT PARAMETERS' section.

1. Run the command below to fund the `user` account with unites of both assets to peform the swaps.

```bash
deno task swap:fund-user
```

## Utilities

These are complementary commands to provide additional features around the demos.

### Send Transaction

This command will read the file `transaction-xdr.json` from the `./.json` directory, load the transaction and submit to the network for processing. Transactions are automatically updated in this file some example finish running.

To use this feature, run the following command:

```bash
deno task send-tx
```

Once completed, the hash and status of the transaction will be outputed to console.

### Sequence

This command will fetch the current [sequence number](https://developers.stellar.org/docs/learn/glossary#sequence-number) for a given account on-chain and log to console.

When using the 'Manual' variants of the examples, you can run this command for the source account, then copy and update the `.env` with the number provided. It is important to note that the **sequence number is consumed after the transaction is processed**, therefore it needs to be updated to +1 before the next transaction.

To use this feature, run the following command, providing the account's public or secret key as argument. The command accepts both interchangeably.

```bash
deno task sequence <ACCOUNT PK / ACCOUNT SK>
```
