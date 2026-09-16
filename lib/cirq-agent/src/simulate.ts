import type { PublicClient } from "viem";
import type { UnsignedPayload } from "@workspace/integrations-shared";

/**
 * Every significant action is simulated before a payload is ever returned
 * — docs/cirq-backend/SECURITY-CAGE.md invariant 5. This runs the payload
 * as an `eth_call` against whatever RPC the client is pointed at — ideally
 * a fork RPC (`ENV.md`'s `FORK_RPC_URL`), so a real simulation happens
 * against real state without ever broadcasting anything.
 */
export interface SimulationResult {
  success: boolean;
  revertReason?: string;
}

export async function simulatePayload(
  client: PublicClient,
  payload: UnsignedPayload,
): Promise<SimulationResult> {
  try {
    await client.call({ to: payload.to, data: payload.data, value: payload.value });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      revertReason: error instanceof Error ? error.message : String(error),
    };
  }
}
