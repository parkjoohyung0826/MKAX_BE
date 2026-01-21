import { Router } from "express";
import { recommendCertificationController } from "../controllers/certification.controller";

const router = Router();

router.post("/certification", recommendCertificationController);

export default router;
