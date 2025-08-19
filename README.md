# Stellar Auth Examples

## Requirements

- [Deno](https://deno.land/) - Modern runtime for JavaScript and TypeScript

## Setup

1. Copy the environment configuration:

   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your configuration.

**Important:** Make sure the accounts you're using are initialized on-chain. For testnet, this can be done with the Friendbot in [Stellar Lab](https://lab.stellar.org/).

## Usage

Use the commands below to run each example or utility.

### Examples

#### Source Account Example with Simulation

This example builds a smart contract transaction using the RPC to simulate its execution. This transaction is configured in a way that **requires only a source-account authorization**.

```bash
deno task simulated-source-account
```

#### Source Account Example without Simulation

This example builds a smart contract transaction **without using the RPC or the simulation step**. This transaction is configured in a way that **requires only a source-account authorization**.

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
