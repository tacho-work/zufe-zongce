import { Router } from 'express';
import { queryAll, run } from '../db/connection.js';

const router = Router();

// GET /api/extract/candidates — return all rule candidates
router.get('/extract/candidates', (_req, res) => {
  const rows = queryAll<Record<string, unknown>>(
    'SELECT * FROM rule_candidates ORDER BY created_at DESC',
  );

  const candidates = rows.map((r) => ({
    id: r.id,
    suggestedSubjectId: r.suggested_subject_id ?? undefined,
    name: r.name,
    scoreType: r.score_type,
    score: r.score,
    materialRequired: !!r.material_required,
    materialName: r.material_name ?? undefined,
    sourceText: r.source_text,
    sourcePage: r.source_page ?? undefined,
    confidence: r.confidence,
    status: r.status,
  }));

  res.json(candidates);
});

// POST /api/extract/candidates/:candidateId/accept — accept candidate into a subject
router.post('/extract/candidates/:candidateId/accept', (req, res) => {
  const { candidateId } = req.params;
  const { subjectId } = req.body;

  const candidate = queryAll<Record<string, unknown>>(
    'SELECT * FROM rule_candidates WHERE id = ?', [candidateId],
  )[0];

  if (!candidate) {
    res.status(404).json({ error: 'Candidate not found' });
    return;
  }

  const targetSubject = subjectId || candidate.suggested_subject_id;
  if (!targetSubject) {
    res.status(400).json({ error: 'subjectId is required for unassigned candidates' });
    return;
  }

  // Mark candidate as accepted
  run('UPDATE rule_candidates SET status = ? WHERE id = ?', ['accepted', candidateId]);

  // Create a new rule from the candidate
  const ruleId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  run(
    `INSERT INTO assessment_rules
     (id, subject_id, name, score_type, score, condition_field, condition_operator,
      condition_value, material_required, material_name, source_text, source_page, confidence, confirmed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ruleId, targetSubject as string, candidate.name as import('sql.js').SqlValue, candidate.score_type as import('sql.js').SqlValue, candidate.score as import('sql.js').SqlValue,
      '', 'eq', '', candidate.material_required ? 1 : 0,
      candidate.material_name as import('sql.js').SqlValue, candidate.source_text as import('sql.js').SqlValue, candidate.source_page as import('sql.js').SqlValue,
      candidate.confidence as import('sql.js').SqlValue, 0,
    ] as import('sql.js').SqlValue[],
  );

  res.json({ ruleId, subjectId: targetSubject });
});

// POST /api/extract/candidates/:candidateId/ignore
router.post('/extract/candidates/:candidateId/ignore', (req, res) => {
  const { candidateId } = req.params;
  run('UPDATE rule_candidates SET status = ? WHERE id = ?', ['ignored', candidateId]);
  res.json({ ok: true });
});

export default router;
