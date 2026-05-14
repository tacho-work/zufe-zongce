import { getDb, queryOne, run, saveDb } from './connection.js';
import { createSchema } from './schema.js';

const SUBJECTS = [
  { id: 'moral', name: '德育' },
  { id: 'academic', name: '智育' },
  { id: 'sports', name: '体育' },
  { id: 'aesthetic', name: '美育' },
  { id: 'labor', name: '劳育' },
];

const DEFAULT_BATCH_ID = 'default-single-student-batch';
const DEFAULT_STUDENT_ROW_ID = 'default-single-student-row';
const DEFAULT_STUDENT_ID = 'single-student';

function ensureDefaultStudent(): void {
  const existing = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM student_rows');
  if (existing && existing.count > 0) return;

  run(
    `INSERT OR IGNORE INTO student_import_batches (id, file_name, row_count)
     VALUES (?, ?, ?)`,
    [DEFAULT_BATCH_ID, '系统默认学生', 1],
  );
  run(
    `INSERT OR IGNORE INTO student_rows (id, batch_id, student_id, student_name, raw_data_json)
     VALUES (?, ?, ?, ?, ?)`,
    [
      DEFAULT_STUDENT_ROW_ID,
      DEFAULT_BATCH_ID,
      DEFAULT_STUDENT_ID,
      '默认学生',
      JSON.stringify({ hidden: true }),
    ],
  );
}

export async function seed(): Promise<void> {
  await getDb();
  createSchema();

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
      `INSERT OR IGNORE INTO subject_configs (subject_id, subject_name, base_score, status)
       VALUES (?, ?, ?, 'draft')`,
      [s.id, s.name, baseScore],
    );
  }

  ensureDefaultStudent();
  saveDb();
}
