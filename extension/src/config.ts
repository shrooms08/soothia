// The deployed soothia-proxy Worker. This is the only place the URL lives, so a
// domain change is one edit and the bundles carry no secrets.
export const WORKER_URL = "https://api.soothia.fun";

// The live soothia_stake package and its shared Config, on Sui mainnet. A transaction
// that names anything else is refused before the wallet sees it (tx-check.ts).
export const STAKE_PACKAGE = "0xf9507a1cb35b01c191614a67bf5ca3f22c7c3a7745fdc7ddea67369686a6720f";
export const STAKE_CONFIG = "0x7ba41f413b54f1f04b592694ad3304caa87df7cf9f1afda98b42c45362d2b3be";

// The soothia_recall package that commits a call's hash. Shown as a link only.
export const RECALL_PACKAGE = "0xc7bb1087170732a31d392f20974ba5f3dac8c4081b39f7a8677ff7d28ada84c4";

// soothia_pay on Sui mainnet. A payment that names anything else is refused (tx-check.ts).
export const PAY_PACKAGE = "0x69093f4bd2ec5d00c5780d8fd2e09adde6a4399146fed2bafc94071311d52a92";
export const PAY_CONFIG = "0x7b14fd24baed71d4062f88c22d06c61f4785fc040c3e692ae335b1cde7807f1e";
