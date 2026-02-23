import { z } from "zod";
import {
  chatMotivationAspiration,
  chatSeniorMotivationWorkReadiness,
} from "../services/motivationAspirationChat.service";
import { createSessionChatController } from "../common/controllerHelpers";

const MotivationAspirationChatSchema = z.object({
  userInput: z.string(),
  currentSummary: z.string().optional(),
});

export const motivationAspirationChatController = createSessionChatController(
  MotivationAspirationChatSchema,
  chatMotivationAspiration,
  "motivationAspirationChatController"
);

export const seniorMotivationWorkReadinessChatController =
  createSessionChatController(
    MotivationAspirationChatSchema,
    chatSeniorMotivationWorkReadiness,
    "seniorMotivationWorkReadinessChatController"
  );
