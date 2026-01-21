import { Router } from "express";
import { recommendActivityController } from "../controllers/activity.controller";

const router = Router();

router.post("/activity", recommendActivityController);

export default router;
