import { Router } from 'express';
import { queryAll, queryOne, run } from '../db/connection.js';

const router = Router();

// GET /api/subjects — return all 5 subjects with config summary
router.get('/subjects', (_req, res) => {
  const configs = queryAll<Record<string, unknown>>(
    'SELECT * FROM subject_configs ORDER BY subject_id',
  );

  const result = configs.map((c) => {
    const rules = queryAll<Record<string, unknown>>(
      'SELECT * FROM assessment_rules WHERE subject_id = ?',
      [c.subject_id as string],
    );
    const confirmed = rules.filter((r) => r.confirmed).length;
    const missingMat = rules.filter((r) => r.material_required && !r.material_name).length;
    const bonusSum = rules
      .filter((r) => r.score_type === 'bonus' && r.confirmed)
      .reduce((s, r) => s + (r.score as number), 0);
    const penaltySum = rules
      .filter((r) => r.score_type === 'penalty' && r.confirmed)
      .reduce((s, r) => s + (r.score as number), 0);
    const base = (c.base_score as number) ?? 0;

    return {
      subjectId: c.subject_id,
      subjectName: c.subject_name,
      baseScore: base,
      maxScore: c.max_score ?? null,
      status: c.status,
      ruleCount: rules.length,
      confirmedRuleCount: confirmed,
      missingMaterialCount: missingMat,
      currentEstimatedScore: base + bonusSum - penaltySum,
    };
  });

  res.json(result);
});

// GET /api/subjects/:subjectId — single subject with rules
router.get('/subjects/:subjectId', (req, res) => {
  const { subjectId } = req.params;

  const config = queryOne<Record<string, unknown>>(
    'SELECT * FROM subject_configs WHERE subject_id = ?',
    [subjectId],
  );

  if (!config) {
    res.status(404).json({ error: 'Subject not found' });
    return;
  }

  const rules = queryAll<Record<string, unknown>>(
    'SELECT * FROM assessment_rules WHERE subject_id = ? ORDER BY created_at DESC',
    [subjectId],
  );

  const mappedRules = rules.map((r) => ({
    id: r.id as string,
    subjectId: r.subject_id as string,
    name: r.name as string,
    scoreType: r.score_type as string,
    score: r.score as number,
    condition: {
      field: r.condition_field as string,
      operator: r.condition_operator as string,
      value: tryParseJSON(r.condition_value as string),
    },
    materialRequired: !!(r.material_required as number),
    materialName: (r.material_name as string) ?? undefined,
    sourceText: (r.source_text as string) ?? undefined,
    sourcePage: (r.source_page as number) ?? undefined,
    confidence: (r.confidence as number) ?? undefined,
    confirmed: !!(r.confirmed as number),
  }));

  const confirmed = mappedRules.filter((r) => r.confirmed);
  const bonusSum = confirmed.filter((r) => r.scoreType === 'bonus').reduce((s, r) => s + r.score, 0);
  const penaltySum = confirmed.filter((r) => r.scoreType === 'penalty').reduce((s, r) => s + r.score, 0);
  const base = (config.base_score as number) ?? 0;
  const missingMat = mappedRules.filter((r) => r.materialRequired && !r.materialName).length;

  res.json({
    subjectId: config.subject_id,
    subjectName: config.subject_name,
    baseScore: base,
    maxScore: config.max_score ?? null,
    status: config.status,
    rules: mappedRules,
    confirmedRuleCount: confirmed.length,
    missingMaterialCount: missingMat,
    currentEstimatedScore: base + bonusSum - penaltySum,
  });
});

// PATCH /api/subjects/:subjectId — update base score / max score / status
router.patch('/subjects/:subjectId', (req, res) => {
  const { subjectId } = req.params;
  const { baseScore, maxScore, status } = req.body;

  const existing = queryOne<Record<string, unknown>>(
    'SELECT * FROM subject_configs WHERE subject_id = ?',
    [subjectId],
  );
  if (!existing) {
    res.status(404).json({ error: 'Subject not found' });
    return;
  }

  if (baseScore !== undefined) {
    run('UPDATE subject_configs SET base_score = ?, updated_at = datetime(\'now\') WHERE subject_id = ?', [baseScore, subjectId]);
  }
  if (maxScore !== undefined) {
    run('UPDATE subject_configs SET max_score = ?, updated_at = datetime(\'now\') WHERE subject_id = ?', [maxScore, subjectId]);
  }
  if (status !== undefined) {
    run('UPDATE subject_configs SET status = ?, updated_at = datetime(\'now\') WHERE subject_id = ?', [status, subjectId]);
  }

  res.json({ ok: true });
});

