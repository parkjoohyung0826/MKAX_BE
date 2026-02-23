import { z } from "zod";
import { recommendEducationFromDescription } from "../services/education.service";
import { RecommendSection } from "@prisma/client";
import {
  createRecommendAccumulatedController,
} from "../common/controllerHelpers";

const EducationSchema = z.object({
  description: z.string(),
});

export const recommendEducationController = createRecommendAccumulatedController({
  schema: EducationSchema,
  section: RecommendSection.EDUCATION,
  getInput: (data) => data.description,
  service: recommendEducationFromDescription,
  getIsComplete: (result) => result.isComplete,
  errorTag: "recommendEducationController",
});
