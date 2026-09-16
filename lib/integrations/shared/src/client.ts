import { createPublicClient, defineChain, http, type PublicClient } from "viem";
import { ROBINHOOD_CHAIN_GAS_TOKEN, ROBINHOOD_CHAIN_ID } from "@workspace/cirq-config";

/**
 * A viem public client for Robinhood Chain, pointed at the RPC URL from
 * `lib/cirq-config` (never a hardcoded endpoint). Robinhood Chain isn't one
 * of viem's built-in chains, so it's defined here from the one chain fact
 * treated as safe to hardcode — see lib/cirq-config/src/chain.ts.
 */
export function createRobinhoodChainClient(rpcUrl: string): PublicClient {
  const chain = defineChain({
    id: ROBINHOOD_CHAIN_ID,
    name: "Robinhood Chain",
    nativeCurrency: { name: "Ether", symbol: ROBINHOOD_CHAIN_GAS_TOKEN, decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  });
  return createPublicClient({ chain, transport: http(rpcUrl) });
}
