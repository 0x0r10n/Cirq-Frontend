# API — the surface the Replit frontend calls

Location: `artifacts/api-server` (already scaffolded as an Express 5 app in
this monorepo — extend it, don't create a second server).

## Jurisdiction gating — at the edge, not an afterthought

Excluded: **US persons**, plus CA, UK, and others named by the product/
legal spec (track the authoritative exclusion list in this doc as it's
confirmed — it is itself a value someone must supply and confirm, not one
to guess at). Gating happens as middleware in front of every route that
can produce a payload or reveal a position, before any handler runs —
never as a check bolted onto individual handlers, since a new route added
later must not be able to forget it. An unauthenticated jurisdiction
signal (e.g. IP-based) can gate the read-only opportunity scan, but
onboarding into anything that produces a payload requires an affirmative,
recorded jurisdiction attestation from the user, not IP inference alone —
IP inference is trivially bypassed by anyone determined to lie, so it is a
speed bump for casual cases, not the compliance control itself.

## Route surface

Built (`artifacts/api-server/src/routes/`):

- `GET /api/healthz` — pre-existing, no gating.
- `GET /api/opportunities` — calls `CirqAgentTools.scanOpportunities`. No
  jurisdiction gate (read-only, per the rule above); returns `503
  not_configured` while `lib/cirq-config` isn't filled in yet, rather than
  a generic crash — verified by actually booting the server (see
  `contracts/README.md`-style caveat: this route *is* tested end-to-end,
  unlike the contracts).
- `POST /api/prepare/entry`, `POST /api/prepare/exit` — behind
  `requireJurisdictionAttestation` (`src/middlewares/jurisdiction.ts`),
  then call `CirqAgentTools.prepareEntry`/`prepareExit`. `amountIn`
  travels over JSON as a decimal string (JSON has no bigint) and is parsed
  to `bigint` before reaching the agent layer; the response's payload
  `value` is serialized back to a string for the same reason.

Not yet built — deliberately left as a follow-up rather than guessed at:

- `GET /api/positions/:address` — blocked on `CirqAgentTools.getPosition`,
  which itself is blocked on real per-venue position reads (needs live
  ABIs — see `INTEGRATIONS.md`).
- `POST /api/agent/chat` — the streaming "Ask Cirq anything" surface.
  Needs the WS vs SSE decision (`DECISIONS.md`) and an actual LLM
  tool-calling loop wired to `CirqAgentTools`, neither of which exists
  yet.

Every payload-producing route requires the `x-cirq-jurisdiction` header as
a placeholder wire format for an affirmative jurisdiction attestation —
checked before the request ever reaches the agent layer, so a rejected
user never triggers a fork simulation or touches an adapter. A real
implementation should look up a recorded attestation tied to the
authenticated user rather than trusting a client-supplied header
verbatim — see the docstring in `src/middlewares/jurisdiction.ts`.

## WS surface

The agent chat panel needs a streaming channel (tokens as they're
generated, plus tool-call/tool-result events so the frontend can render
"Cirq is checking Chainlink…" style progress). Reuse whatever WS/SSE
mechanism is simplest against Express 5 rather than introducing a second
server process — document the concrete choice in `DECISIONS.md` once
made.

## Error shape

Every error response is `{ error: "<code>", message: "<human-readable>" }`.
Built so far: `jurisdiction_attestation_required` / `jurisdiction_excluded`
(403), `invalid_request` (400, request body failed validation),
`not_configured` (503, `lib/cirq-config` isn't ready — `GET
/opportunities` only), `prepare_failed` (422, covers registry rejection,
adapter "not implemented yet", and failed fork simulation alike for now —
splitting `prepare_failed` into more specific codes, e.g.
`registry_rejected` vs `simulation_failed`, is a reasonable follow-up once
the frontend needs to render them differently).
