import { Router } from 'express';
import multer from 'multer';
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import { extractPlaceholders, fillDocument } from '../services/docxService.js';
import { getStudentFillData, getFirstStudentFillData } from '../services/templateData.js';
import { queryOne, run } from '../db/connection.js';
import { getDataDir } from '../utils/paths.js';

const STORAGE_DIR = process.env.TEMPLATE_STORAGE_DIR || resolve(getDataDir(), 'templates');

// Stable path for the current template (survives server restart)
const STABLE_TEMPLATE_PATH = resolve(STORAGE_DIR, '_current_template.docx');

const upload = multer({
  dest: STORAGE_DIR,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const isDocx = file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      || file.originalname.endsWith('.docx');
    if (!isDocx) {
      cb(new Error('仅支持 .docx 格式'));
      return;
    }
    cb(null, true);
  },
});

// Hardcoded placeholder → position description mapping
const PLACEHOLDER_LABELS: Record<string, { section: string; column: string }> = {
  moral_honor_details: { section: '德育-荣誉奖励情况', column: '记实内容情况' },
  moral_honor_scores: { section: '德育-荣誉奖励情况', column: '加（减）分' },
  moral_competition_details: { section: '德育-德育比赛情况', column: '记实内容情况' },
  moral_competition_scores: { section: '德育-德育比赛情况', column: '加（减）分' },
  moral_activity_details: { section: '德育-参加活动情况', column: '记实内容情况' },
  moral_activity_scores: { section: '德育-参加活动情况', column: '加（减）分' },
  moral_other_details: { section: '德育-其它加减分情况', column: '记实内容情况' },
  moral_other_scores: { section: '德育-其它加减分情况', column: '加（减）分' },
  moral_subtotal: { section: '德育-小计', column: '加（减）分' },
  academic_formula_result: { section: '智育-学习平均成绩', column: '记实内容情况' },
  academic_base_scores: { section: '智育-学习平均成绩', column: '加（减）分' },
  academic_competition_details: { section: '智育-智育比赛情况', column: '记实内容情况' },
  academic_competition_scores: { section: '智育-智育比赛情况', column: '加（减）分' },
  academic_exam_details: { section: '智育-等级考试情况', column: '记实内容情况' },
  academic_exam_scores: { section: '智育-等级考试情况', column: '加（减）分' },
  academic_certificate_details: { section: '智育-证书情况', column: '记实内容情况' },
  academic_certificate_scores: { section: '智育-证书情况', column: '加（减）分' },
  academic_research_details: { section: '智育-科研成果情况', column: '记实内容情况' },
  academic_research_scores: { section: '智育-科研成果情况', column: '加（减）分' },
  academic_other_details: { section: '智育-其它加减分情况', column: '记实内容情况' },
  academic_other_scores: { section: '智育-其它加减分情况', column: '加（减）分' },
  academic_subtotal: { section: '智育-小计', column: '加（减）分' },
  sports_score_details: { section: '体育-体育课或体测成绩', column: '记实内容情况' },
  sports_base_scores: { section: '体育-体育课或体测成绩', column: '加（减）分' },
  sports_competition_details: { section: '体育-体育竞赛情况', column: '记实内容情况' },
  sports_competition_scores: { section: '体育-体育竞赛情况', column: '加（减）分' },
  sports_other_details: { section: '体育-其它加减分情况', column: '记实内容情况' },
  sports_other_scores: { section: '体育-其它加减分情况', column: '加（减）分' },
  sports_subtotal: { section: '体育-小计', column: '加（减）分' },
  aesthetic_activity_details: { section: '美育-参加活动情况', column: '记实内容情况' },
  aesthetic_activity_scores: { section: '美育-参加活动情况', column: '加（减）分' },
  aesthetic_competition_details: { section: '美育-文艺竞赛情况', column: '记实内容情况' },
  aesthetic_competition_scores: { section: '美育-文艺竞赛情况', column: '加（减）分' },
  aesthetic_publication_details: { section: '美育-发表作品情况', column: '记实内容情况' },
  aesthetic_publication_scores: { section: '美育-发表作品情况', column: '加（减）分' },
  aesthetic_other_details: { section: '美育-其它加减分情况', column: '记实内容情况' },
  aesthetic_other_scores: { section: '美育-其它加减分情况', column: '加（减）分' },
  aesthetic_subtotal: { section: '美育-小计', column: '加（减）分' },
  labor_dormitory_details: { section: '劳育-寝室荣誉情况', column: '记实内容情况' },
  labor_dormitory_scores: { section: '劳育-寝室荣誉情况', column: '加（减）分' },
  labor_activity_details: { section: '劳育-参加活动情况', column: '记实内容情况' },
  labor_activity_scores: { section: '劳育-参加活动情况', column: '加（减）分' },
  labor_entrepreneurship_details: { section: '劳育-创业实践情况', column: '记实内容情况' },
  labor_entrepreneurship_scores: { section: '劳育-创业实践情况', column: '加（减）分' },
  labor_project_details: { section: '劳育-项目获奖情况', column: '记实内容情况' },
  labor_project_scores: { section: '劳育-项目获奖情况', column: '加（减）分' },
  labor_other_details: { section: '劳育-其它加减分情况', column: '记实内容情况' },
  labor_other_scores: { section: '劳育-其它加减分情况', column: '加（减）分' },
  labor_subtotal: { section: '劳育-小计', column: '加（减）分' },
  other_cadre_details: { section: '其他-学生干部任职情况', column: '记实内容情况' },
  other_cadre_scores: { section: '其他-学生干部任职情况', column: '加（减）分' },
  other_volunteer_details: { section: '其他-志愿服务情况', column: '记实内容情况' },
  other_volunteer_scores: { section: '其他-志愿服务情况', column: '加（减）分' },
  other_other_details: { section: '其他-其他加减分情况', column: '记实内容情况' },
  other_other_scores: { section: '其他-其他加减分情况', column: '加（减）分' },
  other_subtotal: { section: '其他-小计', column: '加（减）分' },
  total_score: { section: '综合测评总分', column: '右侧空白区' },
};

