import { ioConfig } from "../config/env.ts";

export const saveToJsonFile = async (obj: any, fileName: string) => {
  const filePath = `${ioConfig.outputDirectory}/${fileName}.json`;

  try {
    // Ensure the output directory exists
    await Deno.mkdir(ioConfig.outputDirectory, { recursive: true });

    await Deno.writeTextFile(filePath, JSON.stringify(obj, null, 2));

    console.log(`Saved to ${filePath}`);
  } catch (error) {
    console.error(`Error saving JSON to ${filePath}:`, error);
    throw error;
  }
};

export const readFromJsonFile = async (fileName: string) => {
  const filePath = `${ioConfig.outputDirectory}/${fileName}.json`;

  try {
    const data = await Deno.readTextFile(filePath);
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading JSON from ${filePath}:`, error);
    throw error;
  }
};

export const saveTransactionXdr = (tx: string) => {
  const txObject = {
    tx,
  };

  saveToJsonFile(txObject, ioConfig.transactionFileName);
};

export const readTransactionXdr = async () => {
  try {
    const data = await readFromJsonFile(ioConfig.transactionFileName);
    return data.tx as string;
  } catch (error) {
    console.error("Error reading transaction XDR:", error);
    throw error;
  }
};
