/**
 * Curation / legitimacy scoring — "the Noxa lesson" — see
 * docs/cirq-backend/RISK-CURATION.md. Answers "should this be surfaced at
 * all", never "is the agent allowed to touch it" — that hard gate is
 * `CirqRegistry`, checked here as one required input, not derived.
 */

export interface CurationInput {
  marketId: string;
  /** Hard gate — see docs/cirq-backend/CONTRACTS.md's CirqRegistry. */
  isRegistryAllowed: boolean;
  marketAgeDays: number;
  /** 0 (wildly volatile/unstable) to 1 (stable) — caller-supplied signal from adapter volume history. */
  volumeStabilityScore: number;
  /** Whether the yield is explainable by a real mechanism visible in adapter data (a spread, a fee tier, a documented incentive). */
  yieldExplained: boolean;
  /** Share of pool liquidity held by the top few addresses, in bps. */
  topHolderConcentrationBps: number;
  apyBps: number;
}

export interface CurationResult {
  marketId: string;
  /** Hard gate result — never surfaced/ranked at all if false. */
  eligible: boolean;
  /** 0-100; only meaningful when eligible. */
  score: number;
  reasons: string[];
}

const NEW_MARKET_THRESHOLD_DAYS = 30;
const HIGH_CONCENTRATION_THRESHOLD_BPS = 5_000;
const ANOMALOUSLY_HIGH_APY_THRESHOLD_BPS = 5_000;
const STABILITY_THRESHOLD = 0.8;

export function scoreOpportunity(input: CurationInput): CurationResult {
  if (!input.isRegistryAllowed) {
    return {
      marketId: input.marketId,
      eligible: false,
      score: 0,
      reasons: ["not on CirqRegistry's allowlist"],
    };
  }

  const reasons: string[] = [];
  let score = 100;

  if (input.marketAgeDays < NEW_MARKET_THRESHOLD_DAYS) {
    score -= 30;
    reasons.push(`market is only ${input.marketAgeDays} day(s) old`);
  }

  if (input.volumeStabilityScore < STABILITY_THRESHOLD) {
    const shortfall = STABILITY_THRESHOLD - input.volumeStabilityScore;
    score -= Math.round((shortfall / STABILITY_THRESHOLD) * 20);
    reasons.push("volume history is not stable");
  }

  if (!input.yieldExplained) {
    score -= 25;
    reasons.push("yield mechanism is not explainable from adapter data");
  }

  if (input.topHolderConcentrationBps > HIGH_CONCENTRATION_THRESHOLD_BPS) {
    score -= 20;
    reasons.push("liquidity is concentrated in a small number of addresses");
  }

  // The Noxa lesson: an anomalously high, newly-listed APY gets scored
  // down here, never ranked to the top just because the number is big.
  if (
    input.apyBps > ANOMALOUSLY_HIGH_APY_THRESHOLD_BPS &&
    input.marketAgeDays < NEW_MARKET_THRESHOLD_DAYS
  ) {
    score -= 25;
    reasons.push("anomalously high APY on a newly-listed market");
  }

  return {
    marketId: input.marketId,
    eligible: true,
    score: Math.max(0, Math.min(100, score)),
    reasons,
  };
}
