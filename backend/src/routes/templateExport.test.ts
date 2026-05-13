import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createTestDocx } from '../services/test-utils.js';
import { createTemplateRouter } from './templateExport.js';

let tmpDir: string;
let app: express.Express;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'template-test-'));
  process.env.TEMPLATE_STORAGE_DIR = tmpDir;

  app = express();
  app.use(express.json());
  app.use('/api/export/template', createTemplateRouter());
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.TEMPLATE_STORAGE_DIR;
});

describe('POST /api/export/template/upload', () => {
  it('accepts a .docx file and returns placeholders', async () => {
    const docx = createTestDocx(
      '<w:p><w:r><w:t>{{test_placeholder}}</w:t></w:r></w:p>',
    );

    const res = await request(app)
      .post('/api/export/template/upload')
      .attach('file', docx, 'test-template.docx');

    expect(res.status).toBe(200);
    expect(res.body.filename).toBe('test-template.docx');
    expect(res.body.placeholders).toContain('test_placeholder');
    expect(res.body.uploadedAt).toBeDefined();
  });

  it('rejects non-docx file', async () => {
    const res = await request(app)
      .post('/api/export/template/upload')
      .attach('file', Buffer.from('not a docx'), 'test.txt');

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

describe('GET /api/export/template/placeholders', () => {
  it('returns placeholders after upload', async () => {
    const res = await request(app)
      .get('/api/export/template/placeholders');

    // The previous test uploaded a template with 'test_placeholder'
    expect(res.status).toBe(200);
    expect(res.body.hasTemplate).toBe(true);
    expect(res.body.placeholders).toContain('test_placeholder');
  });
});

describe('DELETE /api/export/template', () => {
  it('deletes the template and returns ok', async () => {
    const res = await request(app)
      .delete('/api/export/template');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns no-template state after deletion', async () => {
    const res = await request(app)
      .get('/api/export/template/placeholders');

    expect(res.status).toBe(200);
    expect(res.body.hasTemplate).toBe(false);
    expect(res.body.placeholders).toEqual([]);
  });
});
