import { Request, Response } from "express";
import { z } from "zod";
import { CoverLetterService } from "../services/coverLetter.service";
import { CoverLetterSection } from "../common/coverLetter.types";
import { withControllerErrorHandling } from "../common/controllerHelpers";

const allowedSections = [
  "GROWTH_PROCESS",
  "PERSONALITY",
  "CAREER_STRENGTH",
  "MOTIVATION_ASPIRATION",
] as const satisfies ReadonlyArray<CoverLetterSection>;

const CreateDraftSchema = z.object({
  section: z.enum(allowedSections, {
    error: "section 값이 올바르지 않습니다.",
  }),
  userInput: z
    .string()
    .trim()
    .min(1, { error: "userInput은 필수입니다." }),
  desiredJob: z.string().optional(),
  mode: z.enum(["basic", "senior"]).optional(),
});

export class CoverLetterController {
  static createDraft = withControllerErrorHandling(
    async (req: Request, res: Response) => {
      const parsed = CreateDraftSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        const firstIssue = parsed.error.issues[0];
        const field = firstIssue?.path?.[0];
        const message =
          field === "section"
            ? "section 값이 올바르지 않습니다."
            : field === "userInput"
            ? "userInput은 필수입니다."
            : "Invalid request body";
        return res.status(400).json({
          message,
          errors: parsed.error.flatten(),
        });
      }

      const bodyData = parsed.data;

      const result = await CoverLetterService.generateDraft({
        section: bodyData.section,
        userInput: bodyData.userInput,
        desiredJob: bodyData.desiredJob,
        mode: bodyData.mode,
      });

      return res.status(200).json(result);
    },
    "CoverLetterController.createDraft"
  );
}
