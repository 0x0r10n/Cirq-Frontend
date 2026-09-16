import { Router, type IRouter } from "express";
import healthRouter from "./health";
import opportunitiesRouter from "./opportunities";
import prepareRouter from "./prepare";

const router: IRouter = Router();

router.use(healthRouter);
router.use(opportunitiesRouter);
router.use(prepareRouter);

export default router;
