export const getArgs = (nOfArgs: number): string[] => {
  const args = Deno.args;

  if (!args || args.length < nOfArgs) {
    throw new Error(`Expected at least ${nOfArgs} arguments`);
  }

  return args;
};
