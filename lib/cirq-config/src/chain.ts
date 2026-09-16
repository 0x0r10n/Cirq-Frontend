/**
 * Verified Sep 2026 — the one set of "chain facts" treated as safe to
 * hardcode. Everything else Cirq needs about the chain (RPC URLs,
 * contract addresses, feed IDs) is a live value from `load.ts`, never a
 * constant here. See docs/cirq-backend/LIVE-VALUES.md.
 */
export const ROBINHOOD_CHAIN_ID = 4663;
export const ROBINHOOD_CHAIN_GAS_TOKEN = "ETH";
export const ROBINHOOD_CHAIN_SETTLES_TO = "ethereum";
