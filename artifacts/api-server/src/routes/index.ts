import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import languagesRouter from "./languages";
import problemsRouter from "./problems";
import submissionsRouter from "./submissions";
import contestsRouter from "./contests";
import dashboardRouter from "./dashboard";
import judge0Router from "./judge0";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(languagesRouter);
router.use(problemsRouter);
router.use(submissionsRouter);
router.use(contestsRouter);
router.use(dashboardRouter);
router.use(judge0Router);

export default router;
