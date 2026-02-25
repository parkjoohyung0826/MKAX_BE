import { Router } from "express";
import { resetRecommendChatController } from "../controllers/recommendChat.controller";

const router = Router();

router.post("/chat/reset", resetRecommendChatController);

export default router;
