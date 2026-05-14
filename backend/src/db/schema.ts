import { exec } from './connection.js';

export function createSchema(): void {
  exec(`
    CREATE TABLE IF NOT EXISTS subject_configs (
      subject_id TEXT PRIMARY KEY,
      subject_name TEXT NOT NULL,
      base_score REAL NOT NULL DEFAULT 0,
      max_score REAL,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS assessment_rules (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL REFERENCES subject_configs(subject_id),
      name TEXT NOT NULL,
      score_type TEXT NOT NULL DEFAULT 'bonus',
      score REAL NOT NULL DEFAULT 0,
      condition_field TEXT NOT NULL DEFAULT '',
      condition_operator TEXT NOT NULL DEFAULT 'eq',
      condition_value TEXT NOT NULL DEFAULT '',
      material_required INTEGER NOT NULL DEFAULT 0,
      material_name TEXT,
      source_text TEXT,
      source_page INTEGER,
      confidence REAL,
      confirmed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS student_import_batches (
      id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL DEFAULT '',
      row_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS student_rows (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL REFERENCES student_import_batches(id),
      student_id TEXT NOT NULL DEFAULT '',
      student_name TEXT NOT NULL DEFAULT '',
      raw_data_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS calculation_results (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      base_score REAL NOT NULL DEFAULT 0,
      bonus_total REAL NOT NULL DEFAULT 0,
      penalty_total REAL NOT NULL DEFAULT 0,
      final_score REAL NOT NULL DEFAULT 0,
      missing_materials_json TEXT NOT NULL DEFAULT '[]',
      rule_results_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}
