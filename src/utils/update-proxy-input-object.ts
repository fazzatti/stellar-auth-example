import { ProxyAuthInput } from "../examples/04-air-gapped-auth/types.ts";
import { readFromJsonFile, saveToJsonFile } from "./io.ts";

interface BaseFileObj {
  auth: ProxyAuthInput[];
}

export const updateAuthInProxyInputFile = async <T extends BaseFileObj>(
  fileName: string,
  auth: ProxyAuthInput[]
): Promise<T> => {
  const fileObj = await readFromJsonFile<T>(fileName);

  const updatedObj = {
    ...fileObj,
    auth,
  } as T;

  await saveToJsonFile(updatedObj, fileName);

  return updatedObj;
};
