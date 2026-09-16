import type { PublicClient } from "viem";

/**
 * The read subset of `CirqRegistry`'s real ABI (contracts/src/CirqRegistry.sol,
 * written in this same repo — not a third-party protocol, so hardcoding it
 * here is not the kind of "plausible-looking ABI" docs/cirq-backend/
 * LIVE-VALUES.md warns against). Keep this in sync if CirqRegistry's
 * function signatures change.
 */
export const CIRQ_REGISTRY_READ_ABI = [
  {
    type: "function",
    name: "isTokenAllowed",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "isAdapterAllowed",
    stateMutability: "view",
    inputs: [{ name: "adapter", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "paused",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

/**
 * What the agent checks against `CirqRegistry` before ever building a
 * payload — see docs/cirq-backend/AGENT-TOOLS.md. An interface (not just
 * the concrete on-chain implementation below) so tests can substitute a
 * fake without needing a live deployment.
 */
export interface RegistryGate {
  isTokenAllowed(token: `0x${string}`): Promise<boolean>;
  isAdapterAllowed(adapter: `0x${string}`): Promise<boolean>;
  isPaused(): Promise<boolean>;
}

export class OnChainRegistryGate implements RegistryGate {
  constructor(
    private readonly client: PublicClient,
    private readonly registryAddress: `0x${string}`,
  ) {}

  isTokenAllowed(token: `0x${string}`): Promise<boolean> {
    return this.client.readContract({
      address: this.registryAddress,
      abi: CIRQ_REGISTRY_READ_ABI,
      functionName: "isTokenAllowed",
      args: [token],
    });
  }

  isAdapterAllowed(adapter: `0x${string}`): Promise<boolean> {
    return this.client.readContract({
      address: this.registryAddress,
      abi: CIRQ_REGISTRY_READ_ABI,
      functionName: "isAdapterAllowed",
      args: [adapter],
    });
  }

  isPaused(): Promise<boolean> {
    return this.client.readContract({
      address: this.registryAddress,
      abi: CIRQ_REGISTRY_READ_ABI,
      functionName: "paused",
    });
  }
}
