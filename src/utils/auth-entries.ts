import { Address, scValToNative, xdr } from "stellar-sdk";

// deno-lint-ignore-file no-explicit-any
export interface AuthEntryParams {
  credentials: {
    address: string;
    nonce: string;
  };
  rootInvocation: InvocationParams;
}

export interface InvocationParams {
  function: {
    contractAddress: string;
    functionName: string;
    args: FnArg[];
  };
  subInvocations?: InvocationParams[];
}

export interface FnArg {
  value: string;
  type: string;
}

const invocationToParams = (
  invocation: xdr.SorobanAuthorizedInvocation
): InvocationParams => {
  return {
    function: {
      contractAddress: Address.fromScAddress(
        invocation.function().contractFn().contractAddress()
      ).toString(),
      functionName: invocation
        .function()
        .contractFn()
        .functionName()
        .toString(),
      args: invocation.function().contractFn().args().map(parseScVal),
    },
    subInvocations: [
      ...invocation
        .subInvocations()
        .map((subInvocation) => invocationToParams(subInvocation)),
    ],
  };
};

export const authEntryToParams = (
  entry: xdr.SorobanAuthorizationEntry
): AuthEntryParams => {
  const credentials = entry.credentials();
  const rootInvocation = entry.rootInvocation();

  const entryParams: AuthEntryParams = {
    credentials: {
      address: Address.fromScAddress(
        credentials.address().address()
      ).toString(),
      nonce: credentials.address().nonce().toString(),
    },
    rootInvocation: invocationToParams(rootInvocation),
  };

  return entryParams;
};

const parseScVal = (value: xdr.ScVal): FnArg => {
  return {
    value: String(scValToNative(value)),
    type: value.switch().name,
  };
};