// ---- Persistence helpers ----

function persistTemplate(filename: string, placeholders: string[]) {
  try {
    run("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('uploaded_template_filename', ?)", [filename]);
    run("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('uploaded_template_placeholders', ?)", [JSON.stringify(placeholders)]);
  } catch { /* DB not ready */ }
}

function clearPersistedTemplate() {
  try {
    run("DELETE FROM app_settings WHERE key = 'uploaded_template_filename'");
    run("DELETE FROM app_settings WHERE key = 'uploaded_template_placeholders'");
  } catch { /* DB not ready */ }
}

function getDownloadFilename(): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, '');
  return `综测计算_${timestamp}.docx`;
}

// ---- In-memory state ----

let currentFilename: string | null = null;
let currentPlaceholders: string[] = [];
let uploadedAt: string | null = null;
let currentFilePath: string | null = null;
// ---- Module-level init: runs once when createTemplateRouter() is called ----
// Restores previously uploaded template from disk on restart.

if (!existsSync(STORAGE_DIR)) {
  mkdirSync(STORAGE_DIR, { recursive: true });
}

if (existsSync(STABLE_TEMPLATE_PATH)) {
  // Restore template from a previous session
  try {
    const buffer = readFileSync(STABLE_TEMPLATE_PATH);
    currentPlaceholders = extractPlaceholders(buffer);
    currentFilePath = STABLE_TEMPLATE_PATH;
    uploadedAt = new Date().toISOString();
    // Try to restore filename from DB (may fail if DB not seeded yet)
    try {
      const nameRow = queryOne<{ value: string }>("SELECT value FROM app_settings WHERE key = 'uploaded_template_filename'");
      currentFilename = nameRow?.value ?? null;
    } catch { /* DB not ready */ }
    if (!currentFilename) currentFilename = '模板文件.docx';
    console.log(`[template] Loaded persisted template: ${currentFilename} (${currentPlaceholders.length} placeholders)`);
  } catch (e) {
    console.error('[template] Failed to load persisted template file, will try default:', (e as Error).message);
  }
}


