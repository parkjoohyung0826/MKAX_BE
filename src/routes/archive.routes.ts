import { Router } from "express";
import { fetchArchiveByCodeController } from "../controllers/archive.controller";

const router = Router();

// POST /api/archive/fetch
router.post("/fetch", fetchArchiveByCodeController);

export default router;
