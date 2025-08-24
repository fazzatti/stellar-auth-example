import { Keypair } from "stellar-sdk";
import { config, getRpc } from "../config/env.ts";
import { getArgs } from "./get-args.ts";
import { readFromJsonFile, saveToJsonFile } from "./io.ts";

const rpc = getRpc();

const { io } = config;

interface BaseFileObj {
  sourceSk: string;
  sourceSequence: string;
}

enum Demo {
  SourceAccount = "source-account",
  SimpleAuthEntry = "simple-auth-entry",
  SimpleSwapAuth = "simple-swap-auth",
}

const getDemoFile = () => {
  const sourceArg = getArgs(1)[0];
  if (!sourceArg) {
    throw new Error("No source account argument provided.");
  }

  switch (sourceArg) {
    case Demo.SourceAccount:
      return io.sourceAccountAuthInputFileName;
    case Demo.SimpleAuthEntry:
      return io.simpleAuthEntryInputFileName;
    case Demo.SimpleSwapAuth:
      return io.swapDemoInputFileName;
    default:
      throw new Error(`Unknown demo argument: ${sourceArg}`);
  }
};

const getSequence = async (pk: string) => {
  try {
    const sourceAccount = await rpc.getAccount(pk);
    return sourceAccount.sequenceNumber();
  } catch (error) {
    console.error("Error checking source account:", error);
    throw error;
  }
};

const getFileObjAndUpdateSequence = async <T extends BaseFileObj>(
  fileName: string
): Promise<T> => {
  const fileObj = await readFromJsonFile<T>(fileName);

  const sourceKeys = Keypair.fromSecret(fileObj.sourceSk);
  const currentSequence = await getSequence(sourceKeys.publicKey());

  const updatedObj = {
    ...fileObj,
    sourceSequence: currentSequence,
  } as T;

  await saveToJsonFile(updatedObj, fileName);

  return updatedObj;
};

const fileName = getDemoFile();
console.log("=============================================");
console.log(`Updating source account sequence number for ${fileName}.json`);
console.log("=============================================");

await getFileObjAndUpdateSequence(fileName);
