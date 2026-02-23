import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  chatGrowthProcess,
  chatSeniorCareerSummaryLifeView,
} from "../services/growthProcessChat.service";
import { createSessionChatController } from "../common/controllerHelpers";

const GrowthProcessChatSchema = z.object({
  userInput: z.string(),
  currentSummary: z.string().optional(),
});

export const growthProcessChatController = createSessionChatController(
  GrowthProcessChatSchema,
  chatGrowthProcess,
  "growthProcessChatController"
);

export const seniorCareerSummaryLifeViewChatController =
  createSessionChatController(
    GrowthProcessChatSchema,
    chatSeniorCareerSummaryLifeView,
    "seniorCareerSummaryLifeViewChatController"
  );
