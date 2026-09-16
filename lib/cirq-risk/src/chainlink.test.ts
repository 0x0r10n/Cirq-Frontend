import { describe, expect, it, vi } from "vitest";
import type { PublicClient } from "viem";
import { getChainlinkPrice } from "./chainlink.js";

function mockClient(decimals: number, answer: bigint, updatedAtSeconds: number): PublicClient {
  const readContract = vi.fn().mockImplementation(({ functionName }: { functionName: string }) => {
    if (functionName === "decimals") return Promise.resolve(decimals);
    if (functionName === "latestRoundData") {
      return Promise.resolve([1n, answer, 0n, BigInt(updatedAtSeconds), 1n]);
    }
    throw new Error(`unexpected function ${functionName}`);
  });
  return { readContract } as unknown as PublicClient;
}

describe("getChainlinkPrice", () => {
  it("scales the raw answer by the feed's own decimals", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const client = mockClient(8, 400_000_000_000n, nowSeconds); // 4000.00000000
    const result = await getChainlinkPrice(client, "0x1111111111111111111111111111111111111111");
    expect(result.price).toBe(4000);
    expect(result.stale).toBe(false);
  });

  it("flags a price as stale once it exceeds maxStalenessSeconds", async () => {
    const staleSeconds = Math.floor(Date.now() / 1000) - 7200; // 2 hours old
    const client = mockClient(8, 400_000_000_000n, staleSeconds);
    const result = await getChainlinkPrice(
      client,
      "0x1111111111111111111111111111111111111111",
      3600,
    );
    expect(result.stale).toBe(true);
  });
});
