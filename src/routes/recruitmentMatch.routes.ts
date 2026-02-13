import { Router } from "express";
import {
  listRecruitmentsController,
  matchRecruitmentsController,
  recruitmentFilterOptionsController,
  syncRecruitmentsController,
} from "../controllers/recruitmentMatch.controller";

const router = Router();

router.get("/recruitments", listRecruitmentsController);
router.get("/recruitments/filters", recruitmentFilterOptionsController);
router.post("/recruitments/sync", syncRecruitmentsController);
router.post("/recruitments/match", matchRecruitmentsController);

export default router;
