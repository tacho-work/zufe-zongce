import { getDb, queryOne, run, saveDb } from './connection.js';
import { createSchema } from './schema.js';

const SUBJECTS = [
  { id: 'moral', name: '德育' },
  { id: 'academic', name: '智育' },
  { id: 'sports', name: '体育' },
  { id: 'aesthetic', name: '美育' },
  { id: 'labor', name: '劳育' },
];

export async function seed(): Promise<void> {
  await getDb();
  createSchema();

  // Seed app_settings defaults (always ensure they exist)
  for (const { key, value } of [
    { key: 'ai_provider', value: '' },
    { key: 'ai_base_url', value: '' },
    { key: 'ai_model', value: '' },
    { key: 'ai_token', value: '' },
  ]) {
    run('INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)', [key, value]);
  }

  const existing = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM parts');
  if (existing && existing.count > 0) {
    // Already seeded old tables. Check if new tables need seeding.
    const sc = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM subject_configs');
    if (sc && sc.count > 0) return;
  }

  // Seed old parts table
  const parts = [
    { label: '德育', type: 'moral', order: 1 },
    { label: '智育', type: 'academic', order: 2 },
    { label: '体育', type: 'sports', order: 3 },
    { label: '美育', type: 'aesthetic', order: 4 },
    { label: '劳育', type: 'labor', order: 5 },
    { label: '设置', type: 'settings', order: 6 },
  ];

  for (const p of parts) {
    run(
      'INSERT INTO parts (label, type, "order") VALUES (?, ?, ?)',
      [p.label, p.type, p.order],
    );
  }

  // Seed subject_configs with base scores
  const DEFAULT_BASE_SCORES: Record<string, number> = {
    moral: 70,
    academic: 60,
    sports: 60,
    aesthetic: 70,
    labor: 70,
  };

  for (const s of SUBJECTS) {
    const baseScore = DEFAULT_BASE_SCORES[s.id] ?? 60;
    run(
      `INSERT OR REPLACE INTO subject_configs (subject_id, subject_name, base_score, status)
       VALUES (?, ?, ?, 'draft')`,
      [s.id, s.name, baseScore],
    );
  }

  saveDb();
}
