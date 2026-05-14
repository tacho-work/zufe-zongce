import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { getDb, resetDb, queryAll, queryOne } from '../db/connection.js';
import { seed } from '../db/seed.js';
import subjectsRouter from './subjects.js';
import exportRouter from './exportRoutes.js';

let tmpDir: string;
let dbPath: string;
let app: express.Express;

beforeAll(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), 'submit-test-'));
  dbPath = join(tmpDir, 'test.db');
  process.env.TEST_DB_PATH = dbPath;
  resetDb();

  await getDb();
  await seed();

  app = express();
  app.use(express.json());
  app.use('/api', subjectsRouter);
  app.use('/api', exportRouter);
});

afterAll(() => {
  delete process.env.TEST_DB_PATH;
  resetDb();
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('PUT /api/subjects/:subjectId/submit', () => {
  it('submits rules and total score for a subject', async () => {
    const res = await request(app)
      .put('/api/subjects/moral/submit')
      .send({
        baseScore: 70,
        totalScore: 85.5,
        entries: [
          {
            name: '三好学生',
            scoreType: 'bonus',
            score: 5,
            baseScore: 5,
            quantity: 1,
            constraintMessages: [],
            sourceText: '三好学生加5分',
            sourcePage: 1,
          },
          {
            name: '违纪处分',
            scoreType: 'penalty',
            score: 10,
            baseScore: 10,
            quantity: 1,
            constraintMessages: [],
            sourceText: '违纪扣10分',
            sourcePage: 1,
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const rules = queryAll(
      "SELECT * FROM assessment_rules WHERE subject_id = 'moral' AND confirmed = 1",
    );
    expect(rules.length).toBe(2);

    const calc = queryOne(
      "SELECT * FROM calculation_results WHERE subject_id = 'moral'",
    );
    expect(calc).toBeDefined();
    expect((calc as any).final_score).toBe(85.5);
    expect((calc as any).base_score).toBe(70);
  });

  it('overwrites previous submission for same subject', async () => {
    // First submit
    await request(app)
      .put('/api/subjects/moral/submit')
      .send({
        baseScore: 70,
        totalScore: 80,
        entries: [
          { name: '三好学生', scoreType: 'bonus', score: 5, baseScore: 5, quantity: 1, constraintMessages: [], sourceText: '', sourcePage: null },
        ],
      });

    const rulesAfterFirst = queryAll(
      "SELECT * FROM assessment_rules WHERE subject_id = 'moral' AND confirmed = 1",
    );
    expect(rulesAfterFirst.length).toBe(1);

    // Second submit — overwrite
    const res = await request(app)
      .put('/api/subjects/moral/submit')
      .send({
        baseScore: 70,
        totalScore: 90,
        entries: [
          { name: '优秀班干部', scoreType: 'bonus', score: 4, baseScore: 4, quantity: 1, constraintMessages: [], sourceText: '', sourcePage: null },
          { name: '志愿服务', scoreType: 'bonus', score: 3, baseScore: 3, quantity: 1, constraintMessages: [], sourceText: '', sourcePage: null },
        ],
      });

    expect(res.status).toBe(200);

    const rulesAfterSecond = queryAll(
      "SELECT * FROM assessment_rules WHERE subject_id = 'moral' AND confirmed = 1",
    );
    expect(rulesAfterSecond.length).toBe(2);
    expect(rulesAfterSecond.map((r: any) => r.name).sort()).toEqual(['优秀班干部', '志愿服务']);

    const calc = queryOne(
      "SELECT * FROM calculation_results WHERE subject_id = 'moral'",
    ) as any;
    expect(calc.final_score).toBe(90);
  });

  it('rejects invalid subjectId', async () => {
    const res = await request(app)
      .put('/api/subjects/invalid/submit')
      .send({
        baseScore: 0,
        totalScore: 0,
        entries: [],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

describe('GET /api/export/score-summary', () => {
  it('returns score summary with submitted and unsubmitted subjects', async () => {
    // Submit one subject
    await request(app)
      .put('/api/subjects/moral/submit')
      .send({
        baseScore: 70,
        totalScore: 85,
        entries: [
          { name: '三好学生', scoreType: 'bonus', score: 5, baseScore: 5, quantity: 1, constraintMessages: [], sourceText: '', sourcePage: null },
        ],
      });

    const res = await request(app).get('/api/export/score-summary');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.subjects)).toBe(true);

    const moral = res.body.subjects.find((s: any) => s.subjectId === 'moral');
    expect(moral).toBeDefined();
    expect(moral.totalScore).toBe(85);
    expect(typeof moral.baseScore).toBe('number');
    console.log('score-summary full:', JSON.stringify(res.body.subjects));

    // Other subjects should have totalScore = null
    const academic = res.body.subjects.find((s: any) => s.subjectId === 'academic');
    expect(academic).toBeDefined();
    expect(academic.totalScore).toBeNull();
  });
});
