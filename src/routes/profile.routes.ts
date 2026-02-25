import { Router } from "express";
import { recommendProfileController } from "../controllers/profile.controller";

const router = Router();

router.post("/profile", recommendProfileController);

export default router;
