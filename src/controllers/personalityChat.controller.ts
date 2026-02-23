import { z } from "zod";
import {
  chatPersonality,
  chatSeniorOrganizationCommunication,
} from "../services/personalityChat.service";
import { createSessionChatController } from "../common/controllerHelpers";

const PersonalityChatSchema = z.object({
  userInput: z.string(),
  currentSummary: z.string().optional(),
});

export const personalityChatController = createSessionChatController(
  PersonalityChatSchema,
  chatPersonality,
  "personalityChatController"
);

export const seniorOrganizationCommunicationChatController =
  createSessionChatController(
    PersonalityChatSchema,
    chatSeniorOrganizationCommunication,
    "seniorOrganizationCommunicationChatController"
  );
