import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import languagesRouter from "./languages.js";
import problemsRouter from "./problems.js";
import submissionsRouter from "./submissions.js";
import contestsRouter from "./contests.js";
import dashboardRouter from "./dashboard.js";
import judge0Router from "./judge0.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(languagesRouter);
router.use(problemsRouter);
router.use(submissionsRouter);
router.use(contestsRouter);
router.use(dashboardRouter);
router.use(judge0Router);

export default router;
