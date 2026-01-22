import { Request, Response, NextFunction } from "express";
import { CoverLetterService } from "../services/coverLetter.service";
import { CoverLetterSection } from "../common/coverLetter.types";

const allowedSections: CoverLetterSection[] = [
  "GROWTH_PROCESS",
  "PERSONALITY",
  "CAREER_STRENGTH",
  "MOTIVATION_ASPIRATION",
];

export class CoverLetterController {
  static async createDraft(req: Request, res: Response, next: NextFunction) {
    try {
      const { section, userInput, desiredJob } = req.body as {
        section?: CoverLetterSection;
        userInput?: string;
        desiredJob?: string;
      };

      if (!section || !allowedSections.includes(section)) {
        return res.status(400).json({ message: "section 값이 올바르지 않습니다." });
      }

      if (!userInput || typeof userInput !== "string" || userInput.trim().length === 0) {
        return res.status(400).json({ message: "userInput은 필수입니다." });
      }

      const result = await CoverLetterService.generateDraft({
        section,
        userInput,
        desiredJob,
      });

      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }
}
