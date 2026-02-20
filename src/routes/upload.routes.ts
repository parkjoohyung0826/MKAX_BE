import { Router } from "express";
import { createPhotoUploadUrlController } from "../controllers/upload.controller";

const router = Router();

router.post("/photo-url", createPhotoUploadUrlController);

export default router;
