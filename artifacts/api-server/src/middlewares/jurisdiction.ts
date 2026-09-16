import type { NextFunction, Request, Response } from "express";

/**
 * Jurisdiction gating — see docs/cirq-backend/API.md. US persons are
 * excluded, plus CA and GB named in the spec; extend this set once legal
 * confirms the full list (docs/cirq-backend/DECISIONS.md tracks this as
 * still open) — never narrow it without the same confirmation.
 */
export const EXCLUDED_JURISDICTIONS = new Set(["US", "CA", "GB"]);

const JURISDICTION_HEADER = "x-cirq-jurisdiction";

/**
 * Required on every route that can produce a payload or reveal a position.
 * Reads an affirmative, recorded jurisdiction attestation — never inferred
 * from IP alone, since that's trivially bypassed by anyone determined to
 * lie and is not the compliance control itself (see API.md). The header is
 * a placeholder wire format for that attestation; a real implementation
 * should look up a recorded attestation tied to the authenticated user
 * rather than trusting a client-supplied header verbatim.
 */
export function requireJurisdictionAttestation(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const jurisdiction = req.header(JURISDICTION_HEADER);

  if (!jurisdiction) {
    res.status(403).json({
      error: "jurisdiction_attestation_required",
      message:
        "This action requires a recorded jurisdiction attestation before Cirq will prepare it.",
    });
    return;
  }

  if (EXCLUDED_JURISDICTIONS.has(jurisdiction.toUpperCase())) {
    res.status(403).json({
      error: "jurisdiction_excluded",
      message: "Cirq is not available in your jurisdiction.",
    });
    return;
  }

  next();
}
