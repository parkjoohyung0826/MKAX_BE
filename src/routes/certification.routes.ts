import { Router } from "express";
import {
  recommendCertificationController,
  recommendSeniorLicenseSkillController,
} from "../controllers/certification.controller";

const router = Router();

router.post("/certification", recommendCertificationController);
router.post("/senior-license-skill", recommendSeniorLicenseSkillController);

export default router;
