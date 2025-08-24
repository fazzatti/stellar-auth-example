import { config } from "../config/env.ts";
import { readFromJsonFile, saveToJsonFile } from "./io.ts";

interface BaseFileObj {
  auth: any;
}

const { io } = config;

export const clearAuthInInputFile = async <T extends BaseFileObj>(
  fileName: string
): Promise<T> => {
  const fileObj = await readFromJsonFile<T>(fileName);

  const updatedObj = {
    ...fileObj,
    auth: undefined,
  } as T;

  await saveToJsonFile(updatedObj, fileName);

  return updatedObj;
};

await clearAuthInInputFile(io.proxyInputFileName);
await clearAuthInInputFile(io.airGappedInputFileName);
