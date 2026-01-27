import { Router } from "express";
import { motivationAspirationChatController } from "../controllers/motivationAspirationChat.controller";

const router = Router();

router.post("/motivation-aspiration", motivationAspirationChatController);

export default router;
