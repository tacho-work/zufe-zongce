import { Router } from 'express';
import { queryAll, queryOne, run } from '../db/connection.js';

const router = Router();

router.get('/materials', (_req, res) => {
  res.json(queryAll('SELECT * FROM materials ORDER BY indexed_at DESC'));
});

router.post('/materials', (req, res) => {
  const { name, type, path, tags_json } = req.body;

  const result = run(
    `INSERT INTO materials (name, type, path, tags_json)
     VALUES (?, ?, ?, ?)`,
    [name ?? '', type ?? 'document', path ?? '', tags_json ? JSON.stringify(tags_json) : '[]'],
  );

  res.status(201).json(queryOne('SELECT * FROM materials WHERE id = ?', [result.lastInsertRowid]));
});

export default router;
