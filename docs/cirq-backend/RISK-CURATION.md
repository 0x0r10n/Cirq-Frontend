# Risk + curation

Location: `lib/cirq-risk`. Consumed by `lib/cirq-agent` (for per-payload
risk summaries) and by `artifacts/api-server`'s opportunity scan route
(for curated, pre-scored listings).

Two distinct jobs live here — keep them as two modules even if they ship
in one package, since they answer different questions:

## 1. Position risk

Answers: "if I hold this position, what can go wrong and how close am I to
it?" Always priced off **Chainlink**, never pool TWAP (`SECURITY-CAGE.md`
invariant 4 — pool TWAP is manipulable within a block and must never
enter risk math, not even as a fallback when a Chainlink feed is briefly
stale; a stale-feed condition is itself a risk signal to surface, not a
reason to fall back to a worse price source).

For a lending/loop position: current LTV vs. the market's actual on-chain
cap (never an assumed ~63% — read the real number per `LIVE-VALUES.md`),
distance to liquidation in both price-move and time terms where the venue
exposes a rate schedule, and a plain-language summary of what happens if
the position is a fork-simulated stress scenario (e.g. "a 10% drop in
collateral price would bring this to 71% LTV, above the 63% cap").

For every payload `lib/cirq-agent` prepares: this module's fork simulation
(`SECURITY-CAGE.md` invariant 5) runs first, and the risk summary attached
to the payload is computed from that simulation's actual resulting state,
not from a pre-trade estimate.

## 2. Curation / legitimacy scoring — "the Noxa lesson"

Answers: "should this opportunity be surfaced to a user at all?" This
exists because a yield surface that mechanically lists "highest APY first"
is an attack surface — the referenced Noxa incident is the cautionary case
this module is named for; the specific incident report isn't part of this
spec, but the lesson it stands for is: an anomalously high, newly-listed,
or thinly-verified opportunity must be scored down or held back, not
ranked to the top just because the number is big. Whoever has access to
that incident writeup should fold its specific red flags into this
module's scoring rubric — treat that as an open item to fill in, not
something to guess at.

Curation inputs (compose into a score, don't gate on any single one in
isolation):
- Is the venue/token on `CirqRegistry`'s allowlist at all (hard gate, not
  a score input).
- Time the market/pool has existed on-chain and its historical volume
  stability, not just its current TVL snapshot.
- Whether the yield is explainable by a real mechanism visible in the
  adapter's read data (a lending spread, a fee tier, a documented
  incentive) versus unexplained.
- Concentration risk (a handful of addresses accounting for most of a
  pool's liquidity is a red flag, not a neutral fact).

Curation score gates *ranking and surfacing*, never the hard on-chain
allowlist gate — an opportunity failing curation is simply not shown or
ranked low; it is `CirqRegistry`, not this module, that enforces what the
agent is even capable of touching.
