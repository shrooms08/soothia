// The last check before a wallet is asked to sign. The Worker builds the transaction,
// so this reads the actual bytes and allows exactly two shapes: a stake and a claim,
// each with the ids and amounts the user chose. Anything else is refused.

import { bcs } from "@mysten/sui/bcs";
import { Transaction } from "@mysten/sui/transactions";
import { fromBase64, normalizeSuiAddress } from "@mysten/sui/utils";
import { PAY_CONFIG, PAY_PACKAGE, STAKE_CONFIG, STAKE_PACKAGE } from "./config";

export type ExpectedTx =
  | { kind: "stake"; poolId: string; side: boolean; amountMist: string; pickHash?: string }
  | { kind: "claim"; poolId: string }
  | { kind: "pay"; nonce: string; recipient: string; priceMist: string }
  | { kind: "fund"; recipient: string; amountMist: string }
  | { kind: "withdraw"; recipient: string };

export type TxVerdict = { ok: true } | { ok: false; reason: string };

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
const CLOCK = normalizeSuiAddress("0x6");
const STAKE_ARGUMENTS = 6;
const HASH_BYTES = 32;
const PAY_ARGUMENTS = 4;
/** More gas than a payment or a transfer could need, so a bad build can't lock up the balance. */
const MAX_GAS_BUDGET = 20_000_000n;

type Data = ReturnType<Transaction["getData"]>;
type Input = Data["inputs"][number];
type Argument = NonNullable<NonNullable<Data["commands"][number]["MoveCall"]>["arguments"]>[number];

class Refusal extends Error {}

function refuseIf(condition: boolean, reason: string): void {
  if (condition) throw new Refusal(reason);
}

const sameAddress = (a: string, b: string): boolean => normalizeSuiAddress(a) === normalizeSuiAddress(b);

function inputOf(data: Data, argument: Argument | undefined, what: string): Input {
  const input = argument?.$kind === "Input" ? data.inputs[argument.Input] : undefined;
  if (!input) throw new Refusal(`${what} is not a plain input.`);
  return input;
}

function sharedObjectId(data: Data, argument: Argument | undefined, what: string): string {
  const id = inputOf(data, argument, what).Object?.SharedObject?.objectId;
  if (!id) throw new Refusal(`${what} is not a shared object.`);
  return id;
}

function pureBytes(data: Data, argument: Argument | undefined, what: string): Uint8Array {
  const bytes = inputOf(data, argument, what).Pure?.bytes;
  if (bytes === undefined) throw new Refusal(`${what} is not a plain value.`);
  return fromBase64(bytes);
}

function checkTarget(
  command: Data["commands"][number] | undefined,
  fn: string,
): NonNullable<Data["commands"][number]["MoveCall"]> {
  const call = command?.MoveCall;
  if (!call) throw new Refusal(`Expected a call to ${fn}.`);
  refuseIf(!sameAddress(call.package, STAKE_PACKAGE), "It calls a contract that is not Soothia's.");
  refuseIf(call.module !== "pool" || call.function !== fn, `It calls something other than ${fn}.`);
  refuseIf((call.typeArguments ?? []).length !== 0, "It has unexpected type arguments.");
  return call;
}

