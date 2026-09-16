import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AddressesSchema,
  type ResolvedCirqAddressesConfig,
} from "./schema.js";

const FILL_IN_PREFIX = "⚠️";

/** Keys whose value must be a 0x-prefixed 40-hex address once filled in. */
const ADDRESS_KEYS = new Set([
  "address",
  "core",
  "router",
  "poolManager",
  "universalRouter",
]);

/** Keys whose value must be a well-formed URL once filled in. */
const URL_KEYS = new Set(["url", "bundlerUrl", "paymasterUrl", "mcpUrl"]);

/** Keys whose value is a live number, range-checked once filled in. */
const NUMERIC_RANGE_CHECKS: Partial<Record<string, (n: number) => boolean>> = {
  decimals: (n) => Number.isInteger(n) && n > 0,
  uiMultiplier: (n) => n > 0,
  ltvCapBps: (n) => Number.isInteger(n) && n >= 0 && n <= 10_000,
};

const HEX_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export function isFillIn(value: string): boolean {
  return value.startsWith(FILL_IN_PREFIX);
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Recursively walks a parsed config tree collecting every `⚠️ FILL IN`
 * placeholder (by dotted path) and every filled-in value that fails a
 * basic address/URL format check. Generic over the tree shape so adding a
 * field to schema.ts never requires touching this walker.
 */
function collectIssues(
  node: unknown,
  segments: string[],
  missing: string[],
  malformed: string[],
): void {
  if (node === null || node === undefined) return;

  if (Array.isArray(node)) {
    node.forEach((item, i) =>
      collectIssues(item, [...segments, String(i)], missing, malformed),
    );
    return;
  }

  if (typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      const dotted = [...segments, key].join(".");
      const numericCheck = NUMERIC_RANGE_CHECKS[key];
      if (typeof value === "string") {
        if (isFillIn(value)) {
          missing.push(dotted);
        } else if (ADDRESS_KEYS.has(key) && !HEX_ADDRESS_RE.test(value)) {
          malformed.push(
            `${dotted}: expected a 0x-prefixed 40-hex address, got ${JSON.stringify(value)}`,
          );
        } else if (URL_KEYS.has(key) && !isValidUrl(value)) {
          malformed.push(
            `${dotted}: expected a valid URL, got ${JSON.stringify(value)}`,
          );
        } else if (numericCheck) {
          malformed.push(
            `${dotted}: expected a number, got the non-placeholder string ${JSON.stringify(value)}`,
          );
        }
      } else if (typeof value === "number") {
        if (numericCheck && !numericCheck(value)) {
          malformed.push(`${dotted}: value ${value} is out of range`);
        }
      } else {
        collectIssues(value, [...segments, key], missing, malformed);
      }
    }
  }
}

/**
 * Walks upward from `startDir` looking for `pnpm-workspace.yaml`, the
 * monorepo root marker.
 */
function findMonorepoRoot(startDir: string): string | undefined {
  let dir = startDir;
  for (;;) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

/**
 * Resolved from `process.cwd()` upward to the monorepo root, not from this
 * module's own `import.meta.url` — a consumer like `artifacts/api-server`
 * bundles this package into a single file at build time (esbuild,
 * `bundle: true`), which rewrites `import.meta.url` to point at that
 * bundle's own location instead of `lib/cirq-config`'s real directory.
 * Walking up from cwd instead works the same whether this code is running
 * from source (tests, ts-node) or bundled into another package's dist.
 */
function defaultConfigPath(): string {
  const root = findMonorepoRoot(process.cwd());
  if (root) {
    return path.join(root, "lib", "cirq-config", "addresses.json");
  }
  // Fallback for cwd being outside the repo entirely — only reliable when
  // running this file unbundled from source.
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "addresses.json");
}

/**
 * Loads and validates lib/cirq-config/addresses.json (or the path given).
 * Throws, listing every missing or malformed value by dotted path, rather
 * than returning a partial or best-effort config. See
 * docs/cirq-backend/LIVE-VALUES.md for what each value is and where to
 * source it.
 */
export function loadCirqConfig(
  configPath?: string,
): ResolvedCirqAddressesConfig {
  const resolvedPath =
    configPath ?? process.env.CIRQ_CONFIG_PATH ?? defaultConfigPath();

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(
      `Cirq config not found at ${resolvedPath}. Copy ` +
        `lib/cirq-config/addresses.example.json to addresses.json and fill ` +
        `in every ${FILL_IN_PREFIX} placeholder — see ` +
        `docs/cirq-backend/LIVE-VALUES.md.`,
    );
  }

  const raw: unknown = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
  const structural = AddressesSchema.safeParse(raw);
  if (!structural.success) {
    const lines = structural.error.issues.map(
      (issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`,
    );
    throw new Error(
      `Cirq config at ${resolvedPath} is structurally invalid:\n${lines.join("\n")}`,
    );
  }

  const missing: string[] = [];
  const malformed: string[] = [];
  collectIssues(structural.data, [], missing, malformed);

  if (missing.length > 0 || malformed.length > 0) {
    const lines: string[] = [];
    if (missing.length > 0) {
      lines.push(
        `Missing ${missing.length} live value(s) — see docs/cirq-backend/LIVE-VALUES.md:`,
      );
      missing.forEach((p) => lines.push(`  - ${p}`));
    }
    if (malformed.length > 0) {
      lines.push(`Malformed value(s):`);
      malformed.forEach((m) => lines.push(`  - ${m}`));
    }
    throw new Error(
      `Cirq config at ${resolvedPath} is not ready:\n${lines.join("\n")}`,
    );
  }

  // Safe: collectIssues has already proven every fillableNumber field holds
  // an in-range number, not a placeholder string, so the shape now matches
  // ResolvedAddressesSchema exactly — this cast just gives callers the
  // narrower, placeholder-free type instead of re-validating what was just
  // validated above.
  return structural.data as unknown as ResolvedCirqAddressesConfig;
}

/**
 * Loads an ABI JSON file, rejecting a missing, empty, or placeholder ABI
 * the same way `loadCirqConfig` rejects a placeholder address.
 */
export function loadAbi(abiPath: string): unknown[] {
  const resolved = path.resolve(abiPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`ABI file not found at ${resolved}.`);
  }
  const raw = fs.readFileSync(resolved, "utf-8").trim();
  if (raw.length === 0 || isFillIn(raw)) {
    throw new Error(
      `ABI file at ${resolved} is empty or a placeholder — fill in the real ABI before use.`,
    );
  }
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(
      `ABI file at ${resolved} must be a non-empty JSON array.`,
    );
  }
  return parsed;
}
