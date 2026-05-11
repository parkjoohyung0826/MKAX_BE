import { Router } from "express";
import {
  backfillRecruitmentEmbeddingsController,
  listRecruitmentsController,
  matchRecruitmentsController,
  purgeExpiredRecruitmentsController,
  recruitmentEmbeddingStatusController,
  recruitmentFilterOptionsController,
  syncRecruitmentsController,
} from "../controllers/recruitmentMatch.controller";

const router = Router();

router.get("/recruitments", listRecruitmentsController);
router.get("/recruitments/filters", recruitmentFilterOptionsController);
router.get("/recruitments/embeddings/status", recruitmentEmbeddingStatusController);
router.post("/recruitments/sync", syncRecruitmentsController);
router.post("/recruitments/embeddings/backfill", backfillRecruitmentEmbeddingsController);
router.post("/recruitments/purge-expired", purgeExpiredRecruitmentsController);
router.post("/recruitments/match", matchRecruitmentsController);

export default router;
