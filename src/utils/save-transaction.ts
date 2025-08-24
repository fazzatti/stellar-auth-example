import { config } from "../config/env.ts";
import { readFromJsonFile, saveToJsonFile } from "./io.ts";

const { io } = config;
export interface TransactionXdrInput {
  tx: string;
}

export const saveTransactionXdr = (tx: string) => {
  const txObject = {
    tx,
  } as TransactionXdrInput;

  saveToJsonFile<TransactionXdrInput>(txObject, io.transactionFileName);
};

export const readTransactionXdr = async () => {
  try {
    const data = await readFromJsonFile<TransactionXdrInput>(
      io.transactionFileName
    );
    return data.tx as string;
  } catch (error) {
    console.error("Error reading transaction XDR:", error);
    throw error;
  }
};
