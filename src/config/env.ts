import { Networks } from "@stellar/stellar-sdk";
import { highlightText } from "../utils/highlight-text.ts";
import { Server } from "stellar-sdk/rpc";

export function getRequiredEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) {
    console.error(
      highlightText(
        `Error: Environment variable ${key} is not set.\nCheck the 'Setup' section of the README.md file.`,
        "red"
      )
    );

    throw new Error(`Required environment variable ${key} is not set. `);
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

export const getRpc = () => {
  return new Server(getRequiredEnv("STELLAR_RPC_URL"), { allowHttp: true });
};

// export const getSourceAccountConfig = () => {
//   return {
//     network: stellarNetwork,
//     sourceKeys: Keypair.fromSecret(
//       getRequiredEnv("SOURCE_ACCOUNT_SECRET_KEY_01")
//     ),
//     receiverPk: getRequiredEnv("RECEIVER_ACCOUNT_PUBLIC_KEY_01"),
//     sequenceNumber: getOptionalEnv("SOURCE_SEQUENCE_NUMBER_01"),
//     rpc: getRpc(),
//   };
// };

// export const getSimpleAuthEntryConfig = () => {
//   return {
//     network: stellarNetwork,
//     sourceKeys: Keypair.fromSecret(
//       getRequiredEnv("SOURCE_ACCOUNT_SECRET_KEY_02")
//     ),
//     senderKeys: Keypair.fromSecret(
//       getRequiredEnv("SENDER_ACCOUNT_SECRET_KEY_02")
//     ),
//     receiverPk: getRequiredEnv("RECEIVER_ACCOUNT_PUBLIC_KEY_02"),
//     validUntilLedgerSeq: getRequiredEnv("VALID_UNTIL_LEDGER_SEQ_02"),
//     sequenceNumber: getOptionalEnv("SOURCE_SEQUENCE_NUMBER_02"),
//   };
// };

// export const getDemoSwapContractDeployConfig = () => {
//   const issuerKeys = Keypair.fromSecret(getRequiredEnv("ISSUER_SECRET_KEY"));
//   const assetA = new Asset("ASSETA", issuerKeys.publicKey());
//   const assetB = new Asset("ASSETB", issuerKeys.publicKey());

//   return {
//     network: stellarNetwork,
//     assetA,
//     assetB,
//     issuerKeys,
//   };
// };

// export const getDemoSwapFundConfig = () => {
//   const issuerKeys = Keypair.fromSecret(getRequiredEnv("ISSUER_SECRET_KEY"));
//   const assetA = new Asset("ASSETA", issuerKeys.publicKey());
//   const assetB = new Asset("ASSETB", issuerKeys.publicKey());

//   return {
//     network: stellarNetwork,
//     assetA,
//     assetB,
//     issuerKeys,
//     userKeys: Keypair.fromSecret(getRequiredEnv("USER_SECRET_KEY")),
//   };
// };

// export const getDemoSwapAuthConfig = () => {
//   const issuerKeys = Keypair.fromSecret(getRequiredEnv("ISSUER_SECRET_KEY"));
//   const assetA = new Asset("ASSETA", issuerKeys.publicKey());
//   const assetB = new Asset("ASSETB", issuerKeys.publicKey());

//   return {
//     network: stellarNetwork,
//     assetA,
//     assetB,
//     sourceKeys: issuerKeys,
//     userKeys: Keypair.fromSecret(getRequiredEnv("USER_SECRET_KEY")),
//     contractId: getRequiredEnv("SWAP_CONTRACT_ID"),
//     validUntilLedgerSeq: getRequiredEnv("VALID_UNTIL_LEDGER_SEQ_03"),
//     sequence: getOptionalEnv("SOURCE_SEQUENCE_NUMBER_03"),
//     wasmHash: getOptionalEnv("SWAP_CONTRACT_WASM_HASH"),
//   };
// };
