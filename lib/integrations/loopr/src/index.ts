import { loadAbi, loadCirqConfig, type ResolvedCirqAddressesConfig } from "@workspace/cirq-config";
import {
  createRobinhoodChainClient,
  NotConfiguredError,
  type EntryParams,
  type ExitParams,
  type IntegrationAdapter,
  type MarketSummary,
  type Quote,
  type QuoteParams,
  type UnsignedPayload,
} from "@workspace/integrations-shared";
import type { PublicClient } from "viem";

/**
 * Thin adapter over Loopr — the atomic, single-signature loop entrypoint.
 * See docs/cirq-backend/INTEGRATIONS.md. Preferred path for any opportunity
 * that maps onto an existing Loopr template, since it collapses what would
 * otherwise be a multi-step, multi-signature sequence into one payload.
 */
export class LooprAdapter implements IntegrationAdapter {
  readonly venue = "loopr";

  private readonly config: ResolvedCirqAddressesConfig;
  private client: PublicClient | undefined;

  constructor(config: ResolvedCirqAddressesConfig = loadCirqConfig()) {
    this.config = config;
  }

  private chainClient(): PublicClient {
    this.client ??= createRobinhoodChainClient(this.config.rpc.url);
    return this.client;
  }

  private loadAbiOrThrow(): unknown[] {
    try {
      return loadAbi(this.config.protocols.loopr.abiPath);
    } catch {
      throw new NotConfiguredError(this.venue, "protocols.loopr.abiPath");
    }
  }

  async getMarkets(): Promise<MarketSummary[]> {
    // Loopr's available loop templates and their current terms are a live
    // on-chain/API read this scaffold doesn't perform yet (no template list
    // exists in config — see docs/cirq-backend/LIVE-VALUES.md, which only
    // covers the router address + ABI, not individual templates).
    return [];
  }

  async getQuote(_params: QuoteParams): Promise<Quote> {
    this.loadAbiOrThrow();
    this.chainClient();
    throw new Error(
      "LooprAdapter.getQuote is not implemented: read the chosen loop " +
        "template's current terms against the ABI now loaded from " +
        "protocols.loopr.abiPath — see docs/cirq-backend/INTEGRATIONS.md.",
    );
  }

  async buildEntryPayload(_params: EntryParams): Promise<UnsignedPayload> {
    this.loadAbiOrThrow();
    throw new Error(
      "LooprAdapter.buildEntryPayload is not implemented: build the single " +
        "atomic calldata blob for the chosen loop template against " +
        "protocols.loopr.router once the real ABI's function signature is confirmed.",
    );
  }

  async buildExitPayload(_params: ExitParams): Promise<UnsignedPayload> {
    this.loadAbiOrThrow();
    throw new Error(
      "LooprAdapter.buildExitPayload is not implemented: build the unwind " +
        "calldata for the given loop position once the real ABI is confirmed.",
    );
  }
}
