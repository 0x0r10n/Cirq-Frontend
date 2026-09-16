# Environment variables + secrets

Existing (per root `replit.md`):
- `DATABASE_URL` — Postgres connection string (`lib/db`, Drizzle).

New, for the backend build (names indicative — finalize alongside
`lib/cirq-config` implementation):

| Variable | Purpose | Secret? |
|---|---|---|
| `CIRQ_CONFIG_PATH` | Path to `addresses.json` (defaults to `lib/cirq-config/addresses.json`) | No |
| `ALCHEMY_API_KEY` (or `ZERODEV_*` if that path is chosen) | RPC/bundler/paymaster auth for chain 4663 | **Yes** |
| `ANTHROPIC_API_KEY` (or whichever model provider `lib/cirq-agent` calls) | Agent model calls | **Yes** |
| `LONGBOW_MCP_URL` | Longbow's MCP endpoint, if not folded into `addresses.json` | No (URL), pair with an auth secret if Longbow requires one |
| `FORK_RPC_URL` | RPC used for the mandatory pre-payload fork simulation (`SECURITY-CAGE.md` invariant 5) — may equal the main RPC or a dedicated fork provider | No (URL), auth via its own key if required |
| `JURISDICTION_ATTESTATION_SECRET` | Signs/verifies recorded jurisdiction attestations at the API edge (`API.md`) | **Yes** |

Rules:
- No secret above is ever committed. `addresses.json` (filled) and any
  `.env` are git-ignored — verify `.gitignore` covers both before first
  fill-in.
- `addresses.example.json` (committed) contains only `⚠️ FILL IN`
  placeholders and non-secret shape — never a real key, even a testnet
  one.
- Secrets are read once at process startup through the same
  fail-loudly-on-missing pattern as `lib/cirq-config` (see
  `LIVE-VALUES.md`), not scattered `process.env.X` reads through the
  codebase.
