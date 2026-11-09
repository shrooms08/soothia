// What the Worker will broadcast. A client sends a transaction it has already signed,
// so these read the actual bytes and allow exactly two shapes. Anything else is refused.

import { bcs } from "@mysten/sui/bcs";
import { Transaction } from "@mysten/sui/transactions";
import { fromBase64, normalizeSuiAddress } from "@mysten/sui/utils";

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
/** SplitCoins' amount, then the config, nonce and recipient of pay. */
const PAY_INPUTS = 4;
const PAY_ARGUMENTS = 4;

type Data = ReturnType<Transaction["getData"]>;
type Input = Data["inputs"][number];
type Argument = NonNullable<NonNullable<Data["commands"][number]["MoveCall"]>["arguments"]>[number];

export interface ExpectedPayment {
  packageId: string;
  configId: string;
  nonce: string;
  payTo: string;
  priceMist: string;
}

export type PaymentCheck = { ok: true; sender: string } | { ok: false; code: string };

class Refusal extends Error {}

const refuseIf = (condition: boolean, code: string): void => {
  if (condition) throw new Refusal(code);
};

const sameAddress = (a: string, b: string): boolean => normalizeSuiAddress(a) === normalizeSuiAddress(b);
const toHex = (bytes: ArrayLike<number>): string => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

function inputOf(data: Data, argument: Argument | undefined): Input {
  const input = argument?.$kind === "Input" ? data.inputs[argument.Input] : undefined;
  if (!input) throw new Refusal("not_a_plain_input");
  return input;
}

function pureBytes(data: Data, argument: Argument | undefined): Uint8Array {
  const bytes = inputOf(data, argument).Pure?.bytes;
  if (bytes === undefined) throw new Refusal("not_a_plain_value");
  return fromBase64(bytes);
}

/** The transaction's data, once it is plain bytes with the sender also paying the gas. */
function decode(transaction: unknown): { data: Data; sender: string } {
  // Base64 only: Transaction.from would also accept a JSON description.
  refuseIf(typeof transaction !== "string" || !BASE64.test(transaction), "invalid_transaction");
  let data: Data;
  try {
    data = Transaction.from(fromBase64(transaction as string)).getData();
  } catch {
    throw new Refusal("invalid_transaction");
  }
  if (!data.sender) throw new Refusal("no_sender");
  refuseIf(Boolean(data.gasData.owner) && !sameAddress(data.gasData.owner as string, data.sender), "sponsored_gas");
  return { data, sender: normalizeSuiAddress(data.sender) };
}

function checkShape(transaction: unknown, expected: ExpectedPayment): string {
  const { data, sender } = decode(transaction);
  refuseIf(data.commands.length !== 2, "wrong_commands");
  refuseIf(data.inputs.length !== PAY_INPUTS, "extra_inputs");

  const split = data.commands[0].SplitCoins;
  if (!split) throw new Refusal("wrong_commands");
  refuseIf(split.coin.$kind !== "GasCoin", "wrong_coin");
  refuseIf(split.amounts.length !== 1, "wrong_commands");
  const amount = pureBytes(data, split.amounts[0]);
  refuseIf(amount.length !== 8, "wrong_amount");
  refuseIf(bcs.u64().parse(amount) !== expected.priceMist, "wrong_amount");

  const call = data.commands[1].MoveCall;
  if (!call) throw new Refusal("wrong_commands");
  refuseIf(!sameAddress(call.package, expected.packageId), "wrong_package");
  refuseIf(call.module !== "pay" || call.function !== "pay", "wrong_function");
  refuseIf((call.typeArguments ?? []).length !== 0, "wrong_function");
  refuseIf(call.arguments.length !== PAY_ARGUMENTS, "wrong_arguments");
  const [config, nonce, recipient, coin] = call.arguments;

  const configId = inputOf(data, config).Object?.SharedObject?.objectId;
  refuseIf(!configId || !sameAddress(configId, expected.configId), "wrong_config");
  refuseIf(toHex(bcs.vector(bcs.u8()).parse(pureBytes(data, nonce))) !== expected.nonce, "wrong_nonce");
  const payTo = pureBytes(data, recipient);
  refuseIf(payTo.length !== 32 || !sameAddress(bcs.Address.parse(payTo), expected.payTo), "wrong_recipient");
  const fromSplit = (coin.$kind === "NestedResult" && coin.NestedResult[0] === 0 && coin.NestedResult[1] === 0) || (coin.$kind === "Result" && coin.Result === 0);
  refuseIf(!fromSplit, "wrong_coin");
  return sender;
}

function outcome(run: () => string): PaymentCheck {
  try {
    return { ok: true, sender: run() };
  } catch (error) {
    // A malformed value throws from the decoder, and that is a refusal too.
    return { ok: false, code: error instanceof Refusal ? error.message : "invalid_transaction" };
  }
}

/** Exactly SplitCoins(GasCoin, [price]) then pay(config, nonce, payTo, coin). Never throws. */
export const checkPayment = (transaction: unknown, expected: ExpectedPayment): PaymentCheck => outcome(() => checkShape(transaction, expected));

/** Exactly one transfer of the whole gas coin to one address: how an agent wallet is emptied. */
export const checkWithdrawal = (transaction: unknown): PaymentCheck =>
  outcome(() => {
    const { data, sender } = decode(transaction);
    refuseIf(data.commands.length !== 1 || data.inputs.length !== 1, "wrong_commands");
    const transfer = data.commands[0].TransferObjects;
    if (!transfer) throw new Refusal("wrong_commands");
    refuseIf(transfer.objects.length !== 1 || transfer.objects[0].$kind !== "GasCoin", "wrong_coin");
    refuseIf(pureBytes(data, transfer.address).length !== 32, "wrong_recipient");
    return sender;
  });
