import { afterEach, describe, expect, it, vi } from "vitest";
import type { ResolvedCirqAddressesConfig } from "@workspace/cirq-config";
import { LongbowAdapter } from "./index.js";

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
  tokens: { USDG: { address: "0x1111111111111111111111111111111111111111", decimals: 18 }, stocks: [] },
  chainlink: { feeds: [] },
  protocols: {
    morpho: { core: "0x4444444444444444444444444444444444444444", abiPath: "/nonexistent.json", markets: [] },
    longbow: {
      mcpUrl: "https://longbow.example.com/mcp",
      markets: [
        { id: "market-1", address: "0x5555555555555555555555555555555555555555", ltvCapBps: 6300 },
      ],
    },
    loopr: { router: "0x6666666666666666666666666666666666666666", abiPath: "/nonexistent.json" },
    uniswap: {
      poolManager: "0x7777777777777777777777777777777777777777",
      universalRouter: "0x8888888888888888888888888888888888888888",
      poolManagerAbiPath: "/nonexistent.json",
      universalRouterAbiPath: "/nonexistent.json",
    },
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LongbowAdapter", () => {
  it("getMarkets returns curated markets from config, no network call", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const adapter = new LongbowAdapter(CONFIG);
    const markets = await adapter.getMarkets();

    expect(markets).toEqual([
      { venue: "longbow", marketId: "market-1", ltvCapBps: 6300 },
    ]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("discoverTools calls the real MCP tools/list JSON-RPC method", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        jsonrpc: "2.0",
        id: 1,
        result: { tools: [{ name: "get_market" }] },
      }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    const adapter = new LongbowAdapter(CONFIG);
    const tools = await adapter.discoverTools();

    expect(tools).toEqual([{ name: "get_market" }]);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://longbow.example.com/mcp");
    const body = JSON.parse(init.body as string) as { method: string };
    expect(body.method).toBe("tools/list");
  });

  it("callTool calls the real MCP tools/call JSON-RPC method with the given name and args", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ jsonrpc: "2.0", id: 1, result: { ok: true } }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    const adapter = new LongbowAdapter(CONFIG);
    const result = await adapter.callTool("get_market", { marketId: "market-1" });

    expect(result).toEqual({ ok: true });
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as {
      method: string;
      params: { name: string; arguments: unknown };
    };
    expect(body.method).toBe("tools/call");
    expect(body.params).toEqual({ name: "get_market", arguments: { marketId: "market-1" } });
  });
});
