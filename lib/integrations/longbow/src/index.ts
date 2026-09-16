import { loadCirqConfig, type ResolvedCirqAddressesConfig } from "@workspace/cirq-config";
import {
  callMcpTool,
  listMcpTools,
  type EntryParams,
  type ExitParams,
  type IntegrationAdapter,
  type MarketSummary,
  type McpToolDescriptor,
  type Quote,
  type QuoteParams,
  type UnsignedPayload,
} from "@workspace/integrations-shared";

/**
 * Thin adapter over Longbow's ~42 isolated markets. Longbow exposes an MCP
 * endpoint for agents — this adapter calls it over the standard MCP
 * JSON-RPC wire protocol (`tools/list` / `tools/call`) rather than
 * hand-rolling REST calls, per docs/cirq-backend/INTEGRATIONS.md.
 *
 * Which specific tool names Longbow's server exposes (e.g. something like
 * "get_market" or "prepare_entry") is not something this scaffold guesses
 * — call `discoverTools()` against the real `protocols.longbow.mcpUrl`
 * first and wire the exact names in once known, rather than hardcoding a
 * plausible-looking tool name.
 */
export class LongbowAdapter implements IntegrationAdapter {
  readonly venue = "longbow";

  private readonly config: ResolvedCirqAddressesConfig;

  constructor(config: ResolvedCirqAddressesConfig = loadCirqConfig()) {
    this.config = config;
  }

  /** Real, working: lists the tools Longbow's MCP server actually exposes. */
  discoverTools(): Promise<McpToolDescriptor[]> {
    return listMcpTools(this.config.protocols.longbow.mcpUrl);
  }

  async getMarkets(): Promise<MarketSummary[]> {
    return this.config.protocols.longbow.markets.map((market) => ({
      venue: this.venue,
      marketId: market.id,
      ltvCapBps: market.ltvCapBps,
    }));
  }

  async getQuote(_params: QuoteParams): Promise<Quote> {
    throw new Error(
      "LongbowAdapter.getQuote is not implemented: call discoverTools() " +
        "against the real MCP endpoint, find the quote/market-rate tool, " +
        "and call it with callMcpTool() — see docs/cirq-backend/INTEGRATIONS.md.",
    );
  }

  async buildEntryPayload(_params: EntryParams): Promise<UnsignedPayload> {
    throw new Error(
      "LongbowAdapter.buildEntryPayload is not implemented: once the real " +
        "entry-payload tool name is known (via discoverTools()), call it " +
        "with callMcpTool() and map its response into an UnsignedPayload.",
    );
  }

  async buildExitPayload(_params: ExitParams): Promise<UnsignedPayload> {
    throw new Error(
      "LongbowAdapter.buildExitPayload is not implemented: same as " +
        "buildEntryPayload, for whichever tool Longbow exposes for exiting " +
        "a market position (may include an unwind of a flash-loan-assisted loop).",
    );
  }

  /** Exposed for once the real tool name is known — avoids re-deriving the MCP call plumbing per call site. */
  callTool<T = unknown>(toolName: string, args: Record<string, unknown>): Promise<T> {
    return callMcpTool<T>(this.config.protocols.longbow.mcpUrl, toolName, args);
  }
}
