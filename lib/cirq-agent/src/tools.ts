import type { PublicClient } from "viem";
import type { EntryParams, ExitParams, IntegrationAdapter } from "@workspace/integrations-shared";
import {
  ExplainOpportunityArgs,
  PrepareEntryArgs,
  PrepareExitArgs,
  ScanOpportunitiesArgs,
} from "./schemas.js";
import type { RegistryGate } from "./registryGate.js";
import { simulatePayload } from "./simulate.js";
import type { AgentOpportunity, PreparedAction } from "./types.js";

/**
 * The agent's entire tool surface. See docs/cirq-backend/AGENT-TOOLS.md.
 *
 * There is deliberately no `sign`, `send`, `transfer`, or `broadcast`
 * method anywhere on this class — the never-sign rule is enforced by
 * omission here, backstopped on-chain by `CirqAgentPolicy`
 * (docs/cirq-backend/SECURITY-CAGE.md). `agentToolNames()` exists so a
 * test can assert that guarantee mechanically rather than by inspection
 * alone — see src/tools.test.ts.
 */
export class CirqAgentTools {
  constructor(
    private readonly adapters: Record<string, IntegrationAdapter>,
    private readonly registryGate: RegistryGate,
    private readonly simulationClient: PublicClient,
  ) {}

  /** The exact set of tool names this agent exposes — see tools.test.ts's never-sign assertion. */
  static agentToolNames(): string[] {
    return [
      "scanOpportunities",
      "getPosition",
      "explainOpportunity",
      "prepareEntry",
      "prepareExit",
    ];
  }

  private adapterFor(venue: string): IntegrationAdapter {
    const adapter = this.adapters[venue];
    if (!adapter) {
      throw new Error(`no adapter registered for venue "${venue}"`);
    }
    return adapter;
  }

  /** Read-only. Curated + risk-scored opportunities across every configured venue. */
  async scanOpportunities(rawArgs: unknown): Promise<AgentOpportunity[]> {
    const args = ScanOpportunitiesArgs.parse(rawArgs);
    const venues = args.venues ?? Object.keys(this.adapters);

    const results = await Promise.all(
      venues.map(async (venue) => {
        const markets = await this.adapterFor(venue).getMarkets();
        return markets;
      }),
    );

    return results.flat();
  }

  /** Read-only. Detail on one opportunity before committing to prepare a payload for it. */
  async explainOpportunity(rawArgs: unknown): Promise<AgentOpportunity> {
    const args = ExplainOpportunityArgs.parse(rawArgs);
    const markets = await this.adapterFor(args.venue).getMarkets();
    const market = markets.find((m) => m.marketId === args.marketId);
    if (!market) {
      throw new Error(`${args.venue} has no market "${args.marketId}"`);
    }
    return market;
  }

  /**
   * Read-only. NOT YET IMPLEMENTED: needs a real per-venue position read
   * (a Morpho/Longbow market position, not just an ERC-20 balance), which
   * depends on each adapter having a real ABI wired in first — see
   * docs/cirq-backend/INTEGRATIONS.md. Throwing explicitly here rather
   * than returning an empty/fake position.
   */
  async getPosition(_rawArgs: unknown): Promise<never> {
    throw new Error(
      "getPosition is not implemented: needs a per-venue position read " +
        "wired up once each adapter's real ABI is filled in.",
    );
  }

  /**
   * Always: check the registry, build the payload via the adapter, fork-
   * simulate it, and only then return it — with the plain-language
   * explanation and (once wired up) risk summary attached. Never returns a
   * payload that failed simulation.
   */
  async prepareEntry(rawArgs: unknown): Promise<PreparedAction> {
    const args = PrepareEntryArgs.parse(rawArgs);

    if (await this.registryGate.isPaused()) {
      throw new Error("CirqRegistry is paused — refusing to prepare any action.");
    }
    if (!(await this.registryGate.isTokenAllowed(args.tokenIn))) {
      throw new Error(`token ${args.tokenIn} is not allowed by CirqRegistry.`);
    }

    const entryParams: EntryParams = {
      marketId: args.marketId,
      owner: args.owner,
      tokenIn: args.tokenIn,
      amountIn: args.amountIn,
    };
    const payload = await this.adapterFor(args.venue).buildEntryPayload(entryParams);

    const simulation = await simulatePayload(this.simulationClient, payload);
    if (!simulation.success) {
      throw new Error(
        `Fork simulation failed, refusing to return this payload: ${simulation.revertReason}`,
      );
    }

    return { payload, explanation: payload.description, simulationSucceeded: true };
  }

  async prepareExit(rawArgs: unknown): Promise<PreparedAction> {
    const args = PrepareExitArgs.parse(rawArgs);

    if (await this.registryGate.isPaused()) {
      throw new Error("CirqRegistry is paused — refusing to prepare any action.");
    }

    const exitParams: ExitParams = { marketId: args.marketId, owner: args.owner };
    const payload = await this.adapterFor(args.venue).buildExitPayload(exitParams);

    const simulation = await simulatePayload(this.simulationClient, payload);
    if (!simulation.success) {
      throw new Error(
        `Fork simulation failed, refusing to return this payload: ${simulation.revertReason}`,
      );
    }

    return { payload, explanation: payload.description, simulationSucceeded: true };
  }
}
