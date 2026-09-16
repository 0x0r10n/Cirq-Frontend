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
 * Thin routing adapter over Uniswap v4 (+ UniswapX). See
 * docs/cirq-backend/INTEGRATIONS.md.
 *
 * Also exposes whether a given pool has a v4 allowlist hook active
 * (`tokens.stocks[].poolAllowlisted` in config) — this only decides whether
 * the agent's own wallet needs allowlisting to interact with that pool, and
 * is never a reason for Cirq to deploy a pool of its own.
 *
 * As with the other adapters: real quote/swap logic needs the actual
 * PoolManager/Universal Router ABI, which this scaffold does not guess.
 */
export class UniswapAdapter implements IntegrationAdapter {
  readonly venue = "uniswap";

  private readonly config: ResolvedCirqAddressesConfig;
  private client: PublicClient | undefined;

  constructor(config: ResolvedCirqAddressesConfig = loadCirqConfig()) {
    this.config = config;
  }

  private chainClient(): PublicClient {
    this.client ??= createRobinhoodChainClient(this.config.rpc.url);
    return this.client;
  }

  private loadPoolManagerAbiOrThrow(): unknown[] {
    try {
      return loadAbi(this.config.protocols.uniswap.poolManagerAbiPath);
    } catch {
      throw new NotConfiguredError(this.venue, "protocols.uniswap.poolManagerAbiPath");
    }
  }

  private loadUniversalRouterAbiOrThrow(): unknown[] {
    try {
      return loadAbi(this.config.protocols.uniswap.universalRouterAbiPath);
    } catch {
      throw new NotConfiguredError(this.venue, "protocols.uniswap.universalRouterAbiPath");
    }
  }

  /** Whether the agent wallet needs to be allowlisted to touch a stock token's pool. */
  isPoolAllowlisted(tokenAddress: `0x${string}`): boolean {
    const stock = this.config.tokens.stocks.find(
      (s) => s.address.toLowerCase() === tokenAddress.toLowerCase(),
    );
    if (!stock) {
      throw new Error(`${tokenAddress} is not a configured stock token — see lib/cirq-config`);
    }
    return stock.poolAllowlisted;
  }

  async getMarkets(): Promise<MarketSummary[]> {
    // Uniswap pools aren't lending markets with an LTV cap; they're
    // surfaced to the risk/curation layer via getQuote's price-impact data
    // instead, so this returns an empty list rather than a made-up 0% cap.
    return [];
  }

  async getQuote(_params: QuoteParams): Promise<Quote> {
    this.loadPoolManagerAbiOrThrow();
    this.chainClient();
    throw new Error(
      "UniswapAdapter.getQuote is not implemented: wire up a real quote " +
        "(pool state read or a quoter call) against the ABI now loaded from " +
        "protocols.uniswap.poolManagerAbiPath — see docs/cirq-backend/INTEGRATIONS.md.",
    );
  }

  async buildEntryPayload(_params: EntryParams): Promise<UnsignedPayload> {
    this.loadUniversalRouterAbiOrThrow();
    throw new Error(
      "UniswapAdapter.buildEntryPayload is not implemented: build unsigned " +
        "swap calldata through the Universal Router once its real ABI is confirmed.",
    );
  }

  async buildExitPayload(_params: ExitParams): Promise<UnsignedPayload> {
    // A swap has no standing "position" to exit the way a Morpho/Longbow
    // loan does — reverse-direction swaps go through buildEntryPayload
    // instead. This exists only to satisfy IntegrationAdapter; the agent
    // should not call it for this venue.
    throw new Error(
      "UniswapAdapter has no exit concept — a swap isn't a held position. " +
        "Use buildEntryPayload with tokenIn/tokenOut reversed instead.",
    );
  }
}
