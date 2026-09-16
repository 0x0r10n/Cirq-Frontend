import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadAbi, loadCirqConfig } from "./load.js";

const EXAMPLE_PATH = path.resolve(
  import.meta.dirname,
  "..",
  "addresses.example.json",
);

function writeTempConfig(data: unknown): string {
  const file = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "cirq-config-")),
    "addresses.json",
  );
  fs.writeFileSync(file, JSON.stringify(data));
  return file;
}

const VALID_CONFIG = {
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
    USDG: {
      address: "0x1111111111111111111111111111111111111111",
      decimals: 18,
    },
    stocks: [
      {
        symbol: "AAPL",
        address: "0x2222222222222222222222222222222222222222",
        decimals: 18,
        uiMultiplier: 1,
        poolAllowlisted: false,
      },
    ],
  },
  chainlink: {
    feeds: [
      { asset: "ETH/USD", address: "0x3333333333333333333333333333333333333333" },
    ],
  },
  protocols: {
    morpho: {
      core: "0x4444444444444444444444444444444444444444",
      abiPath: "lib/integrations/abis/morpho-blue.json",
      markets: [{ id: "usdg-wsteth", ltvCapBps: 6300 }],
    },
    longbow: {
      mcpUrl: "https://example.com/mcp",
      markets: [
        {
          id: "market-1",
          address: "0x5555555555555555555555555555555555555555",
          ltvCapBps: 6300,
        },
      ],
    },
    loopr: {
      router: "0x6666666666666666666666666666666666666666",
      abiPath: "lib/integrations/abis/loopr-router.json",
    },
    uniswap: {
      poolManager: "0x7777777777777777777777777777777777777777",
      universalRouter: "0x8888888888888888888888888888888888888888",
      poolManagerAbiPath: "lib/integrations/abis/uniswap-v4-pool-manager.json",
      universalRouterAbiPath:
        "lib/integrations/abis/uniswap-universal-router.json",
    },
  },
};

describe("loadCirqConfig", () => {
  it("throws naming the file when the config path doesn't exist", () => {
    expect(() =>
      loadCirqConfig("/nonexistent/path/addresses.json"),
    ).toThrow(/not found/);
  });

  it("rejects the shipped example file, listing every FILL IN placeholder", () => {
    expect(() => loadCirqConfig(EXAMPLE_PATH)).toThrow(
      /Missing \d+ live value/,
    );
  });

  it("accepts a fully filled-in config", () => {
    const configPath = writeTempConfig(VALID_CONFIG);
    const config = loadCirqConfig(configPath);
    expect(config.tokens.USDG.decimals).toBe(18);
    expect(config.protocols.morpho.markets[0]?.ltvCapBps).toBe(6300);
  });

  describe("default path resolution (regression: must survive esbuild bundling)", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("finds addresses.json by walking up from cwd to pnpm-workspace.yaml, not from this module's own file location", () => {
      // Simulates artifacts/api-server's bundled dist/index.mjs: this
      // module's compiled code is inlined into another package's bundle at
      // build time, so import.meta.url no longer points at
      // lib/cirq-config's real directory. Only a cwd-relative search
      // survives that — this test fails if defaultConfigPath() ever goes
      // back to resolving from import.meta.url alone.
      const fakeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cirq-fake-repo-"));
      fs.writeFileSync(path.join(fakeRoot, "pnpm-workspace.yaml"), "packages: []\n");
      const configDir = path.join(fakeRoot, "lib", "cirq-config");
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(path.join(configDir, "addresses.json"), JSON.stringify(VALID_CONFIG));

      const nestedCwd = path.join(fakeRoot, "artifacts", "api-server", "dist");
      fs.mkdirSync(nestedCwd, { recursive: true });
      vi.spyOn(process, "cwd").mockReturnValue(nestedCwd);

      const config = loadCirqConfig();
      expect(config.tokens.USDG.decimals).toBe(18);
    });
  });

  it("rejects a malformed address even when not a placeholder", () => {
    const configPath = writeTempConfig({
      ...VALID_CONFIG,
      protocols: {
        ...VALID_CONFIG.protocols,
        morpho: { ...VALID_CONFIG.protocols.morpho, core: "not-an-address" },
      },
    });
    expect(() => loadCirqConfig(configPath)).toThrow(
      /expected a 0x-prefixed 40-hex address/,
    );
  });

  it("rejects an LTV cap out of range", () => {
    const configPath = writeTempConfig({
      ...VALID_CONFIG,
      protocols: {
        ...VALID_CONFIG.protocols,
        morpho: {
          ...VALID_CONFIG.protocols.morpho,
          markets: [{ id: "bad", ltvCapBps: 15_000 }],
        },
      },
    });
    expect(() => loadCirqConfig(configPath)).toThrow(/out of range/);
  });
});

describe("loadAbi", () => {
  it("rejects a missing file", () => {
    expect(() => loadAbi("/nonexistent/abi.json")).toThrow(/not found/);
  });

  it("rejects a placeholder ABI", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cirq-abi-"));
    const file = path.join(dir, "abi.json");
    fs.writeFileSync(file, "⚠️ FILL IN — real ABI");
    expect(() => loadAbi(file)).toThrow(/placeholder/);
  });

  it("accepts a real ABI array", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cirq-abi-"));
    const file = path.join(dir, "abi.json");
    fs.writeFileSync(file, JSON.stringify([{ type: "function", name: "foo" }]));
    expect(loadAbi(file)).toHaveLength(1);
  });

  it.each([
    "morpho-blue.json",
    "loopr-router.json",
    "uniswap-v4-pool-manager.json",
    "uniswap-universal-router.json",
  ])("rejects the shipped placeholder %s", (filename) => {
    const abiPath = path.resolve(
      import.meta.dirname,
      "..",
      "..",
      "integrations",
      "abis",
      filename,
    );
    expect(() => loadAbi(abiPath)).toThrow(/placeholder/);
  });
});
