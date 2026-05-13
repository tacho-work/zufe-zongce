import { Router } from 'express';
import { queryAll } from '../db/connection.js';

const router = Router();

router.get('/timeline', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  res.json(queryAll('SELECT * FROM timeline_events ORDER BY created_at DESC LIMIT ?', [limit]));
});

export default router;
