# The security cage

Threat model: **assume the agent is fully compromised** (prompt injection,
leaked key material, malicious tool output, a hostile model swap — doesn't
matter which). The question the cage answers is: what can an attacker who
fully controls the agent's session key actually do on-chain? The answer
must be "not much, and never irreversible theft," enforced by a contract,
not by the agent's good behavior.

## The guarantee, as a table

| A compromised agent CAN | It CANNOT |
|---|---|
| Trade whitelisted tokens for whitelisted tokens | Withdraw to any arbitrary address |
| Route only through allow-listed adapters | Touch balances outside policy scope |
| Act under per-trade + daily caps, inside the trading window | Use a non-allowlisted venue or token |
| Attach a rationale to each action (for the user's audit trail) | Act after the owner revokes (an epoch bump wipes the key instantly) |

## Non-negotiable invariants (assert every one in Foundry tests)

1. The agent can produce payloads but can **never** sign or move funds on
   its own. There is no `sign`, `send`, or `transfer` tool anywhere in the
   agent's tool surface — see `AGENT-TOOLS.md`. This is enforced twice:
   once by omission at the agent layer, once by the on-chain cage even if
   the agent layer were somehow bypassed.
2. A fully compromised session key can only trade whitelisted tokens,
   through allow-listed adapters, under per-trade and daily caps, inside
   the configured trading window. It can never withdraw to an arbitrary
   address, touch balances outside the policy's scope, or route through a
   venue that isn't allow-listed.
3. Owner revoke — bumping the policy epoch — wipes the session key
   immediately; no in-flight or future call under the old epoch succeeds.
4. All price, LTV, and liquidation math reads **Chainlink**, never pool
   TWAP. Pool TWAP is manipulable within a single block/flash-loan; it is
   never a primary price source anywhere in risk math (`RISK-CURATION.md`).
5. Every significant action is simulated on a fork **before** a payload is
   ever handed back to the user to sign.
6. No US person (also CA, UK, and the other excluded jurisdictions per
   `API.md`) can onboard. Jurisdiction gating happens at the API edge, not
   as an afterthought in the agent.

## Contract-level enforcement — `CirqAgentPolicy`

This is the ERC-7715 session-key policy cage. Rather than inventing a new
custody model, it forks the shape of a proven session-key policy pattern
(the spec names **Vigiles / Aegis / Primer Vault** as reference designs —
read whichever of those is available before writing the cage, and note in
`DECISIONS.md` which pattern was actually followed and why). See
`CONTRACTS.md` for the concrete state layout and function surface.

Foundry test suite must include, at minimum, one test per invariant above
plus:
- A "compromised agent cannot escape" test that grants a session key,
  simulates an attacker calling every function with adversarial arguments
  (arbitrary recipients, non-whitelisted tokens, non-allow-listed venues,
  amounts over both caps, calls outside the trading window, calls after
  revoke), and asserts every one reverts.
- A caps test asserting per-trade and daily caps compose correctly (e.g.
  two trades each under the per-trade cap but summing over the daily cap
  must revert on the second).
- A revoke test asserting a call signed under session key epoch N reverts
  once the owner bumps to epoch N+1, even if the call was already
  in-flight (i.e. epoch is checked at execution time, not grant time).

## Audit gate

A formal audit of both contracts precedes any mainnet capital. Testnet
deployment and Foundry-green invariants are the phase-1 bar; mainnet is a
separate, explicit gate — do not treat "tests pass" as "ready for real
funds."
