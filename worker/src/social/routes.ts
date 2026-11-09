// The /social/* routes. Profiles and leaderboards are public and read only KV;
// everything that changes a profile is proven by a wallet signature.

import { isValidPersonalMessageSignature } from "@mysten/sui/verify";
import { json, type Env } from "../http";
import { tatumSuiClient } from "../recall/tatumGrpc";
import { identify, storeFor } from "../recall/routes";
import { SocialRefusal, type SignatureVerifier, type NameLookup, type SocialContext } from "./context";
import { byAddressRoute, challengeRoute, publishRoute, suinsRoute, unpublishRoute, updateRoute } from "./identity";
import { leaderboardRoute, profileRoute } from "./public";

export interface SocialDeps {
  verify?: SignatureVerifier;
  lookupName?: NameLookup;
  store?: SocialContext["store"];
  now?: () => number;
}

function chainVerifier(env: Env): SignatureVerifier {
  // False for a bad or malformed signature. It only throws when it couldn't check, and
  // the client is only used for zkLogin wallets, whose keys rotate by epoch.
  return (message, signature, address) => isValidPersonalMessageSignature(message, signature, { address, client: tatumSuiClient(env.TATUM_API_KEY.trim()) });
}

function chainNames(env: Env): NameLookup {
  return async (address) => (await tatumSuiClient(env.TATUM_API_KEY.trim()).core.defaultNameServiceName({ address })).data.name;
}

/** Answers a /social/* request. */
export async function socialRoute(request: Request, env: Env, path: string, deps: SocialDeps = {}): Promise<Response> {
  try {
    const context: SocialContext = {
      request,
      env,
      nowMs: deps.now?.() ?? Date.now(),
      verify: deps.verify ?? chainVerifier(env),
      lookupName: deps.lookupName ?? chainNames(env),
      store: deps.store ?? ((userKey) => storeFor(env, userKey)),
    };
    const route = `${request.method} ${path}`;
    switch (route) {
      case "POST /social/profile/challenge":
        return await challengeRoute(context);
      case "POST /social/profile/update":
        return await updateRoute(context);
      case "POST /social/profile/unpublish":
        return await unpublishRoute(context);
      case "GET /social/profile/by-address":
        return await byAddressRoute(context);
      case "GET /social/suins":
        return await suinsRoute(context);
      case "GET /social/leaderboard":
        return await leaderboardRoute(context);
      case "POST /social/profile/publish": {
        const user = await identify(request);
        if (typeof user !== "string") return user;
        return await publishRoute(context, user);
      }
      default: {
        const handle = /^GET \/social\/profile\/([^/]+)$/.exec(route)?.[1];
        return handle ? await profileRoute(context, handle) : json(request, { error: "not_found" }, 404);
      }
    }
  } catch (error) {
    if (error instanceof SocialRefusal) return json(request, { error: error.code, ...error.extra }, error.status);
    console.warn(`Soothia: ${request.method} ${path} failed: ${String((error as Error)?.message ?? error).slice(0, 300)}`);
    return json(request, { error: "social_unavailable" }, 502);
  }
}
