import { Router } from "express";
import { recommendJobController } from "../controllers/job.controller";

const router = Router();

// POST /jobs/recommend
router.post("/jobs", recommendJobController);

export default router;
