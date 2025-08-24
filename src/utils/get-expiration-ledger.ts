import { getRpc } from "../config/env.ts";

const rpc = getRpc();
export const getExpirationLedger = async (
  minsFromNow: number
): Promise<number> => {
  const ledgersFromNow = (minsFromNow * 60) / 5; // Assuming 5 seconds per ledger

  let latestLedgerSequence: number;
  try {
    const latestLedger = await rpc.getLatestLedger();
    latestLedgerSequence = latestLedger.sequence;
  } catch (error) {
    console.error("Error checking latest ledger:", error);
    throw error;
  }

  return latestLedgerSequence + ledgersFromNow;
};
