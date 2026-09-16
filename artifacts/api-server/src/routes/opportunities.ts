import { Router, type IRouter } from "express";
import { getCirqAgentTools } from "../lib/cirqAgent";

const router: IRouter = Router();

/**
 * Read-only — no jurisdiction gate required to view curated opportunities
 * (see docs/cirq-backend/API.md); gating applies once a user tries to
 * prepare a payload against one.
 */
router.get("/opportunities", async (_req, res) => {
  try {
    const tools = getCirqAgentTools();
    const opportunities = await tools.scanOpportunities({});
    res.json({ opportunities });
  } catch (error) {
    res.status(503).json({
      error: "not_configured",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
