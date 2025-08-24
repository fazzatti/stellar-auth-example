import {
  Address,
  authorizeEntry,
  Keypair,
  scValToNative,
  xdr,
} from "stellar-sdk";
import { config } from "../../config/env.ts";

import { readFromJsonFile } from "../../utils/io.ts";
import { updateAuthInProxyInputFile } from "../../utils/update-proxy-input-object.ts";
import { paramsToAuthEntries } from "../../utils/auth-entries.ts";
import {
  AirGappedAuthInputRaw,
  AirGappedAuthInputXdr,
  AirGappedConfig,
  AirGappedSignInput,
  ProxyAuthInput,
  ProxyAuthInputRaw,
  ProxyAuthInputXdr,
} from "./types.ts";
import { getOutputFormatArg } from "../../utils/get-output-format-arg.ts";
import { highlightText } from "../../utils/highlight-text.ts";
import { equal, notEqual } from "node:assert";

const { io, network } = config;
const outputFormat = getOutputFormatArg();

// Load the configuration of the Airgapped environment.
// Here all it needs it the secret key of the secure user account
// used to authorize contract invocations and a list of allowed contracts.
const configArgs = await readFromJsonFile<AirGappedConfig>(
  io.airGappedConfigFileName
);
const { secureUserSk, allowedContracts } = configArgs;

// Load the arguments provided by the user.
// These are the arguments detailing what contract invocation
// this transaction will perform.
// The 'auth' parameters are based on the output provided by the
// proxy environment. It contains the auth entries that need
// to be signed before the transaction can be submitted.
const inputArgs = await readFromJsonFile<AirGappedSignInput>(
  io.airGappedInputFileName
);
const secureUserKeys = Keypair.fromSecret(secureUserSk);
const { contractId, function: fnName, functionArgs, auth } = inputArgs;
const contractInvocation = {
  contractAddress: contractId,
  functionName: fnName,
  functionArgs: Object.values(functionArgs),
};

console.log(
  highlightText(
    `

===============================================================
Running the Airgapped side of Example 04 - Air Gapped Auth Demo
===============================================================
`,
    "magenta"
  )
);

const runAirgapped = async () => {
  if (fnName !== "swap") {
    throw new Error(`Invalid function name: ${fnName}. Expected: swap`);
  }

  if (allowedContracts.includes(contractId) === false) {
    throw new Error(
      `Contract ID ${contractId} is not in the list of allowed contracts.`
    );
  }

  const isRawFormat = (auth as AirGappedAuthInputRaw).rawEntries ? true : false;

  const entriesToSign: xdr.SorobanAuthorizationEntry[] = isRawFormat
    ? paramsToAuthEntries((auth as AirGappedAuthInputRaw).rawEntries)
    : (auth as AirGappedAuthInputXdr).entriesXdr.map((entry) =>
        xdr.SorobanAuthorizationEntry.fromXDR(entry, "base64")
      );
  const expirationLedger = !isRawFormat
    ? (auth as AirGappedAuthInputXdr).signatureExpirationLedger
    : undefined;

  if (entriesToSign.length === 0) {
    throw new Error("No authorization entries provided for signing.");
  }

  const signedEntries = await signEntries(
    secureUserKeys,
    entriesToSign,
    contractInvocation,
    expirationLedger
  );

  await outputSignedEntries(signedEntries);
};

