import { z } from "zod";

/**
 * A live numeric value (decimals, uiMultiplier, an LTV cap in bps) that
 * must be either a real number or a `⚠️ FILL IN` placeholder string —
 * never a bare default number, since a wrong decimals/LTV value is a
 * financial-correctness bug, not just a cosmetic one. Range + placeholder
 * checks happen in `load.ts`; this only fixes the shape at parse time.
 */
const fillableNumber = z.union([z.number(), z.string()]);

/**
 * Structural shape only. Whether a field is currently a `⚠️ FILL IN`
 * placeholder, and whether a filled-in value is a well-formed
 * address/URL/number, is checked separately in `load.ts` — see schema.md
 * for why the two checks are split.
 */
export const AddressesSchema = z.object({
  rpc: z.object({
    url: z.string().min(1),
    bundlerUrl: z.string().min(1),
    paymasterUrl: z.string().min(1),
  }),
  /**
   * Cirq's own two deployed contracts (see docs/cirq-backend/CONTRACTS.md).
   * Unlike everything under `protocols`, these aren't third-party live
   * values to source externally — they're filled in from
   * `contracts/script/Deploy.s.sol`'s own output once it's actually run.
   */
  cirq: z.object({
    registry: z.string().min(1),
    policy: z.string().min(1),
  }),
  tokens: z.object({
    USDG: z.object({
      address: z.string().min(1),
      decimals: fillableNumber,
    }),
    stocks: z.array(
      z.object({
        symbol: z.string().min(1),
        address: z.string().min(1),
        decimals: fillableNumber,
        uiMultiplier: fillableNumber,
        poolAllowlisted: z.boolean(),
      }),
    ),
  }),
  chainlink: z.object({
    feeds: z.array(
      z.object({
        asset: z.string().min(1),
        address: z.string().min(1),
      }),
    ),
  }),
  protocols: z.object({
    morpho: z.object({
      core: z.string().min(1),
      abiPath: z.string().min(1),
      markets: z.array(
        z.object({
          id: z.string().min(1),
          ltvCapBps: fillableNumber,
        }),
      ),
    }),
    longbow: z.object({
      mcpUrl: z.string().min(1),
      markets: z.array(
        z.object({
          id: z.string().min(1),
          address: z.string().min(1),
          ltvCapBps: fillableNumber,
        }),
      ),
    }),
    loopr: z.object({
      router: z.string().min(1),
      abiPath: z.string().min(1),
    }),
    uniswap: z.object({
      poolManager: z.string().min(1),
      universalRouter: z.string().min(1),
      poolManagerAbiPath: z.string().min(1),
      universalRouterAbiPath: z.string().min(1),
    }),
  }),
});

/** Raw shape as parsed from JSON — numeric live values may still be strings. */
export type CirqAddressesConfig = z.infer<typeof AddressesSchema>;

/**
 * Mirrors `AddressesSchema` with every `fillableNumber` narrowed to
 * `z.number()`. `load.ts` returns data matching this schema — never
 * `AddressesSchema` directly — because by the time it returns, every
 * placeholder has already been rejected, so no consumer downstream
 * (contracts deploy scripts, integrations, the agent) should have to
 * narrow `string | number` itself.
 */
export const ResolvedAddressesSchema = z.object({
  rpc: AddressesSchema.shape.rpc,
  cirq: AddressesSchema.shape.cirq,
  tokens: z.object({
    USDG: z.object({
      address: z.string(),
      decimals: z.number(),
    }),
    stocks: z.array(
      z.object({
        symbol: z.string(),
        address: z.string(),
        decimals: z.number(),
        uiMultiplier: z.number(),
        poolAllowlisted: z.boolean(),
      }),
    ),
  }),
  chainlink: AddressesSchema.shape.chainlink,
  protocols: z.object({
    morpho: z.object({
      core: z.string(),
      abiPath: z.string(),
      markets: z.array(
        z.object({
          id: z.string(),
          ltvCapBps: z.number(),
        }),
      ),
    }),
    longbow: z.object({
      mcpUrl: z.string(),
      markets: z.array(
        z.object({
          id: z.string(),
          address: z.string(),
          ltvCapBps: z.number(),
        }),
      ),
    }),
    loopr: AddressesSchema.shape.protocols.shape.loopr,
    uniswap: AddressesSchema.shape.protocols.shape.uniswap,
  }),
});

export type ResolvedCirqAddressesConfig = z.infer<
  typeof ResolvedAddressesSchema
>;
