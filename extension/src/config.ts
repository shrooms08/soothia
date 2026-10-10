// The deployed soothia-proxy Worker. This is the only place the URL lives.
export const WORKER_URL = "https://soothia-proxy.heylana.workers.dev";
/** The landing site; /m/<marketId> is a market's bet link (Solana Actions). */
export const SITE_URL = "https://soothia.heylana.workers.dev";
export const betLink = (marketId: string): string => `${SITE_URL}/m/${marketId}`;
