/**
 * The shape every protocol adapter (Uniswap, Morpho, Longbow, Loopr)
 * implements. Kept deliberately minimal — protocol-specific detail lives in
 * each adapter's own params, not here. See
 * docs/cirq-backend/INTEGRATIONS.md.
 */

export interface Quote {
  venue: string;
  tokenIn: `0x${string}`;
  tokenOut: `0x${string}`;
  amountIn: bigint;
  amountOut: bigint;
  /** Only set when the venue can report it directly; never estimated here. */
  priceImpactBps?: number;
}

export interface MarketSummary {
  venue: string;
  marketId: string;
  /** Read on-chain per market — never assumed. See docs/cirq-backend/LIVE-VALUES.md. */
  ltvCapBps: number;
  supplyApyBps?: number;
  borrowApyBps?: number;
}

/** An unsigned transaction ready for the user's wallet to sign. Never broadcast by this layer. */
export interface UnsignedPayload {
  to: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
  description: string;
}

export interface QuoteParams {
  tokenIn: `0x${string}`;
  tokenOut: `0x${string}`;
  amountIn: bigint;
}

export interface EntryParams {
  marketId: string;
  owner: `0x${string}`;
  tokenIn: `0x${string}`;
  amountIn: bigint;
}

export interface ExitParams {
  marketId: string;
  owner: `0x${string}`;
}

export interface IntegrationAdapter {
  readonly venue: string;
  getMarkets(): Promise<MarketSummary[]>;
  getQuote(params: QuoteParams): Promise<Quote>;
  buildEntryPayload(params: EntryParams): Promise<UnsignedPayload>;
  buildExitPayload(params: ExitParams): Promise<UnsignedPayload>;
}

/**
 * Thrown by an adapter method that cannot do real work yet because a live
 * value (an ABI, a market address) is still a `⚠️ FILL IN` placeholder in
 * `lib/cirq-config`. Distinct from a thrown validation error so callers
 * (the agent, the risk engine) can tell "this venue isn't configured yet"
 * from "this call failed."
 */
export class NotConfiguredError extends Error {
  constructor(venue: string, missing: string) {
    super(
      `${venue} adapter cannot run yet — ${missing} is still a ⚠️ FILL IN placeholder. See docs/cirq-backend/LIVE-VALUES.md.`,
    );
    this.name = "NotConfiguredError";
  }
}
