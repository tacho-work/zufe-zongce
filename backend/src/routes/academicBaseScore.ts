import { Router, type Request, type Response } from "express";
import multer from "multer";
import { calculateAcademicBaseScore } from "../services/academicBaseScore.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

function handleBaseScoreUpload(subjectId: "academic" | "sports") {
  return (req: Request, res: Response) => {
    if (!req.file) {
      res.status(422).json({ error: "未提供课程成绩文件" });
      return;
    }
    try {
      // multer/busboy decodes the filename as Latin-1; restore UTF-8
      const fileName = Buffer.from(req.file.originalname, "latin1").toString("utf8");
      const result = calculateAcademicBaseScore(
        req.file.buffer,
        fileName,
        subjectId,
      );
      res.json(result);
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number };
      const statusCode = e.statusCode ?? 500;
      if (statusCode === 500) {
        console.error("academicBaseScore 500:", e.stack ?? e.message);
      }
      const body: { error: string; details?: string } = {
        error: e.message ?? "Unknown error",
      };
      res.status(statusCode).json(body);
    }
  };
}

// POST /api/subjects/:subjectId/base-score
router.post(
  "/subjects/:subjectId/base-score",
  upload.single("file"),
  (req, res) => {
    const subjectId = req.params.subjectId;
    if (subjectId !== "academic" && subjectId !== "sports") {
      res.status(404).json({ error: "该科目暂不支持课程成绩文件计算基础分" });
      return;
    }
    handleBaseScoreUpload(subjectId)(req, res);
  },
);

export default router;
