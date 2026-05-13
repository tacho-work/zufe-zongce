import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from '../db/connection.js';
import { getStudentFillData } from './templateData.js';

beforeAll(async () => {
  await getDb();
});

describe('getStudentFillData', () => {
  it('returns fill data for an existing student with correct subtotals', () => {
    const data = getStudentFillData('2024001');
    expect(data).not.toBeNull();

    // Based on calculation_results in zongce.db for 张三 (2024001)
    expect(data!['moral_subtotal']).toBe('79');
    expect(data!['academic_subtotal']).toBe('82');
    expect(data!['sports_subtotal']).toBe('68');
    expect(data!['aesthetic_subtotal']).toBe('76');
    expect(data!['labor_subtotal']).toBe('73');
    expect(data!['total_score']).toBe('');
  });

  it('fills base score fields for academic and sports', () => {
    const data = getStudentFillData('2024001');
    expect(data).not.toBeNull();

    expect(data!['academic_base_scores']).toBe('60');
    expect(data!['sports_base_scores']).toBe('60');
    expect(data!['academic_formula_result']).toContain('60');
  });

  it('categorizes rules by keyword matching from real data', () => {
    const data = getStudentFillData('2024001');
    expect(data).not.toBeNull();

    // academic: 竞赛获奖-国家级 + 竞赛获奖-省级 → academic_competition (matched by '竞赛')
    expect(data!['academic_competition_details']).toContain('竞赛获奖-国家级');
    expect(data!['academic_competition_details']).toContain('竞赛获奖-省级');
    expect(data!['academic_competition_scores']).toContain('+10');
    expect(data!['academic_competition_scores']).toContain('+5');

    // academic: 挂科 (no keyword match) → academic_other
    expect(data!['academic_other_details']).toBe('');
    expect(data!['academic_other_scores']).toBe('');

    // labor: 宿舍卫生不达标 → labor_dormitory (matched by '宿舍')
    expect(data!['labor_dormitory_details']).toContain('宿舍卫生不达标');
    expect(data!['labor_dormitory_scores']).toContain('-2');

    // aesthetic: 文艺演出 → aesthetic_competition (matched by '文艺')
    expect(data!['aesthetic_competition_details']).toContain('文艺演出');
    expect(data!['aesthetic_competition_scores']).toContain('+4');
  });

  it('handles moral rules that fall to other category', () => {
    const data = getStudentFillData('2024001');
    expect(data).not.toBeNull();

    // 三好学生, 优秀班干部 — none contain '荣誉','比赛','活动' → moral_other, left empty for manual fill
    expect(data!['moral_other_details']).toBe('');
    expect(data!['moral_other_scores']).toBe('');

    // Dedicated moral categories should be empty
    expect(data!['moral_honor_details']).toBe('');
    expect(data!['moral_competition_details']).toBe('');
    expect(data!['moral_activity_details']).toBe('');
  });

  it('returns null for non-existent student', () => {
    const data = getStudentFillData('NONEXISTENT');
    expect(data).toBeNull();
  });

  it('fills all expected placeholder keys', () => {
    const data = getStudentFillData('2024001');
    expect(data).not.toBeNull();

    // Subject subtotals
    expect(data!['moral_subtotal']).toBeDefined();
    expect(data!['academic_subtotal']).toBeDefined();
    expect(data!['sports_subtotal']).toBeDefined();
    expect(data!['aesthetic_subtotal']).toBeDefined();
    expect(data!['labor_subtotal']).toBeDefined();
    expect(data!['total_score']).toBeDefined();

    // Base score fields
    expect(data!['academic_base_scores']).toBeDefined();
    expect(data!['academic_formula_result']).toBeDefined();
    expect(data!['sports_base_scores']).toBeDefined();
    expect(data!['sports_score_details']).toBeDefined();

    // All category placeholders (even empty ones) should be present
    expect(data!['moral_honor_details']).toBeDefined();
    expect(data!['moral_honor_scores']).toBeDefined();
    expect(data!['moral_competition_details']).toBeDefined();
    expect(data!['moral_competition_scores']).toBeDefined();
    expect(data!['moral_activity_details']).toBeDefined();
    expect(data!['moral_activity_scores']).toBeDefined();
    expect(data!['moral_other_details']).toBeDefined();
    expect(data!['moral_other_scores']).toBeDefined();

    expect(data!['academic_competition_details']).toBeDefined();
    expect(data!['academic_competition_scores']).toBeDefined();
    expect(data!['academic_exam_details']).toBeDefined();
    expect(data!['academic_exam_scores']).toBeDefined();
    expect(data!['academic_certificate_details']).toBeDefined();
    expect(data!['academic_certificate_scores']).toBeDefined();
    expect(data!['academic_research_details']).toBeDefined();
    expect(data!['academic_research_scores']).toBeDefined();

    expect(data!['sports_competition_details']).toBeDefined();
    expect(data!['sports_competition_scores']).toBeDefined();
    expect(data!['sports_base_scores']).toBeDefined();
    expect(data!['sports_score_details']).toBeDefined();

    expect(data!['aesthetic_activity_details']).toBeDefined();
    expect(data!['aesthetic_activity_scores']).toBeDefined();
    expect(data!['aesthetic_competition_details']).toBeDefined();
    expect(data!['aesthetic_competition_scores']).toBeDefined();
    expect(data!['aesthetic_publication_details']).toBeDefined();
    expect(data!['aesthetic_publication_scores']).toBeDefined();

    expect(data!['labor_dormitory_details']).toBeDefined();
    expect(data!['labor_dormitory_scores']).toBeDefined();
    expect(data!['labor_activity_details']).toBeDefined();
    expect(data!['labor_activity_scores']).toBeDefined();
    expect(data!['labor_entrepreneurship_details']).toBeDefined();
    expect(data!['labor_entrepreneurship_scores']).toBeDefined();
    expect(data!['labor_project_details']).toBeDefined();
    expect(data!['labor_project_scores']).toBeDefined();
  });
});
