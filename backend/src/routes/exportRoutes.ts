import { Router } from 'express';
import { queryAll, queryOne } from '../db/connection.js';

const router = Router();

// GET /api/export/score-summary — return submitted scores per subject
router.get('/export/score-summary', (_req, res) => {
  try {
    const configs = queryAll<Record<string, unknown>>(
      'SELECT * FROM subject_configs ORDER BY subject_id',
    );

    const subjects = configs.map((c) => {
      const calc = queryOne<Record<string, unknown>>(
        'SELECT final_score FROM calculation_results WHERE subject_id = ?',
        [c.subject_id as string],
      );
      return {
        subjectId: c.subject_id,
        subjectName: c.subject_name,
        baseScore: (c.base_score as number) ?? 0,
        totalScore: calc ? ((calc.final_score as number) ?? null) : null,
      };
    });

    res.json({ subjects });
  } catch (err: unknown) {
    const e = err as Error;
    console.error('score-summary error:', e.stack ?? e.message);
    res.status(500).json({ error: e.message ?? 'Unknown error' });
  }
});

// GET /api/export/preview — return data for export preview page
router.get('/export/preview', (_req, res) => {
  const subjects = queryAll<Record<string, unknown>>(
    'SELECT * FROM subject_configs',
  );

  const students = queryAll<Record<string, unknown>>(
    'SELECT * FROM student_rows',
  );

  const subjectSummaries: Record<string, unknown> = {};
  for (const s of subjects) {
    const rules = queryAll<Record<string, unknown>>(
      'SELECT * FROM assessment_rules WHERE subject_id = ?',
      [s.subject_id as string],
    );
    subjectSummaries[s.subject_id as string] = {
      baseScore: s.base_score,
      ruleCount: rules.length,
    };
  }

  const studentResults: Array<unknown> = [];
  let totalMissing = 0;
  let totalWarnings = 0;
  let scoreSum = 0;

  for (const student of students) {
    const calcResults = queryAll<Record<string, unknown>>(
      'SELECT * FROM calculation_results WHERE student_id = ?',
      [student.student_id as string],
    );

    const subjectScores: Record<string, number> = {};
    let missing = 0;
    let warnings = 0;

    for (const cr of calcResults) {
      subjectScores[cr.subject_id as string] = (cr.final_score as number) ?? 0;
      if (cr.final_score && (cr.final_score as number) < 0) warnings++;
    }

    // Fill in subjects without calc results
    for (const s of subjects) {
      if (!(s.subject_id as string in subjectScores)) {
        subjectScores[s.subject_id as string] = (s.base_score as number) ?? 0;
      }
    }

    const totalScore = Object.values(subjectScores).reduce((a, b) => a + b, 0);
    scoreSum += totalScore;
    totalMissing += missing;
    totalWarnings += warnings;

    studentResults.push({
      studentId: student.student_id,
      studentName: student.student_name,
      subjectScores,
      totalScore,
      missingMaterialCount: missing,
      warningCount: warnings,
    });
  }

  const studentCount = students.length;

  res.json({
    students: studentResults,
    subjectSummaries,
    totals: {
      studentCount,
      subjectCount: subjects.length,
      averageScore: studentCount > 0 ? Math.round((scoreSum / studentCount) * 100) / 100 : 0,
      missingMaterialCount: totalMissing,
      warningCount: totalWarnings,
    },
  });
});

export default router;
