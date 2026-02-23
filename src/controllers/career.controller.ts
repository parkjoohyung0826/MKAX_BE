import { z } from "zod";
import { recommendCareerFromInput } from "../services/career.service";
import { RecommendSection } from "@prisma/client";
import {
  createRecommendAccumulatedController,
} from "../common/controllerHelpers";

const CareerSchema = z.object({
  userInput: z.string(),
});

export const recommendCareerController = createRecommendAccumulatedController({
  schema: CareerSchema,
  section: RecommendSection.CAREER,
  getInput: (data) => data.userInput,
  service: recommendCareerFromInput,
  getIsComplete: (result) => result.isComplete,
  fallbackError: {
    logLabel: "[Career AI Error]",
    message: "Failed to generate career description",
  },
});
