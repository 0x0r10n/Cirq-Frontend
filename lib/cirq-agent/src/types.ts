import type { MarketSummary, UnsignedPayload } from "@workspace/integrations-shared";

export interface AgentOpportunity extends MarketSummary {}

/**
 * What every payload-producing tool returns — always these three together,
 * never a bare payload. See docs/cirq-backend/AGENT-TOOLS.md.
 */
export interface PreparedAction {
  payload: UnsignedPayload;
  explanation: string;
  /** From the fork simulation this action was required to pass before being returned. */
  simulationSucceeded: true;
}
