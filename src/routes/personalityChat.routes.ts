import { Router } from "express";
import { personalityChatController } from "../controllers/personalityChat.controller";

const router = Router();

router.post("/personality", personalityChatController);

export default router;
