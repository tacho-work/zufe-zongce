import { queryAll, queryOne } from '../db/connection.js';

interface Rule {
  name: string;
  score_type: string;
  score: number;
  subject_id: string;
}

interface CalcResult {
  subject_id: string;
  base_score: number;
  bonus_total: number;
  penalty_total: number;
  final_score: number;
}

// Keyword → placeholder prefix mapping per subject
const CATEGORY_MAP: Record<string, Array<{ kw: string; prefix: string }>> = {
  moral: [
    { kw: '荣誉', prefix: 'moral_honor' },
    { kw: '比赛', prefix: 'moral_competition' },
    { kw: '活动', prefix: 'moral_activity' },
  ],
  academic: [
    { kw: '比赛', prefix: 'academic_competition' },
    { kw: '竞赛', prefix: 'academic_competition' },
    { kw: '等级', prefix: 'academic_exam' },
    { kw: '考试', prefix: 'academic_exam' },
    { kw: '证书', prefix: 'academic_certificate' },
    { kw: '科研', prefix: 'academic_research' },
    { kw: '论文', prefix: 'academic_research' },
  ],
  sports: [
    { kw: '竞赛', prefix: 'sports_competition' },
    { kw: '比赛', prefix: 'sports_competition' },
  ],
  aesthetic: [
    { kw: '活动', prefix: 'aesthetic_activity' },
    { kw: '竞赛', prefix: 'aesthetic_competition' },
    { kw: '比赛', prefix: 'aesthetic_competition' },
    { kw: '文艺', prefix: 'aesthetic_competition' },
    { kw: '发表', prefix: 'aesthetic_publication' },
    { kw: '作品', prefix: 'aesthetic_publication' },
  ],
  labor: [
    { kw: '寝室', prefix: 'labor_dormitory' },
    { kw: '宿舍', prefix: 'labor_dormitory' },
    { kw: '活动', prefix: 'labor_activity' },
    { kw: '创业', prefix: 'labor_entrepreneurship' },
    { kw: '实践', prefix: 'labor_entrepreneurship' },
    { kw: '项目', prefix: 'labor_project' },
    { kw: '获奖', prefix: 'labor_project' },
  ],
};

function categorizeRule(subjectId: string, ruleName: string): string {
  const subjectMap = CATEGORY_MAP[subjectId];
  if (!subjectMap) return `${subjectId}_other`;

  for (const { kw, prefix } of subjectMap) {
    if (ruleName.includes(kw)) return prefix;
  }
  return `${subjectId}_other`;
}

function formatScore(scoreType: string, score: number): string {
  const sign = scoreType === 'penalty' ? '-' : '+';
  return `${sign}${Math.abs(score)}`;
}

function toNumber(value: number | string): number {
  return typeof value === 'number' ? value : Number(value);
}

export function buildFillData(
  calcResults: CalcResult[],
  rules: Rule[],
): Record<string, string> {
  const data: Record<string, string> = {};

  // Group rules by subject
  const rulesBySubject: Record<string, Rule[]> = {};
  for (const rule of rules) {
    if (rule.score_type !== 'bonus' && rule.score_type !== 'penalty') continue;
    const sid = rule.subject_id;
    if (!rulesBySubject[sid]) rulesBySubject[sid] = [];
    rulesBySubject[sid].push(rule);
  }

  const subjectOrder = ['moral', 'academic', 'sports', 'aesthetic', 'labor'];

  // Per-subject processing
  for (const sid of subjectOrder) {
    const calc = calcResults.find((c) => c.subject_id === sid);
    const subjectRules = rulesBySubject[sid] || [];

    // Group rules by category
    const grouped: Record<string, Rule[]> = {};
    for (const rule of subjectRules) {
      const prefix = categorizeRule(sid, rule.name);
      if (!grouped[prefix]) grouped[prefix] = [];
      grouped[prefix].push(rule);
    }

    // Fill details and scores for each category (skip _other — user fills manually)
    for (const [prefix, catRules] of Object.entries(grouped)) {
      if (prefix === `${sid}_other`) continue;
      const details = catRules.map((r) => `${r.name} ${formatScore(r.score_type, r.score)}分`).join('\n');
      const scores = catRules.map((r) => formatScore(r.score_type, r.score)).join('\n');
      data[`${prefix}_details`] = details;
      data[`${prefix}_scores`] = scores;
    }

    // Fill placeholder categories that have no rules with empty string
    const allPrefixes = new Set<string>();
    for (const cat of (CATEGORY_MAP[sid] || [])) {
      allPrefixes.add(cat.prefix);
    }
    allPrefixes.add(`${sid}_other`);

    for (const prefix of allPrefixes) {
      if (data[`${prefix}_details`] === undefined) data[`${prefix}_details`] = '';
      if (data[`${prefix}_scores`] === undefined) data[`${prefix}_scores`] = '';
    }

    // Subtotal
    if (calc) {
      data[`${sid}_subtotal`] = String(toNumber(calc.final_score));
    }

    // Base score specifics
    if (sid === 'academic' && calc) {
      const baseScore = toNumber(calc.base_score);
      data.academic_formula_result = `学业成绩基础分: ${baseScore}分`;
      data.academic_base_scores = String(baseScore);
    }
    if (sid === 'sports' && calc) {
      const baseScore = toNumber(calc.base_score);
      data.sports_score_details = `体育基础成绩: ${baseScore}分`;
      data.sports_base_scores = String(baseScore);
    }
  }

  // total_score left empty for user to fill manually
  data.total_score = '';

  return data;
}

export function getFirstStudentFillData(): Record<string, string> | null {
  const first = queryOne<{ student_id: string }>(
    'SELECT student_id FROM student_rows LIMIT 1',
  );
  if (!first) return null;
  return getStudentFillData(first.student_id);
}

export function getStudentFillData(studentId: string): Record<string, string> | null {
  // Verify student exists
  const student = queryOne<{ student_id: string }>(
    'SELECT student_id FROM student_rows WHERE student_id = ?',
    [studentId],
  );
  if (!student) return null;

  // Get calculation results
  const calcResults = queryAll<CalcResult>(
    'SELECT * FROM calculation_results WHERE student_id = ?',
    [studentId],
  );
  if (calcResults.length === 0) return null;

  // Get all subject configs (to know which subjects exist)
  const subjectConfigs = queryAll<{ subject_id: string }>(
    'SELECT subject_id FROM subject_configs',
  );

  // Get confirmed rules per subject
  const allRules: Rule[] = [];
  for (const sc of subjectConfigs) {
    const rules = queryAll<Rule>(
      "SELECT * FROM assessment_rules WHERE subject_id = ? AND confirmed = 1",
      [sc.subject_id],
    );
    allRules.push(...rules);
  }

  return buildFillData(calcResults, allRules);
}
