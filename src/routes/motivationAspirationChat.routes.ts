import { Router } from "express";
import {
  motivationAspirationChatController,
  seniorMotivationWorkReadinessChatController,
} from "../controllers/motivationAspirationChat.controller";

const router = Router();

router.post("/motivation-aspiration", motivationAspirationChatController);
router.post("/senior-motivation-work-readiness", seniorMotivationWorkReadinessChatController);
router.post("/senior/motivation", seniorMotivationWorkReadinessChatController);

export default router;
