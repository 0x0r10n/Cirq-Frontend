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
 * Thin read/payload-building adapter over Morpho Blue. See
 * docs/cirq-backend/INTEGRATIONS.md. Never deploys liquidity, never signs.
 *
 * `getMarkets` only needs `lib/cirq-config` (curated market ids + the LTV
 * caps a human already verified on-chain) — it works before the Morpho ABI
 * is filled in. Anything that needs to call Morpho Blue itself
 * (`getQuote`, payload building) needs the real ABI first: this adapter
 * intentionally does not guess Morpho Blue's function signatures from
 * memory — a wrong one is exactly the "plausible-looking ABI" the spec
 * warns against. Wire the specific calls in once `protocols.morpho.abiPath`
 * holds the real ABI.
 */
export class MorphoAdapter implements IntegrationAdapter {
  readonly venue = "morpho";

  private readonly config: ResolvedCirqAddressesConfig;
  private client: PublicClient | undefined;

  constructor(config: ResolvedCirqAddressesConfig = loadCirqConfig()) {
    this.config = config;
  }

  private chainClient(): PublicClient {
    this.client ??= createRobinhoodChainClient(this.config.rpc.url);
    return this.client;
  }

  /** Loads the real Morpho Blue ABI, throwing `NotConfiguredError` while it's still a placeholder. */
  private loadAbiOrThrow(): unknown[] {
    try {
      return loadAbi(this.config.protocols.morpho.abiPath);
    } catch {
      throw new NotConfiguredError(this.venue, "protocols.morpho.abiPath");
    }
  }

  async getMarkets(): Promise<MarketSummary[]> {
    return this.config.protocols.morpho.markets.map((market) => ({
      venue: this.venue,
      marketId: market.id,
      ltvCapBps: market.ltvCapBps,
    }));
  }

  async getQuote(_params: QuoteParams): Promise<Quote> {
    this.loadAbiOrThrow();
    this.chainClient();
    throw new Error(
      "MorphoAdapter.getQuote is not implemented: wire up the real market-rate " +
        "read (e.g. Morpho Blue's `market(Id)` view) against the ABI now loaded " +
        "from protocols.morpho.abiPath — see docs/cirq-backend/INTEGRATIONS.md.",
    );
  }

  async buildEntryPayload(_params: EntryParams): Promise<UnsignedPayload> {
    this.loadAbiOrThrow();
    throw new Error(
      "MorphoAdapter.buildEntryPayload is not implemented: build unsigned " +
        "supply/borrow calldata against protocols.morpho.core once the ABI's " +
        "real function signatures are confirmed.",
    );
  }

  async buildExitPayload(_params: ExitParams): Promise<UnsignedPayload> {
    this.loadAbiOrThrow();
    throw new Error(
      "MorphoAdapter.buildExitPayload is not implemented: build unsigned " +
        "repay/withdraw calldata against protocols.morpho.core once the ABI's " +
        "real function signatures are confirmed.",
    );
  }
}
