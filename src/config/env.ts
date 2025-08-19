import { Keypair, Networks } from "@stellar/stellar-sdk";
import { Server } from "stellar-sdk/rpc";

/**
 * Configuration module that reads from environment variables
 */

export interface Config {
  stellarNetwork: Networks;
  stellarRpcUrl: string;

  sourceAccountKeypair: Keypair;
  sourceAccountSequenceNumber: string;
  destinationAccountPublicKey: string;
  senderAccountKeypair: Keypair;
  validUntilLedgerSeq: number;
}

export interface Args {
  tx?: string;
}

/**
 * Gets a required environment variable or throws an error
 */
export function getRequiredEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

const networkEnv = getRequiredEnv("NETWORK").toLowerCase();

const networkKey =
  networkEnv === "mainnet" ? "PUBLIC" : networkEnv.toUpperCase();

if (!(networkKey in Networks)) {
  throw new Error(
    `Invalid NETWORK value: ${networkEnv}. Must be one of: ${Object.keys(
      Networks
    )
      .join(", ")
      .toLowerCase()}`
  );
}

const stellarNetwork = Networks[networkKey as keyof typeof Networks];

const sourceAccountKeypair = Keypair.fromSecret(
  getRequiredEnv("SOURCE_SECRET_KEY")
);
const senderAccountKeypair = Keypair.fromSecret(
  getRequiredEnv("ANOTHER_SENDER_SECRET_KEY")
);
const sourceAccountSequenceNumber = getRequiredEnv("SOURCE_SEQUENCE_NUMBER");
const destinationAccountPublicKey = getRequiredEnv("DESTINATION_PUBLIC_KEY");
const stellarRpcUrl = getRequiredEnv("STELLAR_RPC_URL");
const validUntilLedgerSeqEnvRaw = getRequiredEnv("VALID_UNTIL_LEDGER_SEQ");
let validUntilLedgerSeq: number;

try {
  validUntilLedgerSeq = parseInt(validUntilLedgerSeqEnvRaw, 10);
} catch (error) {
  console.error("Error parsing VALID_UNTIL_LEDGER_SEQ:", error);
  throw error;
}

export const rpc = new Server(stellarRpcUrl, { allowHttp: true });

export const config: Config = {
  stellarNetwork,
  stellarRpcUrl,
  sourceAccountKeypair,
  sourceAccountSequenceNumber,
  destinationAccountPublicKey,
  senderAccountKeypair,
  validUntilLedgerSeq,
};

// Log the loaded configuration
console.log(`\n------------------------------------------------------------`);
console.log(`Loaded configuration from environment variables:`);
console.log(`Using Stellar Network: ${config.stellarNetwork}`);
console.log(`RPC URL: ${config.stellarRpcUrl}`);
console.log(
  `Source Account Public Key: ${config.sourceAccountKeypair.publicKey()}`
);
console.log(
  `Source Account Sequence Number: ${config.sourceAccountSequenceNumber}`
);
console.log(
  `Destination Account Public Key: ${config.destinationAccountPublicKey}`
);
console.log(`------------------------------------------------------------\n`);

// Parse command line arguments
function parseArgs(): Args {
  const args = Deno.args;
  const result: Args = {};

  for (const arg of args) {
    if (arg.startsWith("--tx=")) {
      result.tx = arg.substring(5); // Remove '--tx=' prefix
    } else if (arg === "--tx" && args.indexOf(arg) < args.length - 1) {
      // Handle --tx value format
      const nextIndex = args.indexOf(arg) + 1;
      result.tx = args[nextIndex];
    }
  }

  return result;
}

export const args: Args = parseArgs();
