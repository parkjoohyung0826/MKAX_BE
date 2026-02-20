import { Router } from "express";
import {
  recommendActivityController,
  recommendSeniorTrainingController,
} from "../controllers/activity.controller";

const router = Router();

router.post("/activity", recommendActivityController);
router.post("/senior-training", recommendSeniorTrainingController);

export default router;
