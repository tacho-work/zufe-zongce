import initSqlJs, { type Database, type SqlJsStatic, type SqlValue } from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import { getDataDir } from '../utils/paths.js';

function getDbPath(): string {
  if (process.env.DB_PATH) return process.env.DB_PATH;
  return path.join(getDataDir(), 'zongce.db');
}

let SQL: SqlJsStatic;
let db: Database;

export async function getDb(): Promise<Database> {
  if (!db) {
    SQL = await initSqlJs();
    if (fs.existsSync(getDbPath())) {
      const buf = fs.readFileSync(getDbPath());
      db = new SQL.Database(buf);
    } else {
      db = new SQL.Database();
    }
  }
  return db;
}

export function saveDb(): void {
  if (db) {
    const data = db.export();
    fs.writeFileSync(getDbPath(), Buffer.from(data));
  }
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = undefined as unknown as Database;
  }
}

/** For testing: reset cached DB so next getDb() re-initializes from TEST_DB_PATH */
export function resetDb(): void {
  db = undefined as unknown as Database;
}

type SqlParams = SqlValue[];

export function queryAll<T = Record<string, unknown>>(sql: string, params: SqlParams = []): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

export function queryOne<T = Record<string, unknown>>(sql: string, params: SqlParams = []): T | undefined {
  const rows = queryAll<T>(sql, params);
  return rows[0];
}

export function run(sql: string, params: SqlParams = []): { changes: number; lastInsertRowid: number } {
  db.run(sql, params);
  const changes = db.getRowsModified();
  const lastId = db.exec('SELECT last_insert_rowid() as id')[0]?.values[0]?.[0] as number ?? 0;
  saveDb();
  return { changes, lastInsertRowid: lastId };
}

export function exec(sql: string): void {
  db.exec(sql);
  saveDb();
}
