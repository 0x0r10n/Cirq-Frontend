# Cirq Backend — read-order map

Read these in order before writing or reviewing backend code. This index,
and every doc it points to, lives in this monorepo (not a separate repo) —
the frontend (`artifacts/cirq`) and backend share `lib/*` and `artifacts/*`
workspace conventions.

1. **This file** — orientation.
2. [`LIVE-VALUES.md`](./LIVE-VALUES.md) — every on-chain value the spec
   cannot know, and where a human fills it in. Read before touching
   `lib/cirq-config`.
3. [`SECURITY-CAGE.md`](./SECURITY-CAGE.md) — the threat model the two
   contracts enforce. Read before touching `contracts/`.
4. [`CONTRACTS.md`](./CONTRACTS.md) — `CirqRegistry` and `CirqAgentPolicy`
   in detail.
5. [`INTEGRATIONS.md`](./INTEGRATIONS.md) — integrate-don't-rebuild
   boundaries for Uniswap v4/UniswapX, Morpho Blue, Longbow, Loopr.
6. [`AGENT-TOOLS.md`](./AGENT-TOOLS.md) — the tool contract; the
   never-sign rule.
7. [`API.md`](./API.md) — HTTP/WS surface the frontend calls; jurisdiction
   gating.
8. [`RISK-CURATION.md`](./RISK-CURATION.md) — position risk math and
   opportunity legitimacy scoring.
9. [`DECISIONS.md`](./DECISIONS.md) — recorded build decisions (language
   choice, etc).
10. [`ENV.md`](./ENV.md) — required environment variables and secrets.

## The two rules everything else follows

1. **Cirq deploys no pools and no liquidity of its own.** It composes over
   venues that already exist. Exactly two contracts are Cirq's own:
   `CirqRegistry` and `CirqAgentPolicy`. If a change looks like writing a
   pool, an AMM, a lending market, or a bespoke loop executor — stop, that
   already exists at one of the integrated protocols.
2. **Never invent on-chain facts.** Addresses, ABIs, LTV caps, Chainlink
   feed IDs, and pool allowlist status are live values this repo cannot
   know from a spec. They are `⚠️ FILL IN` slots in
   `lib/cirq-config/addresses.example.json`. Code reads them from config
   and fails loudly if they're missing — it never hardcodes a guess.

## Provenance note

These docs were authored from the project's `CLAUDE.md` build spec and its
companion `.docx` (the human-readable summary), not from a separate
`cirq-backend-spec.zip` bundle — none was provided. Where the source
material didn't specify a concrete detail (exact endpoint shapes, exact
tool argument schemas), this doc set makes a reasonable, clearly-labeled
choice rather than inventing on-chain facts. Anything load-bearing for
safety (the cage invariants, the never-sign rule, Chainlink-only pricing)
is carried over verbatim from the source spec.
