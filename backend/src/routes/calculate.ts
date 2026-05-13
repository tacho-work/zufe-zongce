import { Router } from 'express';
import { queryAll, run } from '../db/connection.js';

const router = Router();

// POST /api/calculate — run calculation for all students
router.post('/calculate', (_req, res) => {
  const subjectConfigs = queryAll<Record<string, unknown>>(
    'SELECT * FROM subject_configs',
  );

  const students = queryAll<Record<string, unknown>>(
    'SELECT * FROM student_rows',
  );

  const results: Array<{
    studentId: string;
    studentName: string;
    subjectScores: Record<string, number>;
    totalScore: number;
    missingMaterialCount: number;
    warningCount: number;
  }> = [];

  for (const student of students) {
    const subjectScores: Record<string, number> = {};
    let missingMat = 0;
    let warnings = 0;

    for (const config of subjectConfigs) {
      const sid = config.subject_id as string;
      const base = (config.base_score as number) ?? 0;

      const rules = queryAll<Record<string, unknown>>(
        'SELECT * FROM assessment_rules WHERE subject_id = ? AND confirmed = 1',
        [sid],
      );

      let bonusSum = 0;
      let penaltySum = 0;

      for (const rule of rules) {
        if (rule.score_type === 'bonus') bonusSum += (rule.score as number) ?? 0;
        if (rule.score_type === 'penalty') penaltySum += (rule.score as number) ?? 0;
        if (rule.material_required && !rule.material_name) missingMat++;
      }

      const finalScore = base + bonusSum - penaltySum;
      subjectScores[sid] = finalScore;

      // Store calculation result
      const resultId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      run(
        `INSERT OR REPLACE INTO calculation_results
         (id, student_id, subject_id, base_score, bonus_total, penalty_total, final_score, missing_materials_json, rule_results_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, '[]', '[]')`,
        [resultId, student.student_id as import('sql.js').SqlValue, sid, base, bonusSum, penaltySum, finalScore] as import('sql.js').SqlValue[],
      );

      if (finalScore < 0) warnings++;
    }

    const totalScore = Object.values(subjectScores).reduce((a, b) => a + b, 0);

    results.push({
      studentId: student.student_id as string,
      studentName: student.student_name as string,
      subjectScores,
      totalScore,
      missingMaterialCount: missingMat,
      warningCount: warnings,
    });
  }

  res.json(results);
});

export default router;
