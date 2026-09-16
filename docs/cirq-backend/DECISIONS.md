# Decisions

## Language for agent + API: TypeScript

The spec left this open (Solidity + Foundry for contracts is fixed; agent
and API could be TypeScript or Python). Deciding TypeScript, for reasons
specific to this repo rather than in the abstract:

- This is an existing pnpm/TypeScript monorepo. `artifacts/api-server`
  (Express 5) already exists and is the natural home for the API layer —
  starting it over in Python would mean running two runtimes for one
  product instead of one.
- `lib/api-zod` and `lib/db` (Drizzle) are already TypeScript and already
  shared with the frontend's type surface; keeping the agent/API in the
  same language lets them share those packages directly instead of
  re-deriving schemas across a language boundary.
- viem/wagmi (TS-native) are the natural fit for building unsigned
  calldata/UserOperations against an ERC-4337 + EIP-7702 + ERC-7715 stack.
- Longbow's MCP endpoint and the other three protocols' SDKs are usable
  from TypeScript without a wrapper layer.

Python's stronger sim/quant libraries were the real counterargument, but
nothing in `RISK-CURATION.md`'s scope (Chainlink-priced LTV/liquidation
math, fork simulation via an RPC call, rule-based curation scoring) needs
numerical tooling TypeScript can't do — this can be revisited if the risk
engine later needs something Python-specific (e.g. a real statistical
model), as an isolated service behind a typed boundary, not a rewrite of
the rest.

## Backend location: inside this monorepo, not a separate repo

The original spec assumed "unzip into an empty repo." This backend
instead lives inside `wraptfinance/Cirq-Frontend` as new workspace
packages (`lib/cirq-config`, `lib/cirq-agent`, `lib/cirq-risk`,
`lib/integrations/*`, `contracts/`, plus extending `artifacts/api-server`)
— the user's explicit choice, made when this build started, to keep
frontend and backend in one repo rather than stand up a second one.

## `CirqAgentPolicy` design choices made while implementing the cage

- **No adapter-agnostic "recipient" parameter, ever.** `IAdapter.act` takes
  `owner` and moves funds only to/from `owner` — there is no separate
  destination argument anywhere in the call path. This makes "cannot
  withdraw to an arbitrary address" hold structurally (no calldata a
  compromised session key can construct has a slot for a different
  address) instead of relying on parsing or allowlisting per-adapter
  calldata. Trade-off: every real integration adapter
  (`INTEGRATIONS.md`) must be written to fit this fixed shape — a
  protocol whose native interface takes a recipient will need its adapter
  to hardcode `owner` as that recipient internally, never pass through
  whatever the caller supplies.
- **Daily-cap accounting: epoch-day** (`block.timestamp / 1 days`), not a
  rolling 24h window. Simpler to reason about and test; the trade-off is a
  key granted late in a UTC day can trade up to the daily cap twice within
  a few hours straddling midnight UTC. Revisit if that's judged a real
  risk.
- **Trading window: absolute epoch start/end** (`windowStart`/`windowEnd`
  timestamps), not a recurring daily/hourly mask. Simplest to implement
  and test correctly; a recurring window (e.g. "9am–5pm every day") would
  need to be re-derived as a fresh absolute range each time it's granted
  or renewed — left as a follow-up if a recurring window turns out to be
  what the product actually needs.
- **Belt and suspenders on tokens**: `execute` requires a token be both
  in the owner's own whitelist (set via `grantSessionKey`) *and* on
  `CirqRegistry`'s global allowlist — either being wrong alone isn't
  enough to let a bad token through.

## Still open (fill in as they're made)

- Session-key policy reference pattern actually forked for
  `CirqAgentPolicy` (Vigiles / Aegis / Primer Vault) — the contract here
  was written from the invariants directly, not from reading one of those
  three; compare against whichever is available and reconcile.
- WS vs SSE for the agent chat streaming surface in `API.md`.
- The specific jurisdiction-exclusion list beyond US/CA/UK named in the
  spec, once legal confirms it.
- `contracts/` has not been compiled or tested — Foundry could not be
  installed in the sandbox that wrote this code (network policy blocks
  `foundry.paradigm.xyz`). `forge build && forge test` need to be run
  wherever Foundry is actually reachable before treating the contracts as
  more than a careful scaffold. See `../../contracts/README.md`.
