# Agent tools — the tool contract, and the never-sign rule

Location: `lib/cirq-agent`. Tool-calling orchestration over the
integrations in `lib/integrations/*` and the risk engine in
`RISK-CURATION.md`.

## The rule this whole doc exists to protect

**The agent never signs.** There is no `sign`, `send`, `transfer`,
`broadcast`, or any tool with write access to a private key or a relayer
that could move funds, anywhere in the agent's tool surface. This is
enforced by omission (the tool never exists) and backstopped on-chain by
`CirqAgentPolicy` (`SECURITY-CAGE.md`) — belt and suspenders, deliberately
redundant.

Every tx-producing tool returns three things together, never a bare
payload:
1. **An unsigned payload** — calldata (or UserOperation) ready for the
   user's wallet to sign, produced by the relevant `lib/integrations/*`
   adapter.
2. **A plain-language explanation** — what this action does, in terms a
   non-technical user can act on ("supplies 1,000 USDG to Morpho Blue's
   USDG/wstETH market at ~63% LTV"), not a restatement of the calldata.
3. **A risk summary** — from `RISK-CURATION.md`'s risk engine, computed
   against a **fork simulation of this exact payload**, not a generic
   protocol-level risk score.

## Tool surface (indicative)

Read tools (no payload, safe to call freely):
- `scanOpportunities(filters)` — curated + risk-scored opportunities
  across all four venues.
- `getPosition(address)` — current positions, valued via Chainlink.
- `explainOpportunity(id)` — plain-language detail on one opportunity
  before committing to prepare a payload for it.

Payload-producing tools (always return payload + explanation + risk
summary together, always fork-simulated first):
- `prepareEntry(opportunityId, amount)`
- `prepareExit(positionId)`
- `prepareLoopEntry(templateId, amount)` (Loopr-backed)

Every payload-producing tool internally: (a) checks the target venue/token
against `CirqRegistry` before building anything, (b) builds calldata via
the matching `lib/integrations/*` adapter, (c) runs the fork simulation
required by `SECURITY-CAGE.md` invariant 5, (d) attaches the risk summary,
(e) returns — and never proceeds to (e) if the fork simulation reverts or
the registry check fails; it returns a clear failure explanation instead.

## Model/runtime notes

Tool-calling orchestration is TypeScript (see `DECISIONS.md`). Keep tool
schemas small and typed (zod, matching the rest of the monorepo's
convention in `lib/api-zod`) so a malformed or adversarial tool call from
a compromised or misbehaving model fails validation before it reaches an
adapter, rather than reaching one with bad arguments.