function checkStake(data: Data, expected: Extract<ExpectedTx, { kind: "stake" }>): void {
  refuseIf(data.commands.length !== 2, "It does more than split a coin and stake.");
  const split = data.commands[0].SplitCoins;
  if (!split) throw new Refusal("The first step is not a coin split.");
  refuseIf(split.coin.$kind !== "GasCoin", "The stake does not come from your SUI balance.");
  refuseIf(split.amounts.length !== 1, "It splits more than one coin.");
  const amountBytes = pureBytes(data, split.amounts[0], "The amount");
  refuseIf(amountBytes.length !== 8, "The amount is malformed.");
  refuseIf(bcs.u64().parse(amountBytes) !== expected.amountMist, "The amount differs from what you chose.");

  const call = checkTarget(data.commands[1], "stake");
  refuseIf(call.arguments.length !== STAKE_ARGUMENTS, "The stake call has the wrong arguments.");
  const [config, pool, side, coin, pickHash, clock] = call.arguments;
  refuseIf(!sameAddress(sharedObjectId(data, config, "The config"), STAKE_CONFIG), "It uses a different config.");
  refuseIf(!sameAddress(sharedObjectId(data, pool, "The pool"), expected.poolId), "It stakes in a different pool.");
  const sideBytes = pureBytes(data, side, "The side");
  refuseIf(sideBytes.length !== 1 || bcs.bool().parse(sideBytes) !== expected.side, "It backs the other side.");

  const fromSplit =
    (coin.$kind === "NestedResult" && coin.NestedResult[0] === 0 && coin.NestedResult[1] === 0) ||
    (coin.$kind === "Result" && coin.Result === 0);
  refuseIf(!fromSplit, "The stake does not use the split coin.");

  const hash = bcs.vector(bcs.u8()).parse(pureBytes(data, pickHash, "The call's hash"));
  refuseIf(hash.length !== HASH_BYTES, "The call's hash is malformed.");
  if (expected.pickHash !== undefined) {
    const hex = hash.map((byte) => byte.toString(16).padStart(2, "0")).join("");
    refuseIf(hex !== expected.pickHash.toLowerCase(), "It is tied to a different call.");
  }
  refuseIf(!sameAddress(sharedObjectId(data, clock, "The clock"), CLOCK), "It does not use the Sui clock.");
  refuseIf(data.inputs.length !== STAKE_ARGUMENTS, "It carries extra inputs.");
}

function checkGasBudget(data: Data): void {
  const { budget } = data.gasData;
  refuseIf(budget === null || budget === undefined || BigInt(budget) > MAX_GAS_BUDGET, "It allows too much gas.");
}

function checkAmount(data: Data, command: Data["commands"][number], expected: string): void {
  const split = command.SplitCoins;
  if (!split) throw new Refusal("The first step is not a coin split.");
  refuseIf(split.coin.$kind !== "GasCoin", "It does not come from your SUI balance.");
  refuseIf(split.amounts.length !== 1, "It splits more than one coin.");
  const bytes = pureBytes(data, split.amounts[0], "The amount");
  refuseIf(bytes.length !== 8, "The amount is malformed.");
  refuseIf(bcs.u64().parse(bytes) !== expected, "The amount differs from what you chose.");
}

function checkRecipient(data: Data, argument: Argument | undefined, expected: string): void {
  const bytes = pureBytes(data, argument, "The recipient");
  refuseIf(bytes.length !== 32 || !sameAddress(bcs.Address.parse(bytes), expected), "It pays someone else.");
}

const isSplitCoin = (argument: Argument): boolean =>
  (argument.$kind === "NestedResult" && argument.NestedResult[0] === 0 && argument.NestedResult[1] === 0) ||
  (argument.$kind === "Result" && argument.Result === 0);

function checkPay(data: Data, expected: Extract<ExpectedTx, { kind: "pay" }>): void {
  refuseIf(data.commands.length !== 2, "It does more than split a coin and pay.");
  refuseIf(data.inputs.length !== PAY_ARGUMENTS, "It carries extra inputs.");
  checkGasBudget(data);
  checkAmount(data, data.commands[0], expected.priceMist);
  const call = data.commands[1].MoveCall;
  if (!call) throw new Refusal("Expected a call to pay.");
  refuseIf(!sameAddress(call.package, PAY_PACKAGE), "It calls a contract that is not Soothia's.");
  refuseIf(call.module !== "pay" || call.function !== "pay", "It calls something other than pay.");
  refuseIf((call.typeArguments ?? []).length !== 0, "It has unexpected type arguments.");
  refuseIf(call.arguments.length !== PAY_ARGUMENTS, "The pay call has the wrong arguments.");
  const [config, nonce, recipient, coin] = call.arguments;
  refuseIf(!sameAddress(sharedObjectId(data, config, "The config"), PAY_CONFIG), "It uses a different config.");
  const nonceBytes = bcs.vector(bcs.u8()).parse(pureBytes(data, nonce, "The nonce"));
  refuseIf(
    nonceBytes.map((byte) => byte.toString(16).padStart(2, "0")).join("") !== expected.nonce,
    "It is tied to a different payment.",
  );
  checkRecipient(data, recipient, expected.recipient);
  refuseIf(!isSplitCoin(coin), "The payment does not use the split coin.");
}

