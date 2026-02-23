import { z } from "zod";
import {
  chatCareerStrength,
  chatSeniorCoreSkills,
} from "../services/careerStrengthChat.service";
import { createSessionChatController } from "../common/controllerHelpers";

const CareerStrengthChatSchema = z.object({
  userInput: z.string(),
  currentSummary: z.string().optional(),
});

export const careerStrengthChatController = createSessionChatController(
  CareerStrengthChatSchema,
  chatCareerStrength,
  "careerStrengthChatController"
);

export const seniorCoreSkillsChatController = createSessionChatController(
  CareerStrengthChatSchema,
  chatSeniorCoreSkills,
  "seniorCoreSkillsChatController"
);
