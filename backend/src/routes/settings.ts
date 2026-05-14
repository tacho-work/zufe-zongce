import { Router } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { queryAll, queryOne, run } from '../db/connection.js';
import { getDataDir } from '../utils/paths.js';

const router = Router();

// ---- Base scores ----

const SETTINGS_BASE_SCORE_SUBJECT_IDS = ['moral', 'aesthetic', 'labor'];
const BUSINESS_ORDER = ['moral', 'academic', 'sports', 'aesthetic', 'labor'];

function getBaseScores() {
  const configs = queryAll<Record<string, unknown>>(
    'SELECT * FROM subject_configs',
  );
  // Sort by business order: 德育 智育 体育 美育 劳育
  configs.sort((a, b) =>
    BUSINESS_ORDER.indexOf(a.subject_id as string) -
    BUSINESS_ORDER.indexOf(b.subject_id as string),
  );
  const items = configs
    .filter((c) => SETTINGS_BASE_SCORE_SUBJECT_IDS.includes(c.subject_id as string))
    .map((c) => ({
      subjectId: c.subject_id as string,
      subjectName: c.subject_name as string,
      baseScore: (c.base_score as number) ?? 0,
    }));
  const updatedAtRow = queryOne<{ updated_at: string }>(
    'SELECT MAX(updated_at) as updated_at FROM subject_configs',
  );
  return { items, updatedAt: updatedAtRow?.updated_at ?? null };
}

router.get('/settings/base-scores', (_req, res) => {
  res.json(getBaseScores());
});

router.patch('/settings/base-scores', (req, res) => {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'items must be a non-empty array' });
    return;
  }

  // Validate all items first — fail before any write
  for (const item of items) {
    const { subjectId, baseScore } = item;

    if (!SETTINGS_BASE_SCORE_SUBJECT_IDS.includes(subjectId)) {
      res.status(400).json({ error: `该科目基础分不能在设置页修改: ${subjectId}` });
      return;
    }

    if (typeof baseScore !== 'number' || !isFinite(baseScore) || baseScore < 0 || baseScore > 100) {
      res.status(400).json({ error: `baseScore must be a number between 0 and 100 for subject: ${subjectId}` });
      return;
    }
  }

  // All valid — execute updates atomically
  for (const item of items) {
    run(
      "UPDATE subject_configs SET base_score = ?, updated_at = datetime('now') WHERE subject_id = ?",
      [item.baseScore, item.subjectId],
    );
  }

  res.json(getBaseScores());
});

// ---- Rules file upload ----

const RULES_PATH = path.join(getDataDir(), 'output.json');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/settings/rules/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: '未提供文件' });
      return;
    }

    const content = req.file.buffer.toString('utf-8');

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      res.status(400).json({ error: '文件不是合法的 JSON 格式' });
      return;
    }

    if (!parsed || typeof parsed !== 'object') {
      res.status(400).json({ error: 'JSON 根节点必须是对象' });
      return;
    }

    const root = parsed as Record<string, unknown>;
    const errors: string[] = [];

    if (!root.schemaVersion || typeof root.schemaVersion !== 'string') {
      errors.push('缺少或无效的必要字段: schemaVersion (string)');
    }
    if (!root.subjects || typeof root.subjects !== 'object') {
      errors.push('缺少或无效的必要字段: subjects (object)');
    }

    if (errors.length > 0) {
      res.status(400).json({ error: '文件结构验证失败', details: errors });
      return;
    }

    // Validate each subject's structure
    const subjects = root.subjects as Record<string, unknown>;
    const subjectErrors: string[] = [];

    for (const [key, subject] of Object.entries(subjects)) {
      if (!subject || typeof subject !== 'object') {
        subjectErrors.push(`${key} 必须为对象`);
        continue;
      }
      const s = subject as Record<string, unknown>;
      if (s.scoreItems !== undefined && !Array.isArray(s.scoreItems)) {
        subjectErrors.push(`${key}.scoreItems 必须为数组`);
      }
      if (s.constraints !== undefined && !Array.isArray(s.constraints)) {
        subjectErrors.push(`${key}.constraints 必须为数组`);
      }
    }

    if (subjectErrors.length > 0) {
      res.status(400).json({ error: '科目结构验证失败', details: subjectErrors });
      return;
    }

    fs.mkdirSync(path.dirname(RULES_PATH), { recursive: true });
    fs.writeFileSync(RULES_PATH, JSON.stringify(parsed, null, 2), 'utf-8');

    // Build summary
    const summary: Record<string, number> = {};
    for (const [key, subject] of Object.entries(subjects)) {
      const s = subject as Record<string, unknown>;
      summary[key] = Array.isArray(s.scoreItems) ? s.scoreItems.length : 0;
    }

    res.json({
      ok: true,
      summary,
    });
  } catch (err: unknown) {
    const e = err as Error;
    console.error('rules upload failed:', e.stack ?? e.message);
    res.status(500).json({ error: `文件保存失败: ${e.message}` });
  }
});

export default router;
