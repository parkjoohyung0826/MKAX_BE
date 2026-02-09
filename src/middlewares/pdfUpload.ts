import multer from "multer";

const storage = multer.memoryStorage();

function pdfFileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
    return;
  }
  cb(new Error("PDF 파일만 업로드 가능합니다."));
}

export const uploadPdfFields = multer({
  storage,
  fileFilter: pdfFileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, 
  },
}).fields([
  { name: "resume", maxCount: 1 },
  { name: "coverLetter", maxCount: 1 },
]);
