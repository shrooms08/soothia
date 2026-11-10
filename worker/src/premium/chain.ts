// Everything premium asks of Sui, through Tatum's gRPC gateway. The Worker holds no key
// here: it builds unsigned transactions and broadcasts ones the owner has already signed.

import { bcs } from "@mysten/sui/bcs";
import { Transaction } from "@mysten/sui/transactions";
import { fromBase64, normalizeSuiAddress, toBase64 } from "@mysten/sui/utils";
import type { RecallEnv } from "../recall/env";
import { bytesToHex, hexToBytes, tatumConfigured } from "../recall/sui";
import { tatumSuiClient } from "../recall/tatumGrpc";

/** The sender pays this much at most, and only what the transaction really uses. */
const GAS_BUDGET = 10_000_000;
/** A Sui transaction can name at most 256 gas coins. */
const MAX_GAS_COINS = 255;
const COIN_PAGE = 100;
/** Less than this can't pay the gas to move it. */
const MIN_WITHDRAW_MIST = 2_000_000n;

const PaidBcs = bcs.struct("Paid", {
  nonce: bcs.vector(bcs.u8()),
  payer: bcs.Address,
  recipient: bcs.Address,
  amount: bcs.u64(),
  fee: bcs.u64(),
});

export interface PaySettings {
  packageId: string;
  configId: string;
}

export interface PaidEvent {
  nonce: string;
  payer: string;
  recipient: string;
  amount: bigint;
  fee: bigint;
}

export interface Executed {
  digest: string;
  succeeded: boolean;
  paid: PaidEvent[];
}

export interface PayChain {
  balanceOf(owner: string): Promise<bigint>;
  buildPayment(sender: string, nonce: string, payTo: string, amount: bigint): Promise<string>;
  /** The sender moves an amount to one address, for funding an agent wallet. */
  buildFunding(sender: string, recipient: string, amount: bigint): Promise<string>;
  /** The sender's whole SUI balance goes to one address, less gas. */
  buildWithdrawAll(sender: string, recipient: string): Promise<string>;
  /** Broadcasts a signed transaction. Throws when the network will not take it. */
  execute(transaction: string, signature: string): Promise<Executed>;
}

export function paySettings(env: RecallEnv): PaySettings | null {
  const packageId = env.PAY_PACKAGE?.trim();
  const configId = env.PAY_CONFIG?.trim();
  return packageId && configId && tatumConfigured(env) ? { packageId, configId } : null;
}

export function tatumPayChain(env: RecallEnv, settings: PaySettings): PayChain {
  const client = tatumSuiClient(env.TATUM_API_KEY.trim());
  const paidType = `${settings.packageId}::pay::Paid`;

  const build = async (tx: Transaction, sender: string, budget = GAS_BUDGET): Promise<string> => {
    tx.setSender(sender);
    tx.setGasBudget(budget);
    return toBase64(await tx.build({ client }));
  };

  async function allCoins(owner: string) {
    const coins = [];
    let cursor: string | null = null;
    do {
      const page: Awaited<ReturnType<typeof client.core.listCoins>> = await client.core.listCoins({
        owner,
        limit: COIN_PAGE,
        cursor,
      });
      coins.push(...page.objects);
      cursor = page.hasNextPage ? page.cursor : null;
    } while (cursor && coins.length < MAX_GAS_COINS);
    return coins.slice(0, MAX_GAS_COINS);
  }

  return {
    async balanceOf(owner) {
      const { balance } = await client.core.getBalance({ owner });
      return BigInt(balance.balance);
    },

    buildPayment(sender, nonce, payTo, amount) {
      const tx = new Transaction();
      const [coin] = tx.splitCoins(tx.gas, [amount]);
      tx.moveCall({
        target: `${settings.packageId}::pay::pay`,
        arguments: [
          tx.object(settings.configId),
          tx.pure.vector("u8", Array.from(hexToBytes(nonce))),
          tx.pure.address(payTo),
          coin,
        ],
      });
      return build(tx, sender);
    },

    buildFunding(sender, recipient, amount) {
      const tx = new Transaction();
      const [coin] = tx.splitCoins(tx.gas, [amount]);
      tx.transferObjects([coin], recipient);
      return build(tx, sender);
    },

    async buildWithdrawAll(sender, recipient) {
      const coins = await allCoins(sender);
      const total = coins.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
      if (total < MIN_WITHDRAW_MIST) throw new Error("no_coins");
      const tx = new Transaction();
      tx.transferObjects([tx.gas], recipient);
      // Named outright, so every coin goes and none is left behind.
      tx.setGasPayment(coins.map(({ objectId, version, digest }) => ({ objectId, version, digest })));
      // A budget above what the wallet holds is rejected, and unused gas comes back anyway.
      return build(tx, sender, total < BigInt(GAS_BUDGET) ? Number(total) : GAS_BUDGET);
    },

    async execute(transaction, signature) {
      const result = await client.core.executeTransaction({
        transaction: fromBase64(transaction),
        signatures: [signature],
        include: { events: true },
      });
      const tx = result.Transaction ?? result.FailedTransaction;
      const paid = tx.events
        // The full type, because anyone can publish a module with the same names.
        .filter((event) => event.eventType === paidType)
        .map((event) => {
          const parsed = PaidBcs.parse(event.bcs);
          return {
            nonce: bytesToHex(Uint8Array.from(parsed.nonce)),
            payer: normalizeSuiAddress(parsed.payer),
            recipient: normalizeSuiAddress(parsed.recipient),
            amount: BigInt(parsed.amount),
            fee: BigInt(parsed.fee),
          };
        });
      return { digest: tx.digest, succeeded: result.$kind === "Transaction", paid };
    },
  };
}
