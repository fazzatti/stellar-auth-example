# Stellar Auth Examples

## Requirements

- [Deno](https://deno.land/) - Modern runtime for JavaScript and TypeScript
- [Stellar CLI](https://developers.stellar.org/docs/tools/cli/stellar-cli) - The command line interface to Stellar smart contracts

## Setup

1. Copy the environment configuration:

   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your configuration.

**Important:** Make sure the accounts you're using are initialized on-chain. For testnet, this can be done with the Friendbot in [Stellar Lab](https://lab.stellar.org/).

## Usage

Use the commands below to run each example or utility.

### Swap Examples

The swap examples are based on a smart contract demo within directory `/contracts/simple-swap`. This contract is offers a `swap` function that exchanges in a 1:1 ration the asset A units for asset b units.

This function requires auth for the account performing the swap at a root level, then its underlying subinvocations to the assets contracts request additional auth for each transfer.

To run the examples first make sure to have filled in the .env vars, then follow these steps:

1. Build the contract, generating its WASM binary.

```bash
stellar contract build
```

2. Run the command below to trigger a script that will upload the wasm, deploy a new instance, wrap two demo assets in SAC contracts and also initialize and fund the swap contract with these assets.

```bash
deno task deploy
```

At the end of the script, copy the `contract id` and `wasm hash` values outputed and use them in the `.env` file.

3. Run the command below to fund the 'Account B' which will be used as the `user` account to peform the swaps.

```bash
deno task fund-user
```

#### Swap Authorization Example with Simulation

`(See the script at /src/simulated-swap.ts )`
This example performs a `swap` invocation in which the `user`(Account B) sends the contract some units of Asset A in exchange for the same amount of units from Asset B. This account needs to authorize the root swap invocation as well as the relevant subinvocation for transfering the funds.

The transaction source account is set to the `issuer`(Account A), so this account needs to authorize the use of its sequence number and also the networks fees cost.

This example builds a smart contract transaction using the RPC to simulate its execution. The authorization is then provided based on the simulation result.

To execute the script, run the command below:

```bash
deno task simulated-swap
```

A transaction XDR will be outputed with the fully signed transaction. You can copy this XDR and submit using the utility task `send-tx`, see the section below.

#### Swap Authorization Example without Simulation

`(See the script at /src/no-simulation-swap.ts )`
This example performs a `swap` invocation in which the `user`(Account B) sends the contract some units of Asset A in exchange for the same amount of units from Asset B. This account needs to authorize the root swap invocation as well as the relevant subinvocation for transfering the funds.

The transaction source account is set to the `issuer`(Account A), so this account needs to authorize the use of its sequence number and also the networks fees cost.

This example builds a smart contract transaction without using the RPC, so the entire transaction configuration is done manually. The transaction footprint as well as the authorization entries are assembled based on the expected execution of the transaction.

To execute the script, run the command below:

Obs.: before running it, always make sure to have updated the env for the sequence number. You can use the utility task for `current-sequence` to get the latest value.

```bash
deno task no-simulation-swap
```

A transaction XDR will be outputed with the fully signed transaction. You can copy this XDR and submit using the utility task `send-tx`, see the section below.

### Transfer Examples

#### Source Account Example with Simulation

This example builds a smart contract transaction using the RPC to simulate its execution. This transaction is configured in a way that **requires only a source-account authorization**.

```bash
deno task simulated-source-account
```

#### Source Account Example without Simulation

This example builds a smart contract transaction **without using the RPC or the simulation step**. This transaction is configured in a way that **requires only a source-account authorization**.

Obs.: before running it, always make sure to have updated the env for the sequence number. You can use the utility task for `current-sequence` to get the latest value.

```bash
deno task no-simulation-source-account
```

#### Authorization Entries Example with Simulation

This example builds a smart contract transaction using the RPC to simulate its execution. This transaction is configured in a way that **requires signing individual authorization entries**.

```bash
deno task simulated-auth-entries
```

#### Authorization Entries Example without Simulation

This example builds a smart contract transaction **without using the RPC or the simulation step**. This transaction is configured in a way that **requires signing individual authorization entries**.

Obs.: before running it, always make sure to have updated the env for the sequence number. You can use the utility task for `current-sequence` to get the latest value.

```bash
deno task no-simulation-auth-entries
```

### Utilities

#### Check the current sequence number for the source account

A necessary env for the examples that run without RPC is the `SOURCE_SEQUENCE_NUMBER` which defines what is the current sequence number for the source account (defined in `SOURCE_SECRET_KEY`). For the transactions to be valid, the sequence number in the ENV must match the current sequence number in the ledger.

To get the updated value run:

```bash
deno task current-sequence
```

#### Send a transaction

Given a transaction XDR, it will submit it to the network for processing and check its status for a few attempts. This can be used to submit the transactions generated in the examples.

```bash
deno task send-tx --tx=<TRANSACTION XDR STRING>
```
