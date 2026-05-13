import { Router } from 'express';
import type { SqlValue } from 'sql.js';
import { queryAll, queryOne, run } from '../db/connection.js';

const router = Router();

router.get('/records', (req, res) => {
  const part_id = req.query.part_id as string | undefined;
  const status = req.query.status as string | undefined;
  let sql = 'SELECT * FROM records';
  const params: SqlValue[] = [];
  const conditions: string[] = [];

  if (part_id) {
    conditions.push('part_id = ?');
    params.push(Number(part_id));
  }
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY created_at DESC';

  res.json(queryAll(sql, params));
});

router.post('/records', (req, res) => {
  const { part_id, category, status, score, metadata_json } = req.body;

  const result = run(
    `INSERT INTO records (part_id, category, status, score, metadata_json)
     VALUES (?, ?, ?, ?, ?)`,
    [part_id ?? null, category ?? '', status ?? 'draft', score ?? 0, metadata_json ? JSON.stringify(metadata_json) : '{}'],
  );

  const record = queryOne('SELECT * FROM records WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(record);
});

router.get('/records/:id', (req, res) => {
  const record = queryOne('SELECT * FROM records WHERE id = ?', [req.params.id]);
  if (!record) {
    res.status(404).json({ error: 'Record not found' });
    return;
  }
  res.json(record);
});

router.patch('/records/:id', (req, res) => {
  const existing = queryOne('SELECT * FROM records WHERE id = ?', [req.params.id]);
  if (!existing) {
    res.status(404).json({ error: 'Record not found' });
    return;
  }

  const { category, status, score, metadata_json } = req.body;
  const updates: string[] = [];
  const params: SqlValue[] = [];

  if (category !== undefined) { updates.push('category = ?'); params.push(category); }
  if (status !== undefined) { updates.push('status = ?'); params.push(status); }
  if (score !== undefined) { updates.push('score = ?'); params.push(score); }
  if (metadata_json !== undefined) { updates.push('metadata_json = ?'); params.push(JSON.stringify(metadata_json)); }

  if (updates.length) {
    updates.push("updated_at = datetime('now')");
    params.push(req.params.id);
    run(`UPDATE records SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  res.json(queryOne('SELECT * FROM records WHERE id = ?', [req.params.id]));
});

router.delete('/records/:id', (req, res) => {
  const existing = queryOne('SELECT * FROM records WHERE id = ?', [req.params.id]);
  if (!existing) {
    res.status(404).json({ error: 'Record not found' });
    return;
  }
  run('DELETE FROM records WHERE id = ?', [req.params.id]);
  res.status(204).send();
});

export default router;
