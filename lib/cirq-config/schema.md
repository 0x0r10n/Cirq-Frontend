# Config schema + startup validation rules

`src/schema.ts` defines the zod shape validated at startup by `src/load.ts`.
See `../../docs/cirq-backend/LIVE-VALUES.md` for what each value is and
where a human sources it.

## The `⚠️ FILL IN` rule

Any string value that starts with the literal `⚠️` is treated as **absent**,
not present — even though it parses as a non-empty string. `src/load.ts`
walks the parsed config tree after zod parsing and collects the dotted
path of every such value plus every zod validation error, then:

- If the list is non-empty, **throws** with every missing/invalid path
  listed by name, in one message — never a partial config and never a
  generic "config invalid."
- If the list is empty, returns a fully-typed, ready-to-use config object.

## Address + ABI hygiene

- Every address field is validated as a checksummed `0x`-prefixed 40-hex
  string (or the `⚠️ FILL IN` placeholder) — a syntactically wrong address
  fails the same loud way as a missing one.
- ABI fields are paths to a file under `lib/integrations/abis/` (not
  inline arrays in `addresses.json`), and `load.ts`'s `loadAbi` rejects a
  referenced ABI file that is missing, empty, or a placeholder — an ABI is
  "live" the same way an address is. A placeholder ABI file is **raw
  text** starting with `⚠️` (not a JSON-encoded string) — `loadAbi` checks
  the file's raw bytes before attempting `JSON.parse`, so a
  quoted `"⚠️ FILL IN"` string would defeat the check.
- No file outside `lib/cirq-config` may contain a raw `0x` address literal
  or an inline ABI array. This isn't currently enforced by an automated
  lint rule in this repo — add one (e.g. an ESLint `no-restricted-syntax`
  rule, or a small repo script run in CI) before this package is depended
  on by `contracts/` deploy scripts, `lib/integrations/*`, or
  `lib/cirq-agent`, so the rule holds mechanically rather than by
  convention alone.

## Adding a new live value

1. Add the field to `src/schema.ts` (zod).
2. Add its placeholder (`"⚠️ FILL IN — <where to get it>"`) to
   `addresses.example.json`.
3. Add a row to `../../docs/cirq-backend/LIVE-VALUES.md`.
4. Never add a default value for it in `src/schema.ts` — a live value with
   a fallback default is exactly the "guessed address" this package exists
   to prevent.
