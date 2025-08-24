import { Address, nativeToScVal, scValToNative, xdr } from "stellar-sdk";

// deno-lint-ignore-file no-explicit-any
export interface AuthEntryParams {
  credentials: {
    address: string;
    nonce: string;
    signatureExpirationLedger: number;
    signature?: string;
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
  value: any;
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

const paramsToInvocation = (
  params: InvocationParams
): xdr.SorobanAuthorizedInvocation => {
  const args = params.function.args.map((arg) => {
    return nativeToScVal(arg.value, { type: arg.type });
  });

  return new xdr.SorobanAuthorizedInvocation({
    function:
      xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
        new xdr.InvokeContractArgs({
          contractAddress: Address.fromString(
            params.function.contractAddress
          ).toScAddress(),
          functionName: params.function.functionName,
          args: args,
        })
      ),
    subInvocations: params.subInvocations?.map(paramsToInvocation) || [],
  });
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
      signatureExpirationLedger: credentials
        .address()
        .signatureExpirationLedger(),
      signature: credentials.address().signature().toXDR("base64"),
    },
    rootInvocation: invocationToParams(rootInvocation),
  };

  return entryParams;
};

const parseScVal = (value: xdr.ScVal): FnArg => {
  const type = parseScValType(value.switch().name);
  return {
    value:
      type === "bool" ? scValToNative(value) : String(scValToNative(value)),
    type,
  };
};

const parseScValType = (rawType: string): string => {
  switch (rawType) {
    case "scvAddress":
      return "address";
    case "scvI128":
      return "i128";
    case "scvBool":
      return "bool";

    default:
      return rawType;
  }
};

export const paramsToAuthEntry = (
  param: AuthEntryParams
): xdr.SorobanAuthorizationEntry => {
  const credParams = param.credentials;

  return new xdr.SorobanAuthorizationEntry({
    rootInvocation: paramsToInvocation(param.rootInvocation),
    credentials: xdr.SorobanCredentials.sorobanCredentialsAddress(
      new xdr.SorobanAddressCredentials({
        address: Address.fromString(credParams.address).toScAddress(),
        nonce: new xdr.Int64(credParams.nonce),
        signatureExpirationLedger: credParams.signatureExpirationLedger,
        signature: !credParams.signature
          ? xdr.ScVal.scvVoid()
          : xdr.ScVal.fromXDR(credParams.signature!, "base64"),
      })
    ),
  });
};

export const paramsToAuthEntries = (
  authEntryParams: AuthEntryParams[]
): xdr.SorobanAuthorizationEntry[] => {
  return authEntryParams.map(paramsToAuthEntry);
};
