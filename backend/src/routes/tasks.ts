import { Router } from 'express';
import type { SqlValue } from 'sql.js';
import { queryAll, queryOne, run } from '../db/connection.js';

const router = Router();

router.get('/tasks', (req, res) => {
  const status = req.query.status as string | undefined;
  const priority = req.query.priority as string | undefined;
  let sql = 'SELECT * FROM tasks';
  const params: SqlValue[] = [];
  const conditions: string[] = [];

  if (status) { conditions.push('status = ?'); params.push(status); }
  if (priority) { conditions.push('priority = ?'); params.push(priority); }

  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY priority DESC, created_at DESC';

  res.json(queryAll(sql, params));
});

router.post('/tasks', (req, res) => {
  const { title, source_type, priority, status, due_at } = req.body;

  const result = run(
    `INSERT INTO tasks (title, source_type, priority, status, due_at)
     VALUES (?, ?, ?, ?, ?)`,
    [title ?? '', source_type ?? 'manual', priority ?? 'medium', status ?? 'pending', due_at ?? null],
  );

  res.status(201).json(queryOne('SELECT * FROM tasks WHERE id = ?', [result.lastInsertRowid]));
});

router.patch('/tasks/:id', (req, res) => {
  const existing = queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  if (!existing) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const { title, priority, status, due_at } = req.body;
  const updates: string[] = [];
  const params: SqlValue[] = [];

  if (title !== undefined) { updates.push('title = ?'); params.push(title); }
  if (priority !== undefined) { updates.push('priority = ?'); params.push(priority); }
  if (status !== undefined) { updates.push('status = ?'); params.push(status); }
  if (due_at !== undefined) { updates.push('due_at = ?'); params.push(due_at); }

  if (updates.length) {
    params.push(req.params.id);
    run(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  res.json(queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]));
});

export default router;
