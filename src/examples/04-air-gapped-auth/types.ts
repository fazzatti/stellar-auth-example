// ===================================================
// PROXY TYPES
// ===================================================

import { AuthEntryParams } from "../../utils/auth-entries.ts";

export interface ProxyInput {
  contractId: string;
  function: string;
  functionArgs: {
    userPk: string;
    isSellAssetA: boolean;
    amount: string;
  };
  auth?: ProxyAuthInput[];
}

export type ProxyAuthInput = ProxyAuthInputRaw | ProxyAuthInputXdr;

export type ProxyAuthInputRaw = {
  signature: string;
  nonce: string;
  signatureExpirationLedger: number;
};

export type ProxyAuthInputXdr = {
  authEntryXdr: string;
};

export interface ProxyConfig {
  sourceSk: string;
}

// ===================================================
// AIRGAPPED TYPES
// ===================================================
export interface AirGappedConfig {
  secureUserSk: string;
  allowedContracts: string[];
}

export interface AirGappedSignInput {
  contractId: string;
  function: string;
  functionArgs: {
    userPk: string;
    isSellAssetA: boolean;
    amount: string;
  };
  auth?: AirGappedAuthInput;
}

export type AirGappedAuthInput = AirGappedAuthInputRaw | AirGappedAuthInputXdr;

export type AirGappedAuthInputRaw = {
  rawEntries: AuthEntryParams[];
};

export type AirGappedAuthInputXdr = {
  entriesXdr: string[];
  signatureExpirationLedger: number;
};
