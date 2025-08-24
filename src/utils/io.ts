import { ioConfig } from "../config/env.ts";
import { highlightText } from "./highlight-text.ts";

export const saveToJsonFile = async <T>(obj: T, fileName: string) => {
  const filePath = `${ioConfig.outputDirectory}/${fileName}.json`;

  try {
    // Ensure the output directory exists
    await Deno.mkdir(ioConfig.outputDirectory, { recursive: true });

    await Deno.writeTextFile(filePath, JSON.stringify(obj, null, 2));

    console.log(`Saved to ${highlightText(filePath, "green")}`);
  } catch (error) {
    console.error(
      highlightText(`Error saving JSON to ${filePath}:`, "red"),
      error
    );
    throw error;
  }
};

export const readFromJsonFile = async <T>(fileName: string): Promise<T> => {
  const filePath = `${ioConfig.outputDirectory}/${fileName}.json`;

  try {
    const data = await Deno.readTextFile(filePath);
    return JSON.parse(data) as T;
  } catch (error) {
    console.error(
      highlightText(`Error reading JSON from ${filePath}:`, "red"),
      error
    );
    throw error;
  }
};
