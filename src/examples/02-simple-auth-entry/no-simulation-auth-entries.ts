import {
  Account,
  Address,
  Asset,
  authorizeEntry,
  nativeToScVal,
  Operation,
  SorobanDataBuilder,
  TimeoutInfinite,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { getSimpleAuthEntryConfig } from "../../config/env.ts";
import { saveTransactionXdr } from "../../utils/io.ts";

const {
  network,
  validUntilLedgerSeq,
  sourceKeys,
  senderKeys,
  receiverPk,
  sequenceNumber,
} = getSimpleAuthEntryConfig();

if (!sequenceNumber)
  throw new Error("Source account sequence number is not provided in the ENV.");

// ===================================================
// Encode the arguments for a 'transfer' invocation
// ===================================================
const xlm = Asset.native();

// In this example, we are using a sender account that is different from the source account
const fromAddress = nativeToScVal(senderKeys.publicKey(), {
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

// Generate a unique random nonce which will be used for the sender authorization entry
const randomNonce = new xdr.Int64(
  Math.floor(Math.random() * 100000000000000000)
);

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

// the temporary entry to store the nonce for the sender account
const nonce = xdr.LedgerKey.contractData(
  new xdr.LedgerKeyContractData({
    contract: fromAddress.address(), // The nonce is stored under the sender address
    key: xdr.ScVal.scvLedgerKeyNonce(
      new xdr.ScNonceKey({ nonce: randomNonce })
    ),
    durability: xdr.ContractDataDurability.temporary(),
  })
);

const readOnlyEntries: xdr.LedgerKey[] = [contractInstanceLedgerEntry];

const readWriteEntries: xdr.LedgerKey[] = [
  fromAccountLedgerEntry,
  toAccountLedgerEntry,
  nonce,
];

// These are the resources used by the transaction
// When using the RPC, these are automatically calculated
// during the simulation step. When adding the data manually,
// it is important to set a value that is sufficient for the transaction to succeed.
// If the values are too low, the transaction will fail with a resource limit error.
const cpuInstructions = 729050;
const readBytes = 288;
const writeBytes = 364;

// The resource fee is the fee charged for the resources used by the transaction
// This is also automatically calculated by the RPC during the simulation step.
// When adding the data manually, it is important to set a value that is sufficient for the transaction to succeed.
// If the value is too low, the transaction will fail with a resource limit error.
const resourceFee = 226081;
// The inclusion fee is the fee charged for including the transaction in a ledger
const inclusionFee = 1000;

const sorobanData = new SorobanDataBuilder()
  .appendFootprint(readOnlyEntries, readWriteEntries)
  .setResources(cpuInstructions, readBytes, writeBytes)
  .setResourceFee(resourceFee)
  .build();

// Prepare the authorization entry for the address of the sender account
// This is the entry that authorizes the invocation of the transfer function.
const addressAuthEntry = new xdr.SorobanAuthorizationEntry({
  credentials: xdr.SorobanCredentials.sorobanCredentialsAddress(
    new xdr.SorobanAddressCredentials({
      address: fromAddress.address(),
      nonce: randomNonce,
      signatureExpirationLedger: Number(validUntilLedgerSeq),
      signature: xdr.ScVal.scvVoid(), // Placeholder, will be filled later
    })
  ),
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

// Now that we have the authorization entry, we need to sign it with the sender's keys
const signedAddressAuthEntry = await authorizeEntry(
  addressAuthEntry,
  senderKeys,
  Number(validUntilLedgerSeq),
  network
);

const authEntries: xdr.SorobanAuthorizationEntry[] = [signedAddressAuthEntry];

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

tx.sign(sourceKeys);

console.log("Signed Transaction:\n\n", tx.toXDR(), "\n\n");

saveTransactionXdr(tx.toXDR());
