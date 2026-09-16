# Live values — the ⚠️ FILL IN registry

Every value below is unknown to this codebase on purpose. None of them are
guessed or hardcoded anywhere outside `lib/cirq-config`. Each has a slot in
`lib/cirq-config/addresses.example.json` whose placeholder starts with the
literal string `⚠️ FILL IN`. Copy that file to `lib/cirq-config/addresses.json`
(git-ignored) and replace every placeholder before anything can run against
a live chain.

Chain: **Robinhood Chain** — Arbitrum Orbit L2, chain ID **4663**, ETH for
gas, settles to Ethereum. (This one fact is verified as of Sep 2026 and is
the only "chain fact" treated as safe to hardcode as a constant, in
`lib/cirq-config/src/chain.ts` — everything else below is per-deployment
and must come from config.)

| Value | Where to get it | Config key |
|---|---|---|
| RPC URL, bundler URL, paymaster URL | Alchemy (or ZeroDev) dashboard, chain 4663 | `rpc.url`, `rpc.bundlerUrl`, `rpc.paymasterUrl` |
| `CirqRegistry` + `CirqAgentPolicy` addresses | **Not a third-party value** — output of running `contracts/script/Deploy.s.sol` | `cirq.registry`, `cirq.policy` |
| USDG address + decimals | Chain explorer for 4663 | `tokens.USDG.address`, `tokens.USDG.decimals` |
| Stock token addresses + decimals + `uiMultiplier` | Chain explorer; confirm any display multiplier | `tokens.stocks[]` |
| Chainlink feed addresses (per asset) | Chainlink's feed registry for chain 4663 | `chainlink.feeds[]` — **required, the only primary price source** |
| Morpho Blue core contract address + ABI | Morpho's deployment registry for chain 4663; ABI from Morpho's published SDK/docs for the deployed version | `protocols.morpho.core`, `protocols.morpho.abiPath` |
| Longbow market addresses (~42 isolated markets) + MCP endpoint URL | Longbow app/docs | `protocols.longbow.markets[]`, `protocols.longbow.mcpUrl` |
| Loopr router address + ABI | Loopr app/docs | `protocols.loopr.router`, `protocols.loopr.abiPath` |
| Uniswap v4 PoolManager + Universal Router addresses + ABIs | Uniswap deployment registry for chain 4663; ABIs from Uniswap's published `v4-core`/`universal-router` packages for the deployed version | `protocols.uniswap.poolManager`, `protocols.uniswap.universalRouter`, `protocols.uniswap.poolManagerAbiPath`, `protocols.uniswap.universalRouterAbiPath` |
| Per-market LTV caps (~63% typical — verify, do not assume) | Read on-chain per market | `protocols.*.markets[].ltvCapBps` |
| Pool allowlist-hook status per stock token pool | Check whether each pool applies a v4 allowlist hook | `tokens.stocks[].poolAllowlisted` — decides only whether the agent wallet needs allowlisting, never whether Cirq deploys a pool |

ABI files referenced by `*.abiPath` live under `lib/integrations/abis/` and,
unlike `addresses.json`, **are** committed once real — an ABI isn't a
secret or a per-environment value, it's the protocol's public interface.
Until filled in, each file is a placeholder `lib/cirq-config` rejects at
load time (see `lib/cirq-config/schema.md`).

## How the loader protects this

`lib/cirq-config` (see [`../../lib/cirq-config/schema.md`](../../lib/cirq-config/schema.md)):

- Treats any string value starting with `⚠️` as **absent**, not present.
- On startup, validates the whole tree and exits non-zero with a message
  listing every missing key by its full dotted path — never a generic
  "config invalid".
- Rejects a placeholder or empty ABI file at the point it's loaded, not
  silently downstream.
- Nothing outside `lib/cirq-config` may contain a raw `0x...` address
  literal or an inline ABI array — see the lint rule described in
  `ENV.md` / repo CI. If you find yourself typing a hex address in
  `contracts/`, `agent/`, `api/`, or `lib/integrations/`, stop and add a
  config key instead.