const signEntries = async (
  signer: Keypair,
  entries: xdr.SorobanAuthorizationEntry[],
  invocation: {
    contractAddress: string;
    functionName: string;
    functionArgs: any[];
  },
  expirationLedger?: number
) => {
  if (!entries || entries.length === 0) {
    throw new Error("No auth entries returned from simulation");
  }

  // Check each entry and sign the necessary ones
  //
  const signedEntries = [];

  console.log("Verifying Auth Entries from simulation:");
  for (const entry of entries) {
    // Here we know we're only dealing with account signers
    // but depending on the use case you might want to handle contract signers too
    const requiredSigner = Address.account(
      entry.credentials().address().address().accountId().value()
    ).toString();

    if (
      entry.credentials().switch().name === "sorobanCredentialsSourceAccount"
    ) {
      console.log("Source Account Entry found for account:", requiredSigner);

      continue; // Source account entry, no need to sign the entry individually
    }

    // look for our signer authorization entry and sign it
    if (requiredSigner === signer.publicKey()) {
      // check if the entry's root invocation matches
      // the invocation parameters inputed by the user.
      verifyRootInvocation(
        entry,
        invocation.contractAddress,
        invocation.functionName,
        invocation.functionArgs
      );

      console.log("Signing for required signer:", requiredSigner);

      const validUntilLedgerSeq =
        expirationLedger ||
        entry.credentials().address().signatureExpirationLedger();

      signedEntries.push(
        await authorizeEntry(entry, signer, validUntilLedgerSeq, network)
      );
      continue;
    }

    // If we reach here, it means we have an unexpected auth entry
    // for this given transaction
    throw new Error(
      "Unexpected auth entry for required signer: " + requiredSigner
    );
  }

  return signedEntries;
};

const outputSignedEntries = async (
  signedEntries: xdr.SorobanAuthorizationEntry[]
) => {
  let output: ProxyAuthInput[];

  if (outputFormat === "raw") {
    output = signedEntries.map(
      (entry) =>
        ({
          signature: entry.credentials().address().signature().toXDR("base64"),
          nonce: entry.credentials().address().nonce().toString(),
          signatureExpirationLedger: entry
            .credentials()
            .address()
            .signatureExpirationLedger(),
        } as ProxyAuthInputRaw)
    );
  } else {
    output = signedEntries.map(
      (entry) =>
        ({
          authEntryXdr: entry.toXDR("base64"),
        } as ProxyAuthInputXdr)
    );
  }

  console.log(
    ` ${highlightText(
      output.length.toString(),
      "yellow"
    )} auth entries were signed. `
  );
  console.log(
    `Updating the ${highlightText(
      io.proxyInputFileName + ".json",
      "yellow"
    )} file with the signed entries.`
  );
  console.log(
    `The signed auth entries details will be saved as ${highlightText(
      outputFormat === "raw"
        ? "raw signature parameters"
        : "encoded XDR entries",
      "yellow"
    )}.`
  );

  await updateAuthInProxyInputFile(io.proxyInputFileName, output);
};

const verifyRootInvocation = (
  entry: xdr.SorobanAuthorizationEntry,
  contractAddress: string,
  functionName: string,
  functionArgs: any[]
) => {
  const entryContractAddress = Address.fromScAddress(
    entry.rootInvocation().function().contractFn().contractAddress()
  ).toString();

  const entryFunctionName = entry
    .rootInvocation()
    .function()
    .contractFn()
    .functionName()
    .toString();

  if (entryContractAddress !== contractAddress)
    throw new Error(
      `Root invocation contract address mismatch. Expected ${contractAddress}, got ${entryContractAddress}`
    );

  if (entryFunctionName !== functionName)
    throw new Error(
      `Root invocation function name mismatch. Expected ${functionName}, got ${entryFunctionName}`
    );

  const nativeRootInvocationArgs: any[] = [];
  entry
    .rootInvocation()
    .function()
    .contractFn()
    .args()
    .forEach((arg) => {
      nativeRootInvocationArgs.push(String(scValToNative(arg)));
    });

  if (nativeRootInvocationArgs.length !== functionArgs.length) {
    throw new Error(
      `Root invocation args length mismatch. Expected ${functionArgs.length}, got ${nativeRootInvocationArgs.length}`
    );
  }

  for (const expectedArg of functionArgs) {
    if (!nativeRootInvocationArgs.includes(expectedArg.toString())) {
      throw new Error(
        `Root invocation arg mismatch. Expected function arg ${expectedArg} in entry's args ${nativeRootInvocationArgs}`
      );
    }
  }
};

await runAirgapped();

// const verifyEntriesXdr = (authEntriesXdr: string[]) => {
//   const authEntries = [];

//   for (const entryXdr of authEntriesXdr) {
//     const entry = xdr.SorobanAuthorizationEntry.fromXDR(entryXdr, "base64");
//     authEntries.push(entry);
//   }

//   return authEntries;
// };

// const entries = verifyEntriesXdr(authEntriesXdr);
