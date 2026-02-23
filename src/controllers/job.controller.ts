import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { recommendJobFromDescription } from "../services/job.service";
import { parseRequestBody } from "../common/controllerHelpers";

const RecommendSchema = z.object({
  description: z.string(),
});

export async function recommendJobController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const data = parseRequestBody(RecommendSchema, req, res);
  if (!data) return;

  try {
    const result = await recommendJobFromDescription(data.description);
    return res.json(result);
  } catch (err) {
    console.error("Error in recommendJobController");
    next(err);
  }
}
