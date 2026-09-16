import { describe, expect, it, vi } from "vitest";
import type { PublicClient } from "viem";
import type {
  EntryParams,
  ExitParams,
  IntegrationAdapter,
  MarketSummary,
  Quote,
  QuoteParams,
  UnsignedPayload,
} from "@workspace/integrations-shared";
import type { RegistryGate } from "./registryGate.js";
import { CirqAgentTools } from "./tools.js";

class FakeAdapter implements IntegrationAdapter {
  constructor(
    readonly venue: string,
    private readonly markets: MarketSummary[],
    private readonly entryPayload: UnsignedPayload,
  ) {}

  async getMarkets(): Promise<MarketSummary[]> {
    return this.markets;
  }

  async getQuote(_params: QuoteParams): Promise<Quote> {
    throw new Error("not used in these tests");
  }

  async buildEntryPayload(_params: EntryParams): Promise<UnsignedPayload> {
    return this.entryPayload;
  }

  async buildExitPayload(_params: ExitParams): Promise<UnsignedPayload> {
    return this.entryPayload;
  }
}

function fakeRegistryGate(overrides: Partial<RegistryGate> = {}): RegistryGate {
  return {
    isTokenAllowed: vi.fn().mockResolvedValue(true),
    isAdapterAllowed: vi.fn().mockResolvedValue(true),
    isPaused: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
}

const ENTRY_PAYLOAD: UnsignedPayload = {
  to: "0x1234567890123456789012345678901234567890",
  data: "0xdeadbeef",
  value: 0n,
  description: "supplies 100 USDG to the usdg-wsteth market",
};

const OWNER = "0x1111111111111111111111111111111111111111" as const;
const TOKEN = "0x2222222222222222222222222222222222222222" as const;

function successClient(): PublicClient {
  return { call: vi.fn().mockResolvedValue({ data: "0x" }) } as unknown as PublicClient;
}

function revertingClient(reason: string): PublicClient {
  return { call: vi.fn().mockRejectedValue(new Error(reason)) } as unknown as PublicClient;
}

describe("CirqAgentTools — never-sign guarantee", () => {
  it("exposes no sign/send/transfer/broadcast tool", () => {
    const names = CirqAgentTools.agentToolNames();
    const forbidden = ["sign", "send", "transfer", "broadcast"];
    for (const name of names) {
      for (const bad of forbidden) {
        expect(name.toLowerCase()).not.toContain(bad);
      }
    }
  });

  it("the prototype itself has no method matching a forbidden verb", () => {
    const forbidden = ["sign", "send", "transfer", "broadcast"];
    const methodNames = Object.getOwnPropertyNames(CirqAgentTools.prototype);
    for (const name of methodNames) {
      for (const bad of forbidden) {
        expect(name.toLowerCase()).not.toContain(bad);
      }
    }
  });
});

describe("CirqAgentTools.scanOpportunities", () => {
  it("aggregates markets across every configured venue by default", async () => {
    const morpho = new FakeAdapter("morpho", [{ venue: "morpho", marketId: "m1", ltvCapBps: 6300 }], ENTRY_PAYLOAD);
    const longbow = new FakeAdapter("longbow", [{ venue: "longbow", marketId: "l1", ltvCapBps: 7000 }], ENTRY_PAYLOAD);
    const tools = new CirqAgentTools({ morpho, longbow }, fakeRegistryGate(), successClient());

    const opportunities = await tools.scanOpportunities({});
    expect(opportunities).toHaveLength(2);
    expect(opportunities.map((o) => o.marketId).sort()).toEqual(["l1", "m1"]);
  });

  it("respects a venues filter", async () => {
    const morpho = new FakeAdapter("morpho", [{ venue: "morpho", marketId: "m1", ltvCapBps: 6300 }], ENTRY_PAYLOAD);
    const longbow = new FakeAdapter("longbow", [{ venue: "longbow", marketId: "l1", ltvCapBps: 7000 }], ENTRY_PAYLOAD);
    const tools = new CirqAgentTools({ morpho, longbow }, fakeRegistryGate(), successClient());

    const opportunities = await tools.scanOpportunities({ venues: ["morpho"] });
    expect(opportunities).toEqual([{ venue: "morpho", marketId: "m1", ltvCapBps: 6300 }]);
  });

  it("rejects a malformed venues argument before touching any adapter", async () => {
    const morpho = new FakeAdapter("morpho", [], ENTRY_PAYLOAD);
    const tools = new CirqAgentTools({ morpho }, fakeRegistryGate(), successClient());
    await expect(tools.scanOpportunities({ venues: "not-an-array" })).rejects.toThrow();
  });
});

describe("CirqAgentTools.prepareEntry", () => {
  it("checks the registry, builds the payload, simulates it, and returns payload + explanation together", async () => {
    const morpho = new FakeAdapter("morpho", [], ENTRY_PAYLOAD);
    const gate = fakeRegistryGate();
    const tools = new CirqAgentTools({ morpho }, gate, successClient());

    const result = await tools.prepareEntry({
      venue: "morpho",
      marketId: "m1",
      owner: OWNER,
      tokenIn: TOKEN,
      amountIn: 100n,
    });

    expect(result.payload).toEqual(ENTRY_PAYLOAD);
    expect(result.explanation).toBe(ENTRY_PAYLOAD.description);
    expect(result.simulationSucceeded).toBe(true);
    expect(gate.isTokenAllowed).toHaveBeenCalledWith(TOKEN);
  });

  it("refuses when the registry reports paused, without ever building a payload", async () => {
    const buildEntryPayload = vi.fn();
    const morpho: IntegrationAdapter = {
      venue: "morpho",
      getMarkets: vi.fn(),
      getQuote: vi.fn(),
      buildEntryPayload,
      buildExitPayload: vi.fn(),
    };
    const gate = fakeRegistryGate({ isPaused: vi.fn().mockResolvedValue(true) });
    const tools = new CirqAgentTools({ morpho }, gate, successClient());

    await expect(
      tools.prepareEntry({ venue: "morpho", marketId: "m1", owner: OWNER, tokenIn: TOKEN, amountIn: 1n }),
    ).rejects.toThrow(/paused/);
    expect(buildEntryPayload).not.toHaveBeenCalled();
  });

  it("refuses when the token isn't allowed by the registry", async () => {
    const morpho = new FakeAdapter("morpho", [], ENTRY_PAYLOAD);
    const gate = fakeRegistryGate({ isTokenAllowed: vi.fn().mockResolvedValue(false) });
    const tools = new CirqAgentTools({ morpho }, gate, successClient());

    await expect(
      tools.prepareEntry({ venue: "morpho", marketId: "m1", owner: OWNER, tokenIn: TOKEN, amountIn: 1n }),
    ).rejects.toThrow(/not allowed/);
  });

  it("never returns a payload that fails fork simulation", async () => {
    const morpho = new FakeAdapter("morpho", [], ENTRY_PAYLOAD);
    const tools = new CirqAgentTools(
      { morpho },
      fakeRegistryGate(),
      revertingClient("execution reverted: insufficient collateral"),
    );

    await expect(
      tools.prepareEntry({ venue: "morpho", marketId: "m1", owner: OWNER, tokenIn: TOKEN, amountIn: 1n }),
    ).rejects.toThrow(/Fork simulation failed/);
  });

  it("rejects a zero/negative amountIn before touching the registry or adapter", async () => {
    const morpho = new FakeAdapter("morpho", [], ENTRY_PAYLOAD);
    const gate = fakeRegistryGate();
    const tools = new CirqAgentTools({ morpho }, gate, successClient());

    await expect(
      tools.prepareEntry({ venue: "morpho", marketId: "m1", owner: OWNER, tokenIn: TOKEN, amountIn: 0n }),
    ).rejects.toThrow();
    expect(gate.isPaused).not.toHaveBeenCalled();
  });
});

describe("CirqAgentTools.prepareExit", () => {
  it("refuses when the registry reports paused", async () => {
    const morpho = new FakeAdapter("morpho", [], ENTRY_PAYLOAD);
    const gate = fakeRegistryGate({ isPaused: vi.fn().mockResolvedValue(true) });
    const tools = new CirqAgentTools({ morpho }, gate, successClient());

    await expect(tools.prepareExit({ venue: "morpho", marketId: "m1", owner: OWNER })).rejects.toThrow(
      /paused/,
    );
  });

  it("returns payload + explanation once simulation succeeds", async () => {
    const morpho = new FakeAdapter("morpho", [], ENTRY_PAYLOAD);
    const tools = new CirqAgentTools({ morpho }, fakeRegistryGate(), successClient());

    const result = await tools.prepareExit({ venue: "morpho", marketId: "m1", owner: OWNER });
    expect(result.payload).toEqual(ENTRY_PAYLOAD);
  });
});
