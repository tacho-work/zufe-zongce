import { Router } from 'express';
import { loadAcademicRules, loadSubjectRules } from '../services/academicRules.js';

const router = Router();

router.get('/rules/academic', (_req, res) => {
  try {
    res.json(loadAcademicRules());
  } catch (err: unknown) {
    const e = err as Error;
    console.error('academic rules load failed:', e.stack ?? e.message);
    res.status(500).json({ error: 'Failed to load academic rules' });
  }
});

router.get('/rules/:subjectId', (req, res) => {
  try {
    res.json(loadSubjectRules(req.params.subjectId));
  } catch (err: unknown) {
    const e = err as Error;
    console.error('subject rules load failed:', e.stack ?? e.message);
    res.status(500).json({ error: 'Failed to load subject rules' });
  }
});

export default router;
