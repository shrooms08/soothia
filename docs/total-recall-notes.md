# Total Recall notes

- Tatum Data API: no Sui support as of 2026-11-08. `GET /v4/data/balances` and `/v4/data/transaction/history` reject `chain=sui` and `sui-mainnet` with a list of allowed chains, and the docs list none for Sui, so `GET /stake/balance` reads through the gRPC gateway and there is no `/stake/history`.
