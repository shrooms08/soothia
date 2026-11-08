// Total Recall: the settings this feature reads. Kept apart from the Worker's
// shared Env so the recall code can run from local scripts without KV.
// Values come from worker/.dev.vars locally. Never log MEMWAL_KEY,
// SUI_COMMIT_KEY or TATUM_API_KEY.

export interface RecallEnv {
  /** Walrus Memory account object id on Sui (0x...). */
  MEMWAL_ACCOUNT_ID: string;
  /** Walrus Memory delegate private key. */
  MEMWAL_KEY: string;
  /** Overrides the mainnet relayer. */
  MEMWAL_SERVER_URL?: string;
  /** Empty means no Sui anchor or commit. */
  TATUM_API_KEY: string;
  /** Pays for hash commits; falls back to MEMWAL_KEY. */
  SUI_COMMIT_KEY?: string;
  /** Published soothia_recall package id. */
  SOOTHIA_RECALL_PACKAGE?: string;
}
