import { Asset, Keypair, Networks } from "@stellar/stellar-sdk";
import { Server } from "stellar-sdk/rpc";

/**
 * Configuration module that reads from environment variables
 */

export interface Config {
  stellarNetwork: Networks;
  stellarRpcUrl: string;

  accountAKeypair: Keypair;
  accountASequenceNumber: string;
  accountBKeypair: Keypair;
  accountCPublicKey: string;
  validUntilLedgerSeq: number;
  swapDemo: {
    assetA: Asset;
    assetB: Asset;
    issuer: Keypair;
    user: Keypair;
    swapContractId: string;
    swapContractWasmHash: string;
  };
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

const accountAKeypair = Keypair.fromSecret(
  getRequiredEnv("ACCOUNT_A_SECRET_KEY")
);
const accountBKeypair = Keypair.fromSecret(
  getRequiredEnv("ACCOUNT_B_SECRET_KEY")
);
const accountASequenceNumber = getRequiredEnv("ACCOUNT_A_SEQUENCE_NUMBER");
const accountCPublicKey = getRequiredEnv("ACCOUNT_C_PUBLIC_KEY");
const stellarRpcUrl = getRequiredEnv("STELLAR_RPC_URL");
const validUntilLedgerSeqEnvRaw = getRequiredEnv("VALID_UNTIL_LEDGER_SEQ");
let validUntilLedgerSeq: number;

try {
  validUntilLedgerSeq = parseInt(validUntilLedgerSeqEnvRaw, 10);
} catch (error) {
  console.error("Error parsing VALID_UNTIL_LEDGER_SEQ:", error);
  throw error;
}

const swapContractId = getRequiredEnv("SWAP_CONTRACT_ID");
const swapContractWasmHash = getRequiredEnv("SWAP_CONTRACT_WASM_HASH");

const issuer = accountAKeypair;
const user = accountBKeypair;
const assetA = new Asset("ASSETA", issuer.publicKey());
const assetB = new Asset("ASSETB", issuer.publicKey());

export const rpc = new Server(stellarRpcUrl, { allowHttp: true });

export const config: Config = {
  stellarNetwork,
  stellarRpcUrl,
  accountAKeypair,
  accountASequenceNumber,
  accountCPublicKey,
  accountBKeypair,
  validUntilLedgerSeq,
  swapDemo: {
    assetA,
    assetB,
    issuer,
    user,
    swapContractId,
    swapContractWasmHash,
  },
};

// Log the loaded configuration
console.log(`\n------------------------------------------------------------`);
console.log(`Loaded configuration from environment variables:`);
console.log(`Using Stellar Network: ${config.stellarNetwork}`);
console.log(`RPC URL: ${config.stellarRpcUrl}`);
console.log(`Account A Public Key: ${config.accountAKeypair.publicKey()}`);
console.log(`Account A Sequence Number: ${config.accountASequenceNumber}`);
console.log(`Account B Public Key: ${config.accountBKeypair.publicKey()}`);
console.log(`Account C Public Key: ${config.accountCPublicKey}`);
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
