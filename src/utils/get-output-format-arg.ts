import { getArgs } from "./get-args.ts";

export const getOutputFormatArg = (): "xdr" | "raw" => {
  const cmdArgs = getArgs(1);
  let formatOutput: "xdr" | "raw";
  if (cmdArgs && cmdArgs.length && cmdArgs.length === 1) {
    switch (cmdArgs[0]) {
      case "xdr":
        formatOutput = "xdr";
        break;
      case "raw":
        formatOutput = "raw";
        break;
      default:
        throw new Error(
          `Invalid output format: ${cmdArgs[0]}. Supported formats are 'xdr' and 'raw'.`
        );
    }
  } else
    throw new Error(
      "Invalid command line arguments. Provide the output format: 'xdr' or 'raw'."
    );

  return formatOutput;
};
