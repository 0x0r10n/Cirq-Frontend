/**
 * Position risk — see docs/cirq-backend/RISK-CURATION.md. Always priced off
 * Chainlink (the caller supplies `collateralPriceUsd`/`debtPriceUsd`,
 * sourced via `getChainlinkPrice` — never pool TWAP, and never computed
 * from anything else here).
 */

export interface PositionRiskInput {
  marketId: string;
  collateralAmount: bigint;
  collateralDecimals: number;
  collateralPriceUsd: number;
  debtAmount: bigint;
  debtDecimals: number;
  debtPriceUsd: number;
  /** Read on-chain per market — never assumed (~63% typical is not a default). */
  ltvCapBps: number;
  /** From `getChainlinkPrice`. A stale price is surfaced, never silently ignored. */
  priceStale: boolean;
}

export interface PositionRiskSummary {
  marketId: string;
  collateralValueUsd: number;
  debtValueUsd: number;
  currentLtvBps: number;
  ltvCapBps: number;
  /** Positive = room before the cap; zero or negative = at/over the cap. */
  distanceToLiquidationBps: number;
  priceStale: boolean;
  summary: string;
}

function toFloatAmount(amount: bigint, decimals: number): number {
  return Number(amount) / 10 ** decimals;
}

export function computePositionRisk(input: PositionRiskInput): PositionRiskSummary {
  const collateralValueUsd =
    toFloatAmount(input.collateralAmount, input.collateralDecimals) * input.collateralPriceUsd;
  const debtValueUsd = toFloatAmount(input.debtAmount, input.debtDecimals) * input.debtPriceUsd;

  const currentLtvBps =
    collateralValueUsd === 0 ? 0 : Math.round((debtValueUsd / collateralValueUsd) * 10_000);
  const distanceToLiquidationBps = input.ltvCapBps - currentLtvBps;

  const staleNote = input.priceStale
    ? " Price feed is stale — treat this figure as unreliable until it updates."
    : "";
  const summary =
    distanceToLiquidationBps <= 0
      ? `At or over the ${(input.ltvCapBps / 100).toFixed(2)}% LTV cap (currently ${(currentLtvBps / 100).toFixed(2)}%).${staleNote}`
      : `Currently ${(currentLtvBps / 100).toFixed(2)}% LTV, ${(distanceToLiquidationBps / 100).toFixed(2)} points below the ${(input.ltvCapBps / 100).toFixed(2)}% cap.${staleNote}`;

  return {
    marketId: input.marketId,
    collateralValueUsd,
    debtValueUsd,
    currentLtvBps,
    ltvCapBps: input.ltvCapBps,
    distanceToLiquidationBps,
    priceStale: input.priceStale,
    summary,
  };
}

/**
 * Fork-simulation-style stress test: what does this position's LTV look
 * like after an X% collateral price drop? Used to attach a concrete
 * "what happens if" figure to a risk summary, per
 * docs/cirq-backend/RISK-CURATION.md.
 */
export function stressCollateralPriceDrop(
  input: PositionRiskInput,
  dropBps: number,
): PositionRiskSummary {
  const stressedPrice = input.collateralPriceUsd * (1 - dropBps / 10_000);
  return computePositionRisk({ ...input, collateralPriceUsd: stressedPrice });
}
