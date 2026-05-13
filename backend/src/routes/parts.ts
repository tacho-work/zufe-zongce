import { Router } from 'express';
import { queryAll } from '../db/connection.js';

const router = Router();

router.get('/parts', (_req, res) => {
  const parts = queryAll('SELECT * FROM parts ORDER BY "order"');
  res.json(parts);
});

export default router;
