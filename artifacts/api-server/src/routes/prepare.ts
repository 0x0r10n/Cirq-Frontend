import { Router, type IRouter } from "express";
import { z } from "zod";
import { getCirqAgentTools } from "../lib/cirqAgent";
import { requireJurisdictionAttestation } from "../middlewares/jurisdiction";

const router: IRouter = Router();

const PrepareEntryBody = z.object({
  venue: z.string().min(1),
  marketId: z.string().min(1),
  owner: z.string().min(1),
  tokenIn: z.string().min(1),
  /** JSON has no bigint — the wire format is a decimal string, parsed below. */
  amountIn: z.string().regex(/^\d+$/, "amountIn must be a decimal integer string"),
});

const PrepareExitBody = z.object({
  venue: z.string().min(1),
  marketId: z.string().min(1),
  owner: z.string().min(1),
});

/**
 * Every route below can produce a payload, so every route below requires a
 * jurisdiction attestation — see docs/cirq-backend/API.md. The underlying
 * `CirqAgentTools` calls do their own registry check, fork simulation, and
 * argument validation; this layer only adapts HTTP's string-only JSON wire
 * format to what those calls expect (e.g. amountIn as bigint) and maps
 * their errors to distinct HTTP error shapes.
 */
router.post("/prepare/entry", requireJurisdictionAttestation, async (req, res) => {
  const parsedBody = PrepareEntryBody.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: "invalid_request", message: parsedBody.error.message });
    return;
  }

  try {
    const tools = getCirqAgentTools();
    const result = await tools.prepareEntry({
      venue: parsedBody.data.venue,
      marketId: parsedBody.data.marketId,
      owner: parsedBody.data.owner,
      tokenIn: parsedBody.data.tokenIn,
      amountIn: BigInt(parsedBody.data.amountIn),
    });
    res.json({
      payload: { ...result.payload, value: result.payload.value.toString() },
      explanation: result.explanation,
    });
  } catch (error) {
    res.status(422).json({
      error: "prepare_failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

router.post("/prepare/exit", requireJurisdictionAttestation, async (req, res) => {
  const parsedBody = PrepareExitBody.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: "invalid_request", message: parsedBody.error.message });
    return;
  }

  try {
    const tools = getCirqAgentTools();
    const result = await tools.prepareExit(parsedBody.data);
    res.json({
      payload: { ...result.payload, value: result.payload.value.toString() },
      explanation: result.explanation,
    });
  } catch (error) {
    res.status(422).json({
      error: "prepare_failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
