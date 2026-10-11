// The deployed soothia-proxy Worker and site. These are the only places the
// URLs live, so a domain change is one edit and the bundles carry no secrets.
export const WORKER_URL = "https://api.soothia.fun";
/** The landing site; /m/<marketId> is a market's bet link (Solana Actions). */
export const SITE_URL = "https://soothia.fun";
export const betLink = (marketId: string): string => `${SITE_URL}/m/${marketId}`;
