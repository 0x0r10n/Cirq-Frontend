import type { PublicClient } from "viem";

/**
 * Chainlink's `AggregatorV3Interface` — a standardized, public interface
 * stable across every Chainlink price feed. Unlike a protocol's own ABI
 * (Morpho, Loopr, Uniswap), this isn't an instance-specific live value, so
 * it's safe to hardcode here. The feed *address* is still always read from
 * `lib/cirq-config` — never hardcoded.
 */
export const CHAINLINK_AGGREGATOR_ABI = [
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "latestRoundData",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
  },
] as const;

export interface ChainlinkPrice {
  price: number;
  updatedAt: Date;
  /** True once the feed hasn't updated within `maxStalenessSeconds`. A
   * stale price is a risk signal to surface, never silently swapped for a
   * worse source (e.g. pool TWAP) — see docs/cirq-backend/SECURITY-CAGE.md
   * invariant 4. */
  stale: boolean;
}

export async function getChainlinkPrice(
  client: PublicClient,
  feedAddress: `0x${string}`,
  maxStalenessSeconds = 3600,
): Promise<ChainlinkPrice> {
  const [decimals, roundData] = await Promise.all([
    client.readContract({
      address: feedAddress,
      abi: CHAINLINK_AGGREGATOR_ABI,
      functionName: "decimals",
    }),
    client.readContract({
      address: feedAddress,
      abi: CHAINLINK_AGGREGATOR_ABI,
      functionName: "latestRoundData",
    }),
  ]);

  const [, answer, , updatedAt] = roundData;
  const price = Number(answer) / 10 ** decimals;
  const updatedAtDate = new Date(Number(updatedAt) * 1000);
  const staleSeconds = (Date.now() - updatedAtDate.getTime()) / 1000;

  return { price, updatedAt: updatedAtDate, stale: staleSeconds > maxStalenessSeconds };
}
