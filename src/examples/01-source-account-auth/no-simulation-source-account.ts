import {
  Account,
  Address,
  Asset,
  nativeToScVal,
  Operation,
  SorobanDataBuilder,
  TimeoutInfinite,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { getSourceAccountConfig } from "../../config/env.ts";
import { saveTransactionXdr } from "../../utils/io.ts";

const { receiverPk, sourceKeys, sequenceNumber, validUntilLedgerSeq, network } =
  getSourceAccountConfig();

if (!sequenceNumber)
  throw new Error("Source account sequence number is not provided in the ENV.");

if (!validUntilLedgerSeq)
  throw new Error("Receiver public key is not provided in the ENV.");

// ===================================================
// Encode the arguments for a 'transfer' invocation
// ===================================================
const xlm = Asset.native();

const fromAddress = nativeToScVal(sourceKeys.publicKey(), {
  type: "address",
});
const toAddress = nativeToScVal(receiverPk, {
  type: "address",
});
const amount = nativeToScVal(BigInt(10_0000000), {
  type: "i128",
});
const args: xdr.ScVal[] = [fromAddress, toAddress, amount];

// ===================================================
// Manually assemble the additional data for the transaction
// ===================================================

// The account object for the source account to be used in this transaction
// Since an RPC is not used, we need to create the account object manually
// and provide the sequence number directly.
const sourceAccount: Account = new Account(
  sourceKeys.publicKey(),
  sequenceNumber
);

// Prepare the footprint of the transaction
// This defines which accounts and contract instances are read and written to
// during the transaction execution.

const contractAddress = new Address(xlm.contractId(network));

const contractInstanceLedgerEntry = xdr.LedgerKey.contractData(
  new xdr.LedgerKeyContractData({
    contract: contractAddress.toScAddress(),
    key: xdr.ScVal.scvLedgerKeyContractInstance(),
    durability: xdr.ContractDataDurability.persistent(),
  })
);

const fromAccountLedgerEntry = xdr.LedgerKey.account(
  new xdr.LedgerKeyAccount({
    accountId: fromAddress.address().accountId(),
  })
);

const toAccountLedgerEntry = xdr.LedgerKey.account(
  new xdr.LedgerKeyAccount({
    accountId: toAddress.address().accountId(),
  })
);

const readOnlyEntries: xdr.LedgerKey[] = [contractInstanceLedgerEntry];

const readWriteEntries: xdr.LedgerKey[] = [
  fromAccountLedgerEntry,
  toAccountLedgerEntry,
];

// These are the resources used by the transaction
// When using the RPC, these are automatically calculated
// during the simulation step. When adding the data manually,
// it is important to set a value that is sufficient for the transaction to succeed.
// If the values are too low, the transaction will fail with a resource limit error.
const cpuInstructions = 234048;
const readBytes = 288;
const writeBytes = 288;

// The resource fee is the fee charged for the resources used by the transaction
// This is also automatically calculated by the RPC during the simulation step.
// When adding the data manually, it is important to set a value that is sufficient for the transaction to succeed.
// If the value is too low, the transaction will fail with a resource limit error.
const resourceFee = 91622;
// The inclusion fee is the fee charged for including the transaction in a ledger
const inclusionFee = 1000;

const sorobanData = new SorobanDataBuilder()
  .appendFootprint(readOnlyEntries, readWriteEntries)
  .setResources(cpuInstructions, readBytes, writeBytes)
  .setResourceFee(resourceFee)
  .build();

// Prepare the authorization entry for the source account
// This is the entry that authorizes the invocation based on the source account.
// When used, the transaction-level signature will be sufficient to authorize
// this auth entry.
const sourceAccountAuthEntry = new xdr.SorobanAuthorizationEntry({
  credentials: xdr.SorobanCredentials.sorobanCredentialsSourceAccount(),
  rootInvocation: new xdr.SorobanAuthorizedInvocation({
    function:
      xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
        new xdr.InvokeContractArgs({
          contractAddress: contractAddress.toScAddress(),
          functionName: "transfer",
          args: args,
        })
      ),
    subInvocations: [],
  }),
});

const authEntries: xdr.SorobanAuthorizationEntry[] = [sourceAccountAuthEntry];

// ===================================================
// Assemble the transaction object
// ===================================================
const tx = new TransactionBuilder(sourceAccount, {
  fee: (inclusionFee + resourceFee).toString(),
  networkPassphrase: network,
  sorobanData,
})
  .addOperation(
    Operation.invokeContractFunction({
      contract: xlm.contractId(network),
      function: "transfer",
      args,
      auth: authEntries,
    })
  )
  .setTimeout(TimeoutInfinite)
  .build();

// Sign the transaction with the source account keypair
tx.sign(sourceKeys);

console.log("Signed Transaction:\n\n", tx.toXDR(), "\n\n");

saveTransactionXdr(tx.toXDR());