function checkFund(data: Data, expected: Extract<ExpectedTx, { kind: "fund" }>): void {
  refuseIf(data.commands.length !== 2, "It does more than split a coin and send it.");
  refuseIf(data.inputs.length !== 2, "It carries extra inputs.");
  checkGasBudget(data);
  checkAmount(data, data.commands[0], expected.amountMist);
  const transfer = data.commands[1].TransferObjects;
  if (!transfer) throw new Refusal("Expected a transfer.");
  refuseIf(transfer.objects.length !== 1 || !isSplitCoin(transfer.objects[0]), "It does not send the split coin.");
  checkRecipient(data, transfer.address, expected.recipient);
}

function checkWithdraw(data: Data, expected: Extract<ExpectedTx, { kind: "withdraw" }>): void {
  refuseIf(data.commands.length !== 1 || data.inputs.length !== 1, "It does more than send the balance.");
  checkGasBudget(data);
  const transfer = data.commands[0].TransferObjects;
  if (!transfer) throw new Refusal("Expected a transfer.");
  refuseIf(
    transfer.objects.length !== 1 || transfer.objects[0].$kind !== "GasCoin",
    "It does not send the whole balance.",
  );
  checkRecipient(data, transfer.address, expected.recipient);
}

function checkClaim(data: Data, expected: Extract<ExpectedTx, { kind: "claim" }>): void {
  refuseIf(data.commands.length !== 1, "It does more than claim.");
  const call = checkTarget(data.commands[0], "claim");
  refuseIf(call.arguments.length !== 2, "The claim call has the wrong arguments.");
  refuseIf(
    !sameAddress(sharedObjectId(data, call.arguments[0], "The pool"), expected.poolId),
    "It claims from a different pool.",
  );
  refuseIf(!sameAddress(sharedObjectId(data, call.arguments[1], "The clock"), CLOCK), "It does not use the Sui clock.");
  refuseIf(data.inputs.length !== 2, "It carries extra inputs.");
}

/** Decides whether these exact bytes may be signed by `sender`. Never throws. */
export function checkTransaction(txBytes: unknown, expected: ExpectedTx, sender: string): TxVerdict {
  try {
    // Base64 only: Transaction.from would also accept JSON, which is not what the Worker sends.
    refuseIf(typeof txBytes !== "string" || !BASE64.test(txBytes), "It is not a built transaction.");
    const data = Transaction.from(fromBase64(txBytes as string)).getData();
    refuseIf(!data.sender || !sameAddress(data.sender, sender), "It would be sent from a different address.");
    refuseIf(
      Boolean(data.gasData.owner) && !sameAddress(data.gasData.owner as string, sender),
      "Someone else would pay its gas.",
    );
    if (expected.kind === "stake") checkStake(data, expected);
    else if (expected.kind === "claim") checkClaim(data, expected);
    else if (expected.kind === "pay") checkPay(data, expected);
    else if (expected.kind === "fund") checkFund(data, expected);
    else if (expected.kind === "withdraw") checkWithdraw(data, expected);
    else throw new Refusal("Unknown transaction type.");
    return { ok: true };
  } catch (error) {
    const reason = error instanceof Refusal ? error.message : "It could not be read.";
    return { ok: false, reason: `Transaction refused. ${reason}` };
  }
}
