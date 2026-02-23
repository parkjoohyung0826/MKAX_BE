import { Router } from "express";
import {
  personalityChatController,
  seniorOrganizationCommunicationChatController,
} from "../controllers/personalityChat.controller";

const router = Router();

router.post("/personality", personalityChatController);
router.post("/senior-organization-communication", seniorOrganizationCommunicationChatController);
router.post("/senior/communication", seniorOrganizationCommunicationChatController);

export default router;
