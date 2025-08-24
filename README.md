# Stellar Auth Examples

This repository compiles a number of examples around Stellar authorization for smart contracts. These range from simple contract invocations with minimal authorization required to more complex call stacks.

The examples included are:

- [01 Source Account Auth](#example-01---source-account-auth): A contract invocation that is authorized by a single transaction-level signature.
- [02 Simple Auth Entry](#example-02---simple-auth-entry): A contract invocation that requires an auth entries to be signed and provided within the transaction.
- [03 Demo Swap Auth](#example-03---demo-swap-auth): A contract invocation to a demo contract with cross-contract calls requiring authorizaton at different levels of the call-stack.
- [04 Airgapped Auth](#example-04---airgapped-auth): An extension of example-3 in which the transaction is handled by a two-environment setup involving a proxy that assembles the transaction and an airgapped environment that only handles auth entries signing.

## Requirements

- [Deno](https://deno.land/) - Modern runtime for JavaScript and TypeScript
- [Stellar CLI](https://developers.stellar.org/docs/tools/cli/stellar-cli) - The command line interface to Stellar smart contracts

## Setup

1. Copy the environment configuration:

   ```bash
   cp .env.example .env
   ```

   The `.env` is configured by default to use testnet. Feel free to adjust its parameters to use a different target network.

2. For each given example, make sure to execute its setup step as described in their dedicated section.

## Usage

Select a demo example below and follow it's steps to execute. Additional utility commands can be used along with the examples and are described under the section 'Utilities'.

### Example 01 - Source Account Auth

This example cover the steps to assemble and authorize a smart contract invocation of a `transfer` function of a Stellar Asset Contract([SAC](https://developers.stellar.org/docs/tokens/stellar-asset-contract)). The source code can be seen under `./src/examples/01-source-account-auth/`

**Authorization details:**
This transaction is configured so the **source account of the transaction** is the same account as the `from` parameter of the `transfer` function. This means that the same account is responsible for authorizing both the transfer of funds as well as the transaction submission(consuming the 'sequence number' and covering the 'network fees').

In such cases, the transaction will contain an Authorization Entry for `source-account`. This indicates that when processing this transaction, the same signature provided by the source account in the transaction object is also enough to authorize the authorization entry related to the smart contract invocation.

#### **Setup the demo:**

To setup the required accounts for this example, run the following command:

```bash
deno task source-account:setup
```

This command will create and initialize the necessary accounts and then generate an input file called `source-account-auth-input.json` under the `./.json` directory. This file will be used by the example execution.

#### **Running the demo:**

Run the following command:

```bash
deno task source-account
```

**Obs.:** _This example has a 'manual' variant. See the section [Examples with manual variant](#examples-with-manual-variant) for further details._

When the demo is executed, it will output the XDR-encoded transaction fully signed both to the console and to the `./.json` directory under the file `transaction-xdr.json`.

You can use the provided XDR to inspect this transaction in detail using the [Stellar Lab](https://lab.stellar.org/), or use [Send Transaction](#send-transaction) utility to submit the transaction.

### Example 02 - Simple Auth Entry

This example cover the steps to assemble and authorize a smart contract invocation of a `transfer` function of a Stellar Asset Contract([SAC](https://developers.stellar.org/docs/tokens/stellar-asset-contract)). The source code can be seen under `./src/examples/02-simple-auth-entry/`

**Authorization details:**
This transaction is configured so the **source account of the transaction** is **different** than the account set as the `from` parameter of the `transfer` function. This means that we have one account authorizing the transfer of funds and another one authorizing the transaction submission(consuming the 'sequence number' and covering the 'network fees').

In such cases, the transaction will contain an Authorization Entry for `address`, with the specific credentials and call stack related to the smart contract invocation. This entry needs to be signed by the `from` account separately from the transaction object signature.

When authorizing this transaction, the auth entry is signed first and added to the transaction object. Then once all auth entries are signed and embedded in the transaction, the source account will sign the transaction object.

#### **Setup the demo:**

To setup the required accounts for this example, run the following command:

```bash
deno task simple-auth-entry:setup
```

This command will create and initialize the necessary accounts and then generate an input file called `simple-auth-entry-input.json` under the `./.json` directory. This file will be used by the example execution.

#### **Running the demo:**

Run the following command:

```bash
deno task simple-auth-entry
```

**Obs.:** _This example has a 'manual' variant. See the section [Examples with manual variant](#examples-with-manual-variant) for further details._

When the demo is executed, it will output the XDR-encoded transaction fully signed both to the console and to the `./.json` directory under the file `transaction-xdr.json`.

You can use the provided XDR to inspect this transaction in detail using the [Stellar Lab](https://lab.stellar.org/), or use [Send Transaction](#send-transaction) utility to submit the transaction.

### Example 03 - Demo Swap Auth

This example cover the steps to assemble and authorize a smart contract invocation of a `swap` function of a demo contract provided in this project(See the section [Simple Swap Contract](#simple-swap-contract)).

The source code for this example can be an be seen under `./src/examples/03-demo-swap-auth/`

#### **Authorization details:**

This transaction is a bit more complex than the other examples. It requires the following authorization:

- **Transaction Source:** A signature at the transaction level produced by the `source account` of the transaction to authorize the sequence number consumption and covering the network fees.
- **Contract invocation:** Depending on the invocation stack, auth entries need to be signed and provided for each requirement. In this demo, the `swap` function requires authorization from the address performing the swap which will be the `user` account. Also, as parte of a cross-contract call,deeper in the invocation stack, the asset contract moving the funds from this account will also require authorization from the `user` account when executing the `transfer` function.

In such cases, the transaction will contain one or multiple Authorization Entries for `address`, with the specific credentials and call stack related to the smart contract invocation. This entry needs to be signed by the address specified.

When authorizing this transaction, the auth entry/entries is/are signed first and added to the transaction object. Then once all auth entries are signed and embedded in the transaction, the source account will sign the transaction object.

#### **Setup the demo:**

To setup the required contract and accounts for this example, execute the following steps:

1. Build the contract, generating its WASM binary.

```bash
stellar contract build
```

2. Run the demo setup script which will delpoy and initialize the swap contract, accounts and assets.

```bash
deno task swap:setup
```

This command will create and initialize the necessary accounts and then generate an input file called `swap-demo-input.json` under the `./.json` directory. This file will be used by the example execution.
**Running the demo:**
Run the following command:

```bash
deno task swap
```

**Obs.:** _This example has a 'manual' variant. See the section [Examples with manual variant](#examples-with-manual-variant) for further details._

When the demo is executed, it will output the XDR-encoded transaction fully signed both to the console and to the `./.json` directory under the file `transaction-xdr.json`.

You can use the provided XDR to inspect this transaction in detail using the [Stellar Lab](https://lab.stellar.org/), or use [Send Transaction](#send-transaction) utility to submit the transaction.

### Example 04 - Airgapped Auth

This example exemplifies the process of authorizing a transaction through 2 different environments:

- **Airgapped environment**: Securely manage the secret key of the `user` account and signes auth entries for contract invocations based on the input parameters. This environment does not use an RPC or any external data besides the input provided.
- **Proxy environment**: A low-risk environment used to assemble transactions. Given the input provided for a contract invocation, it assembles the transaction, simulates its execution and output the required auth entries that need to be signed in the airgapped environment. When the input also contains the signed entries, the proxy will fully assemble the authorized transaction.

The contract invocation used in this example is the same as [Example 03](#example-03---demo-swap-auth) and also calls the `swap` function of the demo contract provided in this project(See the section [Simple Swap Contract](#simple-swap-contract)).

The source code for this example can be an be seen under `./src/examples/04-air-gapped-auth/`

**Authorization details:**
This transaction requires the following authorization:

- **Contract invocation:** In this demo, the `swap` function requires authorization from the address performing the swap which will be the `user` account. Also, as parte of a cross-contract call,deeper in the invocation stack, the asset contract moving the funds from this account will also require authorization from the `user` account when executing the `transfer` function. Given the invocation parameters, the **proxy environment** will identify auth entries that need to be signed by the **airgapped environment**.
- **Transaction Source:** A signature at the transaction level produced by the `source account` of the transaction to authorize the sequence number consumption and covering the network fees. Here we are using the `source` account which is a low-risk account handled by the **proxy envinronment** just for the transaction submission.

#### **Setup the demo:**

To setup the required contract and accounts for this example, execute the following steps:

1. Build the contract, generating its WASM binary.

```bash
stellar contract build
```

2. Run the demo setup script which will delpoy and initialize the swap contract, accounts and assets.

```bash
deno task ag:setup
```

This command will create and initialize the necessary accounts and then generate the following files under the `./.json` directory:

- `air-gapped-config.json`: This is the config file for the **Airgapped environment** and holds the secret key of the **secure user account** and a **list of whitelisted contracts**. This file exemplifies the what kind of data the secure environmet would manage.
- `proxy-config.json`: This is the config file for the **Proxy environment** and holds only the secret key of the low-risk **source account**. This file exemplifies the what kind of data the proxy environmet would manage.
- `proxy-input.json`: The input arguments to run the `proxy` script. This exemplifies the user input in the proxy environment to either get authorization requirements for a transaction or fully assemble the transaction with given authorized entries.
- `air-gapped-input.json`: The input arguments to run the `airgapped` script. This exemplifies the user input in the airgapped environment to produced the signed entries that authorize a given transaction with the secure key.

Both input files can be manually adjusted to experiment with different parameters for the exemple execution.

#### **Running the demo:**

To run the example and produce the fully authorized transaction, you need to execute the following 3 steps:

1. **Use the proxy environment to generate the auth entries**: Given the input parameters in `proxy-input.json`, make sure the `auth` parameter is empty or not defined and run the following command:

   ```bash
   deno task ag:proxy
   ```

   This command will build a transaction based on the input parameters, simulate with the RPC based on the on-chain state and then extract the required auth entries that need to be signed for this transaction to be authorized. The entries will be automatically added to the `air-gapped-input.json`, under the `auth` parameter, for the next step.

   The auth entries are written as raw parameters for the airgapped environment to re-assemble into auth entries. Alternatively, it is possible to use XDR encoded formatting by using the `:xdr` suffix and running the following command instead:

   ```bash
   deno task ag:proxy:xdr
   ```

   The XDR encoded strings can be used as more condensed input args but in turn are not human-friendly values.

2. **Use the airgapped environment to sign the auth entries**: Given the input parameters in `air-gapped-input.json`, make sure the `auth` parameter contains the required auth entries provided by the previous step and run the following command:

   ```bash
   deno task ag:sign
   ```

   This command will load the provided auth entries and verify if their root invocation matches the invocation described in the input parameters to ensure they haven't been tampered with or generated for a different transaction invocation.

   The entries are then signed with the secure user keys. The signed entries will be automatically added to the `proxy-input.json`, under the `auth` parameter, for the next step.

   The signed auth entries are written as raw parameters containing the `signature`, `nonce` and `expiration ledger` so the proxy environment can append to the entries generated by the simulation. Alternatively, it is possible to use XDR encoded formatting by using the `:xdr` suffix and running the following command instead:

   ```bash
   deno task ag:sign:xdr
   ```

   The XDR encoded strings can be used as more condensed input args but in turn are not human-friendly values.Also, the XDR encoded objects contains the entire entry object and not just the signature parameters.

3. **Use the proxy environment to use the signed entries and fully assemble an authorized transaction**: Given the input parameters in `proxy-input.json`, make sure the `auth` parameter contains the signed auth entries provided by the previous step and run the following command:

   ```bash
   deno task ag:proxy
   ```

   Since this command is the same as in step 1, it will automatically identify if an `auth` parameter is present in the input to trigger the step 3 and fully assemble the transaction.

   When this last step is executed, it will output the XDR-encoded transaction fully signed both to the console and to the `./.json` directory under the file `transaction-xdr.json`.

   You can use the provided XDR to inspect this transaction in detail using the [Stellar Lab](https://lab.stellar.org/), or use [Send Transaction](#send-transaction) utility to submit the transaction.

Additionally, if you'd like to run the steps above multiple times, you can use the command `deno task ag:clear` to update the input json files and automatically remove the `auth` parameters.

### Examples with Manual Variant

Some examples contain a manual variant, which can be triggered by using the suffix ':manual' to their command.
E.g.:

```bash
deno task swap:manual
```

The manual variant assembles the entire transaction manually, without using the RPC for loading chain state or simulating the transaction. The purpose of this variant is to highlight the granular details that go in such a transaction configuration and authorization.

When these variants are used, the input configuration will expect an additional parameter to indicate what is the current sequence number of the source account, it must match the current number on-chain or the transaction will fail. You can usee the [Sequence](#sequence) utility to fetch the current number and automatically update the input file.

## Utilities

These are complementary utilities provided to assist the examples.

### Simple Swap Contract

This project has a contract implementation for the `simple-swap` contract that can be found under `./contracts/simple-swap`. This contract is initialized with a pair of assets(`AssetA` and `AssetB`) and funded with both assets after initialization. It then provides a `swap` function that exchanges in a 1:1 ratio one asset for the other.

The `swap` function helps demonstrate nested requirements for auth as it contains a `require_auth()` at the root level of the function but also as it triggers invocations to the assets's contracts, the underlying `transfer` functions will also require the authorization of the `from` address.

### Send Transaction

This command will read the file `transaction-xdr.json` from the `./.json` directory, load the transaction and submit to the network for processing. Transactions are automatically updated in this file some example finish running.

To use this feature, run the following command:

```bash
deno task send-tx
```

Once completed, the hash and status of the transaction will be outputed to console.

### Sequence

Examples that have a manual variant also accept a 'sequence' utility by appending the suffix `:sequence` to their commands.

E.g.:

```bash
deno task swap:deploy
```

This command will fetch the current [sequence number](https://developers.stellar.org/docs/learn/glossary#sequence-number) for the account defined in the input file as the source account, and then update the input file with the correct sequence number according to the on-chain state.

It is important to note that the **sequence number is consumed after the transaction is processed**, therefore when using the manual variants, it needs to be updated to +1 before the next transaction so you can adjust it manually or use this utility command.

so you can directly inspect and modify the file to experiment with different parameters for the invocation.
