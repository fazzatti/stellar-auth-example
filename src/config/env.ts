import { Asset, Keypair, Networks } from "@stellar/stellar-sdk";
import { Server } from "stellar-sdk/rpc";

/**
 * Configuration module that reads from environment variables
 */

// export interface Config {
//   stellarNetwork: Networks;
//   stellarRpcUrl: string;

//   accountAKeypair: Keypair;
//   accountASequenceNumber: string;
//   accountBKeypair: Keypair;
//   accountCPublicKey: string;
//   validUntilLedgerSeq: number;
//   swapDemo: {
//     assetA: Asset;
//     assetB: Asset;
//     issuer: Keypair;
//     user: Keypair;
//     swapContractId: string;
//     swapContractWasmHash: string;
//   };
//   proxyDemo: {
//     swapContractId: string;
//     assetA: Asset;
//     assetB: Asset;
//     proxyKeypair: Keypair;
//     secureKeypair: Keypair;
//   };
// }

// export interface Args {
//   tx?: string;
//   step?: string;
// }

export function getRequiredEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

export function getOptionalEnv(key: string): string | undefined {
  return Deno.env.get(key);
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

export const stellarNetwork = Networks[networkKey as keyof typeof Networks];

export const ioConfig = {
  outputDirectory: "./.json",
  transactionFileName: "transaction-xdr",
  proxyInputFileName: "proxy-input",
  proxyConfigFileName: "proxy-config",
  airGappedConfigFileName: "air-gapped-config",
  airGappedInputFileName: "air-gapped-input",
  sourceAccountAuthInputFileName: "source-account-auth-input",
  simpleAuthEntryInputFileName: "simple-auth-entry-input",
  swapDemoInputFileName: "swap-demo-input",
  swapContractPath: "./target/wasm32v1-none/release/simple_swap.wasm",
};
export const config = {
  network: stellarNetwork,
  swapDemo: { assetACode: "ASSETA", assetBCode: "ASSETB" },
  io: ioConfig,
};

export const getFriendbotUrl = () => {
  switch (stellarNetwork) {
    case Networks.TESTNET:
      return "https://friendbot.stellar.org";
    case Networks.FUTURENET:
      return "https://friendbot-futurenet.stellar.org";
    case Networks.PUBLIC:
    case Networks.SANDBOX:
    case Networks.STANDALONE:
    default:
      throw new Error(
        `Friendbot is not defined for the ${stellarNetwork} network.`
      );
  }
};

// const accountAKeypair = Keypair.fromSecret(
//   getRequiredEnv("ACCOUNT_A_SECRET_KEY")
// );
// const accountBKeypair = Keypair.fromSecret(
//   getRequiredEnv("ACCOUNT_B_SECRET_KEY")
// );
// const accountASequenceNumber = getRequiredEnv("ACCOUNT_A_SEQUENCE_NUMBER");
// const accountCPublicKey = getRequiredEnv("ACCOUNT_C_PUBLIC_KEY");
// const stellarRpcUrl = getRequiredEnv("STELLAR_RPC_URL");
// const validUntilLedgerSeqEnvRaw = getRequiredEnv("VALID_UNTIL_LEDGER_SEQ");
// let validUntilLedgerSeq: number;

// try {
//   validUntilLedgerSeq = parseInt(validUntilLedgerSeqEnvRaw, 10);
// } catch (error) {
//   console.error("Error parsing VALID_UNTIL_LEDGER_SEQ:", error);
//   throw error;
// }

// const swapContractId = getRequiredEnv("SWAP_CONTRACT_ID");
// const swapContractWasmHash = getRequiredEnv("SWAP_CONTRACT_WASM_HASH");

// const issuer = accountAKeypair;
// const user = accountBKeypair;
// const assetA = new Asset("ASSETA", issuer.publicKey());
// const assetB = new Asset("ASSETB", issuer.publicKey());

// export const config: Config = {
//   stellarNetwork,
//   stellarRpcUrl,
//   accountAKeypair,
//   accountASequenceNumber,
//   accountCPublicKey,
//   accountBKeypair,
//   validUntilLedgerSeq,
//   swapDemo: {
//     assetA,
//     assetB,
//     issuer,
//     user,
//     swapContractId,
//     swapContractWasmHash,
//   },
//   proxyDemo: {
//     swapContractId,
//     assetA,
//     assetB,
//     proxyKeypair: issuer,
//     secureKeypair: user,
//   },
// };

// // Log the loaded configuration
// console.log(`\n------------------------------------------------------------`);
// console.log(`Loaded configuration from environment variables:`);
// console.log(`Using Stellar Network: ${config.stellarNetwork}`);
// console.log(`RPC URL: ${config.stellarRpcUrl}`);
// console.log(`Account A Public Key: ${config.accountAKeypair.publicKey()}`);
// console.log(`Account A Sequence Number: ${config.accountASequenceNumber}`);
// console.log(`Account B Public Key: ${config.accountBKeypair.publicKey()}`);
// console.log(`Account C Public Key: ${config.accountCPublicKey}`);
// console.log(`------------------------------------------------------------\n`);

// // Parse command line arguments
// function parseArgs(): Args {
//   const args = Deno.args;
//   const result: Args = {};

//   for (const arg of args) {
//     if (arg.startsWith("--tx=")) {
//       result.tx = arg.substring(5); // Remove '--tx=' prefix
//     } else if (arg === "--tx" && args.indexOf(arg) < args.length - 1) {
//       // Handle --tx value format
//       const nextIndex = args.indexOf(arg) + 1;
//       result.tx = args[nextIndex];
//     } else if (arg.startsWith("--step=")) {
//       result.step = arg.substring(7); // Remove '--step=' prefix
//     } else if (arg === "--step" && args.indexOf(arg) < args.length - 1) {
//       // Handle --step value format
//       const nextIndex = args.indexOf(arg) + 1;
//       result.step = args[nextIndex];
//     }
//   }

//   return result;
// }

// export const args: Args = parseArgs();

export const getRpc = () => {
  return new Server(getRequiredEnv("STELLAR_RPC_URL"), { allowHttp: true });
};

export const getSourceAccountConfig = () => {
  return {
    network: stellarNetwork,
    sourceKeys: Keypair.fromSecret(
      getRequiredEnv("SOURCE_ACCOUNT_SECRET_KEY_01")
    ),
    receiverPk: getRequiredEnv("RECEIVER_ACCOUNT_PUBLIC_KEY_01"),
    sequenceNumber: getOptionalEnv("SOURCE_SEQUENCE_NUMBER_01"),
    rpc: getRpc(),
  };
};

export const getSimpleAuthEntryConfig = () => {
  return {
    network: stellarNetwork,
    sourceKeys: Keypair.fromSecret(
      getRequiredEnv("SOURCE_ACCOUNT_SECRET_KEY_02")
    ),
    senderKeys: Keypair.fromSecret(
      getRequiredEnv("SENDER_ACCOUNT_SECRET_KEY_02")
    ),
    receiverPk: getRequiredEnv("RECEIVER_ACCOUNT_PUBLIC_KEY_02"),
    validUntilLedgerSeq: getRequiredEnv("VALID_UNTIL_LEDGER_SEQ_02"),
    sequenceNumber: getOptionalEnv("SOURCE_SEQUENCE_NUMBER_02"),
  };
};

export const getDemoSwapContractDeployConfig = () => {
  const issuerKeys = Keypair.fromSecret(getRequiredEnv("ISSUER_SECRET_KEY"));
  const assetA = new Asset("ASSETA", issuerKeys.publicKey());
  const assetB = new Asset("ASSETB", issuerKeys.publicKey());

  return {
    network: stellarNetwork,
    assetA,
    assetB,
    issuerKeys,
  };
};

export const getDemoSwapFundConfig = () => {
  const issuerKeys = Keypair.fromSecret(getRequiredEnv("ISSUER_SECRET_KEY"));
  const assetA = new Asset("ASSETA", issuerKeys.publicKey());
  const assetB = new Asset("ASSETB", issuerKeys.publicKey());

  return {
    network: stellarNetwork,
    assetA,
    assetB,
    issuerKeys,
    userKeys: Keypair.fromSecret(getRequiredEnv("USER_SECRET_KEY")),
  };
};

export const getDemoSwapAuthConfig = () => {
  const issuerKeys = Keypair.fromSecret(getRequiredEnv("ISSUER_SECRET_KEY"));
  const assetA = new Asset("ASSETA", issuerKeys.publicKey());
  const assetB = new Asset("ASSETB", issuerKeys.publicKey());

  return {
    network: stellarNetwork,
    assetA,
    assetB,
    sourceKeys: issuerKeys,
    userKeys: Keypair.fromSecret(getRequiredEnv("USER_SECRET_KEY")),
    contractId: getRequiredEnv("SWAP_CONTRACT_ID"),
    validUntilLedgerSeq: getRequiredEnv("VALID_UNTIL_LEDGER_SEQ_03"),
    sequence: getOptionalEnv("SOURCE_SEQUENCE_NUMBER_03"),
    wasmHash: getOptionalEnv("SWAP_CONTRACT_WASM_HASH"),
  };
};
