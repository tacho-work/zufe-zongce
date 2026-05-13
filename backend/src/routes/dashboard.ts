import { Router } from 'express';
import { queryAll, queryOne } from '../db/connection.js';

const router = Router();

router.get('/dashboard/summary', (_req, res) => {
  const parts = queryAll<{ id: number; label: string; type: string; order: number }>(
    'SELECT * FROM parts ORDER BY "order"',
  );

  const summary = parts.map((p) => {
    const rc = queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM records WHERE part_id = ?',
      [p.id],
    );
    return { ...p, record_count: rc?.count ?? 0 };
  });

  res.json({ parts: summary, total_records: summary.reduce((a, b) => a + b.record_count, 0) });
});

router.get('/dashboard/parts/:partId', (req, res) => {
  const part = queryOne<{ id: number; type: string }>(
    'SELECT * FROM parts WHERE id = ?',
    [req.params.partId],
  );

  if (!part) {
    res.status(404).json({ error: 'Part not found' });
    return;
  }

  const records = queryAll(
    'SELECT * FROM records WHERE part_id = ? ORDER BY created_at DESC LIMIT 20',
    [part.id],
  );

  const tasks = queryAll(
    'SELECT * FROM tasks WHERE source_type = ? ORDER BY priority DESC, created_at DESC LIMIT 10',
    [part.type],
  );

  res.json({ part, records, tasks });
});

export default router;
