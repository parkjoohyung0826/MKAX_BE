import { Router } from "express";
import { recommendEducationController } from "../controllers/education.controller";

const router = Router();

router.post("/education", recommendEducationController);

export default router;
