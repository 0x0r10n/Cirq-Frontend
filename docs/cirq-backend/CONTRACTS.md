# Contracts — the only two Cirq deploys

Solidity + Foundry, non-negotiable (this is an EVM L2). Location:
`contracts/` at the repo root (a Foundry project, not a pnpm package —
Foundry has its own toolchain and dependency manager).

Everything below is a scaffold-level design derived from the spec's rules
and the invariants in `SECURITY-CAGE.md`. Exact struct packing, gas
optimization, and the specific reference pattern to fork are implementation
choices for whoever writes the Solidity — record real decisions in
`DECISIONS.md` as they're made. No address, feed ID, or ABI in this file or
in the contracts themselves is a live value; all of that comes from
`lib/cirq-config` at deploy time via the deploy script's config injection,
never hardcoded in `.sol` source.

## `CirqRegistry`

Curated allowlist + pause switch. This is the only place Cirq expresses an
opinion about which venues/tokens/markets the agent is allowed to touch —
it is a list, not a market.

Responsibilities:
- Maintain an allowlist of: tradeable tokens, integration adapters
  (Morpho/Longbow/Loopr/Uniswap adapter addresses), and per-market
  parameters needed for policy checks (e.g. which markets are currently
  curated as "safe enough to surface").
- Global pause: an owner-controlled switch that halts all agent-initiated
  activity across every venue at once, for incident response. Pausing
  must not affect a user's ability to withdraw or act directly themselves
  — it only gates the agent's automated path.
- Owner-gated add/remove for allowlist entries, with events for every
  change (the frontend and any monitoring tooling depend on these events
  for an audit trail).
- Read functions the policy contract and the off-chain agent both call to
  check "is X allowed" before building or accepting a payload.

Non-goals: `CirqRegistry` never holds user funds, never receives token
transfers, and never has swap/deposit/withdraw logic. It is a list plus a
switch.

## `CirqAgentPolicy` — the ERC-7715 cage

Implements the session-key policy described in `SECURITY-CAGE.md`. Forks
the shape of a proven session-key pattern rather than inventing custody —
see `SECURITY-CAGE.md` for the named reference patterns.

State (indicative, not final):
- Per-owner (per-user) policy: whitelisted token set, allow-listed adapter
  set (cross-checked against `CirqRegistry`), per-trade cap, daily cap
  (with a rolling or epoch-day accounting scheme — decide and document
  which, since this affects the caps-composition test in
  `SECURITY-CAGE.md`), trading window (start/end, or day-of-week/hour
  mask — pick one and document it), and a **policy epoch** counter.
- A session key is granted scoped to a policy epoch. Any execution path
  checks the caller's key against the **current** epoch at execution time,
  never at grant time — this is what makes revoke instant.
- Revoke = owner bumps the epoch. No key enumeration or explicit
  revocation list is required if every check is epoch-gated.

Function surface (indicative):
- `grantSessionKey(...)` — owner-only, sets/updates the policy for a
  session key.
- `revoke()` — owner-only, bumps the epoch, wipes all outstanding keys for
  that owner in one call.
- `execute(...)` / `validateAndExecute(...)` — the ERC-7715-compatible
  entrypoint the session key calls through; enforces token whitelist,
  adapter allowlist (via `CirqRegistry`), per-trade cap, daily cap,
  trading window, and current epoch, in that order, reverting on the
  first failed check with a distinct error per check (tests assert on
  the specific revert reason, not just "it reverted").
- No function on this contract can ever move funds to an address that
  isn't the policy owner's own configured destination set (see
  `SECURITY-CAGE.md` invariant 2) — this is the one property every other
  design decision must preserve.

## Deployment

Deploy scripts (`contracts/script/`) read every address/ID they need from
`lib/cirq-config`, never inline. A deploy to testnet is not blocked on
having every `LIVE-VALUES.md` slot filled — but a deploy to mainnet is,
and the deploy script should refuse to run against a mainnet RPC while any
config value is still a `⚠️ FILL IN` placeholder.
