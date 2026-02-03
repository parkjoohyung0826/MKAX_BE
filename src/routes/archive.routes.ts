import { Router } from "express";
import {
  deleteArchiveByCodeController,
  fetchArchiveByCodeController,
} from "../controllers/archive.controller";

const router = Router();

// POST /api/archive/fetch
router.post("/fetch", fetchArchiveByCodeController);
// POST /api/archive/delete
router.post("/delete", deleteArchiveByCodeController);

export default router;
