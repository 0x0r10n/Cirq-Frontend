import { describe, expect, it } from "vitest";
import { scoreOpportunity } from "./curation.js";

const HEALTHY: Parameters<typeof scoreOpportunity>[0] = {
  marketId: "usdg-wsteth",
  isRegistryAllowed: true,
  marketAgeDays: 400,
  volumeStabilityScore: 0.95,
  yieldExplained: true,
  topHolderConcentrationBps: 1000,
  apyBps: 500,
};

describe("scoreOpportunity", () => {
  it("hard-gates on the registry allowlist regardless of how good everything else looks", () => {
    const result = scoreOpportunity({ ...HEALTHY, isRegistryAllowed: false });
    expect(result.eligible).toBe(false);
    expect(result.score).toBe(0);
  });

  it("scores a healthy, established, explainable market highly", () => {
    const result = scoreOpportunity(HEALTHY);
    expect(result.eligible).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.reasons).toHaveLength(0);
  });

  it("the Noxa lesson: scores down an anomalously high APY on a brand-new market instead of ranking it top", () => {
    const suspicious = scoreOpportunity({
      ...HEALTHY,
      marketAgeDays: 2,
      apyBps: 8000,
    });
    const healthy = scoreOpportunity(HEALTHY);
    expect(suspicious.eligible).toBe(true);
    expect(suspicious.score).toBeLessThan(healthy.score);
    expect(suspicious.reasons).toContain("anomalously high APY on a newly-listed market");
  });

  it("penalizes unexplained yield and concentrated liquidity", () => {
    const result = scoreOpportunity({
      ...HEALTHY,
      yieldExplained: false,
      topHolderConcentrationBps: 8000,
    });
    expect(result.reasons).toContain("yield mechanism is not explainable from adapter data");
    expect(result.reasons).toContain("liquidity is concentrated in a small number of addresses");
  });

  it("never returns a score outside 0-100", () => {
    const result = scoreOpportunity({
      ...HEALTHY,
      marketAgeDays: 1,
      volumeStabilityScore: 0,
      yieldExplained: false,
      topHolderConcentrationBps: 9999,
      apyBps: 20000,
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
