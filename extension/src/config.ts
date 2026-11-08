// The deployed soothia-proxy Worker. This is the only place the URL lives, so a
// domain change is one edit and the bundles carry no secrets.
export const WORKER_URL = "https://api.soothia.fun";

// The live soothia_stake package and its shared Config, on Sui mainnet. A transaction
// that names anything else is refused before the wallet sees it (tx-check.ts).
export const STAKE_PACKAGE = "0xf9507a1cb35b01c191614a67bf5ca3f22c7c3a7745fdc7ddea67369686a6720f";
export const STAKE_CONFIG = "0x7ba41f413b54f1f04b592694ad3304caa87df7cf9f1afda98b42c45362d2b3be";
