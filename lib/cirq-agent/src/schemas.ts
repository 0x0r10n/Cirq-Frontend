import { z } from "zod";

/**
 * Zod schemas for every tool's arguments — see docs/cirq-backend/AGENT-TOOLS.md.
 * A malformed or adversarial tool call from a compromised or misbehaving
 * model fails validation here, before it ever reaches an adapter.
 */

const hexAddress = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/, "expected a 0x-prefixed 40-hex address")
  .transform((value) => value as `0x${string}`);

export const ScanOpportunitiesArgs = z.object({
  venues: z.array(z.string()).optional(),
});
export type ScanOpportunitiesArgs = z.infer<typeof ScanOpportunitiesArgs>;

export const GetPositionArgs = z.object({
  address: hexAddress,
});
export type GetPositionArgs = z.infer<typeof GetPositionArgs>;

export const ExplainOpportunityArgs = z.object({
  venue: z.string().min(1),
  marketId: z.string().min(1),
});
export type ExplainOpportunityArgs = z.infer<typeof ExplainOpportunityArgs>;

export const PrepareEntryArgs = z.object({
  venue: z.string().min(1),
  marketId: z.string().min(1),
  owner: hexAddress,
  tokenIn: hexAddress,
  amountIn: z.bigint().positive(),
});
export type PrepareEntryArgs = z.infer<typeof PrepareEntryArgs>;

export const PrepareExitArgs = z.object({
  venue: z.string().min(1),
  marketId: z.string().min(1),
  owner: hexAddress,
});
export type PrepareExitArgs = z.infer<typeof PrepareExitArgs>;
