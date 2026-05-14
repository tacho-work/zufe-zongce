import { Router } from 'express';
import { queryAll, queryOne } from '../db/connection.js';

const router = Router();

// GET /api/export/score-summary — return submitted scores per subject
router.get('/export/score-summary', (_req, res) => {
  try {
    const configs = queryAll<Record<string, unknown>>(
      'SELECT * FROM subject_configs ORDER BY subject_id',
    );

    const subjects = configs.map((c) => {
      const calc = queryOne<Record<string, unknown>>(
        'SELECT final_score FROM calculation_results WHERE subject_id = ?',
        [c.subject_id as string],
      );
      return {
        subjectId: c.subject_id,
        subjectName: c.subject_name,
        baseScore: (c.base_score as number) ?? 0,
        totalScore: calc ? ((calc.final_score as number) ?? null) : null,
      };
    });

    res.json({ subjects });
  } catch (err: unknown) {
    const e = err as Error;
    console.error('score-summary error:', e.stack ?? e.message);
    res.status(500).json({ error: e.message ?? 'Unknown error' });
  }
});

export default router;
