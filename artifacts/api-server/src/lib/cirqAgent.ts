import { loadCirqConfig } from "@workspace/cirq-config";
import { CirqAgentTools, OnChainRegistryGate } from "@workspace/cirq-agent";
import { createRobinhoodChainClient, type IntegrationAdapter } from "@workspace/integrations-shared";
import { MorphoAdapter } from "@workspace/integrations-morpho";
import { LongbowAdapter } from "@workspace/integrations-longbow";
import { LooprAdapter } from "@workspace/integrations-loopr";
import { UniswapAdapter } from "@workspace/integrations-uniswap";

/**
 * Built lazily (not at module load) so the server can still start and serve
 * /healthz when lib/cirq-config/addresses.json isn't filled in yet —
 * exactly the routes that need it fail loudly and specifically instead of
 * the whole process refusing to boot. See docs/cirq-backend/LIVE-VALUES.md.
 */
let cached: CirqAgentTools | undefined;

export function getCirqAgentTools(): CirqAgentTools {
  if (cached) return cached;

  const config = loadCirqConfig();
  const client = createRobinhoodChainClient(config.rpc.url);

  const adapters: Record<string, IntegrationAdapter> = {
    morpho: new MorphoAdapter(config),
    longbow: new LongbowAdapter(config),
    loopr: new LooprAdapter(config),
    uniswap: new UniswapAdapter(config),
  };

  const registryGate = new OnChainRegistryGate(client, config.cirq.registry as `0x${string}`);

  cached = new CirqAgentTools(adapters, registryGate, client);
  return cached;
}
