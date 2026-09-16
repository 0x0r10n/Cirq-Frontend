import { describe, expect, it } from "vitest";
import { computePositionRisk, stressCollateralPriceDrop } from "./positionRisk.js";

const BASE_INPUT = {
  marketId: "usdg-wsteth",
  collateralAmount: 1_000_000_000_000_000_000n, // 1.0 wstETH
  collateralDecimals: 18,
  collateralPriceUsd: 4000,
  debtAmount: 2_000_000_000_000_000_000_000n, // 2000 USDG
  debtDecimals: 18,
  debtPriceUsd: 1,
  ltvCapBps: 6300,
  priceStale: false,
};

describe("computePositionRisk", () => {
  it("computes LTV from Chainlink-priced collateral/debt values, not pool TWAP", () => {
    const result = computePositionRisk(BASE_INPUT);
    // 2000 debt / 4000 collateral = 50.00% = 5000 bps
    expect(result.currentLtvBps).toBe(5000);
    expect(result.distanceToLiquidationBps).toBe(1300);
    expect(result.priceStale).toBe(false);
  });

  it("reports at-or-over-cap once distance is zero or negative", () => {
    const result = computePositionRisk({ ...BASE_INPUT, debtAmount: 3_000_000_000_000_000_000_000n });
    // 3000 / 4000 = 75% > 63% cap
    expect(result.distanceToLiquidationBps).toBeLessThan(0);
    expect(result.summary).toMatch(/At or over/);
  });

  it("surfaces a stale price rather than silently computing on it", () => {
    const result = computePositionRisk({ ...BASE_INPUT, priceStale: true });
    expect(result.priceStale).toBe(true);
    expect(result.summary).toMatch(/stale/i);
  });
});

describe("stressCollateralPriceDrop", () => {
  it("raises LTV proportionally to a simulated collateral price drop", () => {
    const stressed = stressCollateralPriceDrop(BASE_INPUT, 1000); // -10%
    // collateral value drops from 4000 to 3600; 2000/3600 = 55.56% -> 5556 bps
    expect(stressed.currentLtvBps).toBe(5556);
    expect(stressed.currentLtvBps).toBeGreaterThan(
      computePositionRisk(BASE_INPUT).currentLtvBps,
    );
  });
});
