# Integrations — integrate, don't rebuild

Location: `lib/integrations/<protocol>` (one pnpm package per protocol;
`lib/integrations/*` is already declared in `pnpm-workspace.yaml`).

Every adapter here is **thin**. If an adapter starts accumulating its own
pricing logic, its own pool math, or its own loan accounting, that's a sign
the logic belongs in `RISK-CURATION.md`'s risk engine (which reads
Chainlink + adapter data) rather than in the adapter itself. Adapters read
data and build unsigned calldata; they never hold funds, never sign, and
never deploy liquidity.

## Build order per adapter

1. **Read-only first**: quotes, market data, position data. No wallet
   needed. This is what the opportunity scanner and risk engine consume.
2. **Payload-building second**: given a chosen opportunity, build the
   unsigned transaction (or ERC-4337 UserOperation) calldata that the
   agent hands back to the user to sign. Never broadcasts, never signs.

## Per-protocol scope

### Uniswap v2/v3/v4 + UniswapX
Routing layer. Read-only: pool state, quotes across v2/v3/v4 and UniswapX
intents. Payload-building: swap calldata through the Universal Router
(address from config). Also exposes whether a given stock-token pool has a
v4 allowlist hook active (`tokens.stocks[].poolAllowlisted` in
`LIVE-VALUES.md`) — this only determines whether the agent's own wallet
needs to be allowlisted to interact with that pool, never whether Cirq
deploys a pool of its own.

### Morpho Blue
Lending. Read-only: market state (supply/borrow rates, utilization,
oracle price via Chainlink, LTV cap per market — read on-chain, never
assumed). Payload-building: supply/borrow/repay/withdraw calldata against
the Morpho Blue core contract (address from config).

### Longbow
Isolated markets + flash loans (~42 markets). Longbow exposes an MCP
endpoint for agents — prefer calling it over hand-rolling API calls where
it covers the same read surface, since it's the vendor's own agent-facing
interface and stays in sync with their market set. Read-only: per-market
state across the ~42 isolated markets. Payload-building: entry/exit
calldata per market, including flash-loan-assisted loop entries where the
opportunity calls for one — Longbow provides the flash loan primitive,
Cirq never writes its own.

### Loopr
Atomic single-signature loops. Read-only: available loop templates and
their current terms. Payload-building: the single calldata blob that
executes a full loop atomically through Loopr's router (address + ABI
from config) — this is the preferred path for any opportunity that maps
onto an existing Loopr template, since it collapses what would otherwise
be a multi-step, multi-signature sequence into one payload for the user to
sign once.

## Shared adapter interface

Define one TypeScript interface all four adapters implement (in a small
shared package or `lib/integrations/shared` if adapters end up needing
more than types) so the risk engine and agent tools can treat "get a
quote" / "build entry payload" / "build exit payload" uniformly across
protocols, dispatching on which venue an opportunity came from. Keep this
interface minimal — resist adding protocol-specific options to the shared
shape; protocol-specific detail belongs in each adapter's own params type.