export function createTemplateRouter(): Router {
  const router = Router();

  // POST /upload
  router.post('/upload', (req, res) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      if (!req.file) {
        res.status(400).json({ error: '请上传文件' });
        return;
      }

      // Multer saved to temp path — read and save to stable path
      const buffer = readFileSync(req.file.path);
      unlinkSync(req.file.path); // remove temp file
      writeFileSync(STABLE_TEMPLATE_PATH, buffer);

      // Fix Chinese filenames garbled by Node.js HTTP header latin1 decoding
      const fixedName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

      const placeholders = extractPlaceholders(buffer);
      currentFilePath = STABLE_TEMPLATE_PATH;
      currentFilename = fixedName;
      currentPlaceholders = placeholders;
      uploadedAt = new Date().toISOString();

      persistTemplate(currentFilename, placeholders);

      res.json({
        filename: currentFilename,
        placeholders: currentPlaceholders,
        uploadedAt,
      });
    });
  });

  // GET /placeholders
  router.get('/placeholders', (_req, res) => {
    res.json({
      placeholders: currentPlaceholders,
      hasTemplate: currentFilename !== null,
      filename: currentFilename,
    });
  });

  // DELETE /
  router.delete('/', (_req, res) => {
    if (currentFilePath && existsSync(currentFilePath)) {
      unlinkSync(currentFilePath);
    }
    currentFilename = null;
    currentPlaceholders = [];
    uploadedAt = null;
    currentFilePath = null;
    clearPersistedTemplate();
    res.json({ ok: true });
  });

  // POST /fill — fill template for a student (or first student) and return filled .docx
  router.post('/fill', (req, res) => {
    if (!currentFilePath || !existsSync(currentFilePath)) {
      res.status(400).json({ error: '请先上传模板' });
      return;
    }

    const { studentId } = req.body;
    let fillData: Record<string, string> | null;
    if (studentId) {
      fillData = getStudentFillData(studentId);
    } else {
      fillData = getFirstStudentFillData();
    }
    if (!fillData) {
      res.status(400).json({ error: '找不到该学生或其计算数据，请先执行计算' });
      return;
    }

    const template = readFileSync(currentFilePath);
    const filled = fillDocument(template, fillData);

    const asciiName = 'zongce.docx';
    const encodedName = encodeURIComponent(getDownloadFilename());
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`);
    res.send(filled);
  });

  // GET /fill-preview — return fill data as JSON for preview/editing
  router.get('/fill-preview', (_req, res) => {
    if (!currentFilePath || !existsSync(currentFilePath)) {
      res.json({ placeholders: [], fillData: {}, placeholderLabels: {} });
      return;
    }

    const fillData = getFirstStudentFillData();
    if (!fillData) {
      res.json({
        placeholders: currentPlaceholders,
        fillData: {},
        placeholderLabels: PLACEHOLDER_LABELS,
      });
      return;
    }

    res.json({
      placeholders: currentPlaceholders,
      fillData,
      placeholderLabels: PLACEHOLDER_LABELS,
    });
  });

  // POST /fill-custom — accept edited fillData, regenerate docx
  router.post('/fill-custom', (req, res) => {
    if (!currentFilePath || !existsSync(currentFilePath)) {
      res.status(400).json({ error: '请先上传模板' });
      return;
    }

    const { fillData } = req.body;
    if (!fillData || typeof fillData !== 'object') {
      res.status(400).json({ error: 'fillData 是必填项' });
      return;
    }

    const template = readFileSync(currentFilePath);
    const filled = fillDocument(template, fillData);

    const asciiName = 'zongce.docx';
    const encodedName = encodeURIComponent(getDownloadFilename());
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`);
    res.send(filled);
  });

  return router;
}
