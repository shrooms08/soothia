// POST /wallet/balances: SOL and USDC held by a wallet, as plain numbers.
import { isAddress } from "./base58";
import { json, readJsonObject, type Env } from "./http";
import { USDC_MINT } from "./pantaRules";
import { rpc, RpcError } from "./rpc";

const LAMPORTS_PER_SOL = 1_000_000_000;

interface TokenAccounts {
  value: { account: { data: { parsed: { info: { tokenAmount: { uiAmount: number | null } } } } } }[];
}

export async function handleBalances(request: Request, env: Env): Promise<Response> {
  const body = await readJsonObject(request);
  if (!body || !isAddress(body.wallet)) return json(request, { error: "bad_wallet" }, 400);

  try {
    const [balance, tokens] = await Promise.all([
      rpc<{ value: number }>(env, "getBalance", [body.wallet, { commitment: "confirmed" }]),
      rpc<TokenAccounts>(env, "getTokenAccountsByOwner", [
        body.wallet,
        { mint: USDC_MINT },
        { encoding: "jsonParsed", commitment: "confirmed" },
      ]),
    ]);
    // A wallet can hold USDC in more than one token account.
    const usdc = tokens.value.reduce(
      (sum, entry) => sum + (entry.account.data.parsed.info.tokenAmount.uiAmount ?? 0),
      0,
    );
    return json(request, { sol: balance.value / LAMPORTS_PER_SOL, usdc });
  } catch (error) {
    const misconfigured = error instanceof RpcError && error.message === "rpc_not_configured";
    return json(
      request,
      { error: misconfigured ? "proxy_misconfigured" : "rpc_unavailable" },
      misconfigured ? 500 : 502,
    );
  }
}
