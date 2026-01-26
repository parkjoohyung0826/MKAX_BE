import { Router } from "express";
import { recommendProfileController } from "../controllers/profile.controller";

const router = Router();

// POST /api/recommend/profile
router.post("/profile", recommendProfileController);

export default router;
