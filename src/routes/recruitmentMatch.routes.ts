import { Router } from "express";
import {
  listRecruitmentsController,
  matchRecruitmentsController,
} from "../controllers/recruitmentMatch.controller";

const router = Router();

router.get("/recruitments", listRecruitmentsController);
router.post("/recruitments/match", matchRecruitmentsController);

export default router;
