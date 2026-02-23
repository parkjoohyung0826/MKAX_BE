import { z } from "zod";
import {
  recommendActivityFromUserInput,
  recommendSeniorTrainingFromUserInput,
} from "../services/activity.service";
import { RecommendSection } from "@prisma/client";
import {
  createRecommendAccumulatedController,
} from "../common/controllerHelpers";

const ActivitySchema = z.object({
  userInput: z.string(),
});

export const recommendActivityController = createRecommendAccumulatedController({
  schema: ActivitySchema,
  section: RecommendSection.ACTIVITY,
  getInput: (data) => data.userInput,
  service: recommendActivityFromUserInput,
  getIsComplete: (result) => result.isComplete,
  fallbackError: {
    logLabel: "[POST /api/recommend/activity] error:",
    message: "Failed to recommend activity",
  },
});

export const recommendSeniorTrainingController = createRecommendAccumulatedController({
  schema: ActivitySchema,
  section: RecommendSection.ACTIVITY,
  getInput: (data) => data.userInput,
  service: recommendSeniorTrainingFromUserInput,
  getIsComplete: (result) => result.isComplete,
  fallbackError: {
    logLabel: "[POST /api/recommend/senior-training] error:",
    message: "Failed to recommend senior training",
  },
});
