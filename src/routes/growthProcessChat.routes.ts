import { Router } from "express";
import { growthProcessChatController } from "../controllers/growthProcessChat.controller";

const router = Router();

router.post("/growth-process", growthProcessChatController);

export default router;
