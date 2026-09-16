# Cirq contracts

Foundry project. Two contracts only — see
`../docs/cirq-backend/CONTRACTS.md` and `../docs/cirq-backend/SECURITY-CAGE.md`
for the design rationale and invariants these enforce.

## ⚠️ Not yet built or tested in this environment

This sandbox's network policy blocks `foundry.paradigm.xyz`, so Foundry
could not be installed here — `forge build` and `forge test` have **not**
been run against this code. Treat the `.sol` files as a careful,
reasoned-through scaffold, not verified-working contracts, until someone
runs the steps below somewhere Foundry is reachable (a local machine,
Replit, or CI).

## Setup

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
cd contracts
forge install foundry-rs/forge-std --no-commit
forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge build
forge test -vvv
```

## Deploying

```bash
forge script script/Deploy.s.sol --rpc-url <rpc> --broadcast
```

The deploy script reads every address it needs from
`../lib/cirq-config/addresses.json` (see `../docs/cirq-backend/LIVE-VALUES.md`)
and refuses to run if any value is still a `⚠️ FILL IN` placeholder.