// POST /api/subjects/:subjectId/rules — add new rule
router.post('/subjects/:subjectId/rules', (req, res) => {
  const { subjectId } = req.params;
  const {
    name, scoreType, score, condition, materialRequired, materialName,
    sourceText, sourcePage, confidence, confirmed,
  } = req.body;

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  run(
    `INSERT INTO assessment_rules
     (id, subject_id, name, score_type, score, condition_field, condition_operator,
      condition_value, material_required, material_name, source_text, source_page,
      confidence, confirmed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, subjectId, name, scoreType ?? 'bonus', score ?? 0,
      condition?.field ?? '', condition?.operator ?? 'eq', JSON.stringify(condition?.value ?? ''),
      materialRequired ? 1 : 0, materialName ?? null, sourceText ?? null,
      sourcePage ?? null, confidence ?? null, confirmed ? 1 : 0,
    ],
  );

  res.json({ id });
});

// PATCH /api/rules/:ruleId — update rule
router.patch('/rules/:ruleId', (req, res) => {
  const { ruleId } = req.params;
  const updates = req.body;

  const existing = queryOne<Record<string, unknown>>(
    'SELECT * FROM assessment_rules WHERE id = ?', [ruleId],
  );
  if (!existing) {
    res.status(404).json({ error: 'Rule not found' });
    return;
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
  if (updates.scoreType !== undefined) { fields.push('score_type = ?'); values.push(updates.scoreType); }
  if (updates.score !== undefined) { fields.push('score = ?'); values.push(updates.score); }
  if (updates.condition) {
    fields.push('condition_field = ?'); values.push(updates.condition.field ?? '');
    fields.push('condition_operator = ?'); values.push(updates.condition.operator ?? 'eq');
    fields.push('condition_value = ?'); values.push(JSON.stringify(updates.condition.value ?? ''));
  }
  if (updates.materialRequired !== undefined) { fields.push('material_required = ?'); values.push(updates.materialRequired ? 1 : 0); }
  if (updates.materialName !== undefined) { fields.push('material_name = ?'); values.push(updates.materialName); }
  if (updates.confirmed !== undefined) { fields.push('confirmed = ?'); values.push(updates.confirmed ? 1 : 0); }

  if (fields.length > 0) {
    fields.push('updated_at = datetime(\'now\')');
    values.push(ruleId);
    run(`UPDATE assessment_rules SET ${fields.join(', ')} WHERE id = ?`, values as import('sql.js').SqlValue[]);
  }

  res.json({ ok: true });
});

// DELETE /api/rules/:ruleId
router.delete('/rules/:ruleId', (req, res) => {
  const { ruleId } = req.params;
  run('DELETE FROM assessment_rules WHERE id = ?', [ruleId]);
  res.status(204).send();
});

// PUT /api/subjects/:subjectId/submit — submit subject score (rules + total)
router.put('/subjects/:subjectId/submit', (req, res) => {
  try {
    const { subjectId } = req.params;
    const { baseScore, totalScore, entries } = req.body;

  const config = queryOne<Record<string, unknown>>(
    'SELECT * FROM subject_configs WHERE subject_id = ?',
    [subjectId],
  );
  if (!config) {
    res.status(400).json({ error: 'Subject not found' });
    return;
  }

  if (typeof totalScore !== 'number' || !Array.isArray(entries)) {
    res.status(400).json({ error: 'totalScore and entries are required' });
    return;
  }

  // Get all students
  const students = queryAll<{ student_id: string }>(
    'SELECT student_id FROM student_rows',
  );

  // Delete existing confirmed rules for this subject
  run('DELETE FROM assessment_rules WHERE subject_id = ? AND confirmed = 1', [subjectId]);

  // Insert new rules
  for (const entry of entries) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    run(
      `INSERT INTO assessment_rules
       (id, subject_id, name, score_type, score, condition_field, condition_operator,
        condition_value, material_required, material_name, source_text, source_page,
        confidence, confirmed)
       VALUES (?, ?, ?, ?, ?, '', 'eq', '', 0, ?, ?, ?, 1, 1)`,
      [id, subjectId, entry.name, entry.scoreType ?? 'bonus', entry.score ?? 0,
       entry.materialName ?? null, entry.sourceText ?? '', entry.sourcePage ?? null],
    );
  }

  // Update calculation_results for all students
  for (const student of students) {
    const existing = queryOne<{ id: string }>(
      "SELECT id FROM calculation_results WHERE student_id = ? AND subject_id = ?",
      [student.student_id, subjectId],
    );

    const bonusTotal = entries
      .filter((e: any) => e.scoreType === 'bonus')
      .reduce((s: number, e: any) => s + (e.score * (e.quantity || 1)), 0);
    const penaltyTotal = entries
      .filter((e: any) => e.scoreType === 'penalty')
      .reduce((s: number, e: any) => s + (e.score * (e.quantity || 1)), 0);

    if (existing) {
      run(
        `UPDATE calculation_results SET base_score = ?, bonus_total = ?, penalty_total = ?,
         final_score = ?
         WHERE student_id = ? AND subject_id = ?`,
        [baseScore ?? 0, bonusTotal, penaltyTotal, totalScore,
         student.student_id, subjectId],
      );
    } else {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      run(
        `INSERT INTO calculation_results
         (id, student_id, subject_id, base_score, bonus_total, penalty_total, final_score,
          missing_materials_json, rule_results_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, '[]', '[]')`,
        [id, student.student_id, subjectId, baseScore ?? 0, bonusTotal, penaltyTotal, totalScore],
      );
    }
  }

  res.json({ ok: true });
  } catch (err: unknown) {
    const e = err as Error;
    console.error('submit error:', e.stack ?? e.message);
    res.status(500).json({ error: e.message ?? 'Unknown error' });
  }
});

function tryParseJSON(v: string): unknown {
  try { return JSON.parse(v); } catch { return v; }
}

export default router;
