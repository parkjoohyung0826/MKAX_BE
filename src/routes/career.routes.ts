import { Router } from "express";
import { recommendCareerController } from "../controllers/career.controller";

const router = Router();

router.post("/career", recommendCareerController);

export default router;
