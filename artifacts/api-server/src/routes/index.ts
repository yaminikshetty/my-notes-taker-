import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storageRouter from "./storage";
import recordingsRouter from "./recordings";
import notesRouter from "./notes";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use(recordingsRouter);
router.use(notesRouter);

export default router;
