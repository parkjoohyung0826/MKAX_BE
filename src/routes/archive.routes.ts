import { Router } from "express";
import {
  deleteArchiveByCodeController,
  fetchArchiveByCodeController,
} from "../controllers/archive.controller";

const router = Router();

router.post("/fetch", fetchArchiveByCodeController);
router.post("/delete", deleteArchiveByCodeController);

export default router;
