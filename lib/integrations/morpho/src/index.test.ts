import { describe, expect, it } from "vitest";
import type { ResolvedCirqAddressesConfig } from "@workspace/cirq-config";
import { MorphoAdapter } from "./index.js";

const CONFIG: ResolvedCirqAddressesConfig = {
  rpc: {
    url: "https://example.com/rpc",
    bundlerUrl: "https://example.com/bundler",
    paymasterUrl: "https://example.com/paymaster",
  },
  cirq: {
    registry: "0x9999999999999999999999999999999999999999",
    policy: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  },
  tokens: {
    USDG: { address: "0x1111111111111111111111111111111111111111", decimals: 18 },
    stocks: [],
  },
  chainlink: { feeds: [] },
  protocols: {
    morpho: {
      core: "0x4444444444444444444444444444444444444444",
      abiPath: "/nonexistent/morpho-abi.json",
      markets: [
        { id: "usdg-wsteth", ltvCapBps: 6300 },
        { id: "usdg-cbeth", ltvCapBps: 6200 },
      ],
    },
    longbow: { mcpUrl: "https://example.com/mcp", markets: [] },
    loopr: { router: "0x6666666666666666666666666666666666666666", abiPath: "/nonexistent/loopr-abi.json" },
    uniswap: {
      poolManager: "0x7777777777777777777777777777777777777777",
      universalRouter: "0x8888888888888888888888888888888888888888",
      poolManagerAbiPath: "/nonexistent/uniswap-pm-abi.json",
      universalRouterAbiPath: "/nonexistent/uniswap-ur-abi.json",
    },
  },
};

describe("MorphoAdapter", () => {
  it("getMarkets returns curated markets from config without needing an ABI", async () => {
    const adapter = new MorphoAdapter(CONFIG);
    const markets = await adapter.getMarkets();
    expect(markets).toEqual([
      { venue: "morpho", marketId: "usdg-wsteth", ltvCapBps: 6300 },
      { venue: "morpho", marketId: "usdg-cbeth", ltvCapBps: 6200 },
    ]);
  });

  it("getQuote throws NotConfiguredError when the ABI file doesn't exist", async () => {
    const adapter = new MorphoAdapter(CONFIG);
    await expect(adapter.getQuote({
      tokenIn: "0x1111111111111111111111111111111111111111",
      tokenOut: "0x2222222222222222222222222222222222222222",
      amountIn: 1n,
    })).rejects.toThrow(/placeholder/);
  });
});
