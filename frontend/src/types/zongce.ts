// ============================================================
// Shared zongce (综测) types — frontend
// ============================================================

export const ASSESSMENT_SUBJECTS = [
  { id: 'moral', name: '德育' },
  { id: 'academic', name: '智育' },
  { id: 'sports', name: '体育' },
  { id: 'aesthetic', name: '美育' },
  { id: 'labor', name: '劳育' },
] as const;

export type SubjectId = (typeof ASSESSMENT_SUBJECTS)[number]['id'];

export const SUBJECT_ID_SET: Set<string> = new Set(ASSESSMENT_SUBJECTS.map((s) => s.id));

export const SUBJECT_LABEL_MAP: Record<SubjectId, string> = Object.fromEntries(
  ASSESSMENT_SUBJECTS.map((s) => [s.id, s.name]),
) as Record<SubjectId, string>;

export const SUBJECT_ICON_MAP: Record<SubjectId, string> = {
  moral: 'ShieldCheck',
  academic: 'BookOpen',
  sports: 'Dumbbell',
  aesthetic: 'Palette',
  labor: 'Wrench',
};

// ---- Domain types ----

export interface SubjectConfig {
  subjectId: SubjectId;
  subjectName: string;
  baseScore: number;
  maxScore?: number;
  status: 'empty' | 'draft' | 'confirmed' | 'has_issues';
  rules: AssessmentRule[];
  confirmedRuleCount?: number;
  missingMaterialCount?: number;
  currentEstimatedScore?: number;
}

export interface AssessmentRule {
  id: string;
  subjectId: SubjectId;
  name: string;
  scoreType: 'bonus' | 'penalty';
  score: number;
  condition: RuleCondition;
  materialRequired: boolean;
  materialName?: string;
  sourceText?: string;
  sourcePage?: number;
  confidence?: number;
  confirmed: boolean;
}

export interface RuleCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'regex';
  value: unknown;
}

// ---- Bonus / proof items (UI-only, not persisted) ----

export interface BonusItem {
  id: string;
  name: string;
  score: number;
  material: string;
  description: string;
}

// ---- Page navigation ----

export interface NavPage {
  id: string;
  title: string;
  shortTitle: string;
  path: string;
  iconName: string;
}

export const NAV_PAGES: NavPage[] = [
  { id: 'moral', title: '德育', shortTitle: '德育', path: '/moral', iconName: 'ShieldCheck' },
  { id: 'academic', title: '智育', shortTitle: '智育', path: '/academic', iconName: 'BookOpen' },
  { id: 'sports', title: '体育', shortTitle: '体育', path: '/sports', iconName: 'Dumbbell' },
  { id: 'aesthetic', title: '美育', shortTitle: '美育', path: '/aesthetic', iconName: 'Palette' },
  { id: 'labor', title: '劳育', shortTitle: '劳育', path: '/labor', iconName: 'Wrench' },
  { id: 'export', title: '导出', shortTitle: '导出', path: '/export', iconName: 'FileDown' },
  { id: 'settings', title: '设置', shortTitle: '设置', path: '/settings', iconName: 'Settings' },
];

// ---- API response types ----

export interface SubjectSummary {
  subjectId: SubjectId;
  subjectName: string;
  baseScore: number;
  maxScore?: number;
  status: string;
  ruleCount: number;
  confirmedRuleCount: number;
  missingMaterialCount: number;
  currentEstimatedScore: number;
}

// ---- Academic base score types ----

export interface AcademicBaseScoreCourse {
  courseName: string;
  credit: number;
  rawScore: string | number;
  convertedScore: number;
  weightedScore: number;
}

export interface AcademicBaseScoreSemesterGroup {
  semester: string;
  courses: AcademicBaseScoreCourse[];
}

export interface AcademicBaseScoreResult {
  subjectId: "academic" | "sports";
  fileName: string;
  courseCount: number;
  totalCredits: number;
  totalWeightedScore: number;
  baseScore: number;
  formulaText: string;
  semesters: AcademicBaseScoreSemesterGroup[];
  warnings: string[];
}

// ---- Subject bonus rule system ----

export type RuleDirection = 'bonus' | 'penalty';
export type ScoreUnit = 'fixed' | 'per_time';
export type ConstraintType =
  | 'notice_only'
  | 'exclusive_max'
  | 'cap_total'
  | 'cap_group'
  | 'multiplier'
  | 'per_time';

export interface ScoreItem {
  id: string;
  name: string;
  direction: RuleDirection;
  baseScore: number;
  scoreUnit: ScoreUnit;
  category: string;
  groupKey: string;
  keywords: string[];
  constraintIds: string[];
  sourceText: string;
  sourcePage: number | null;
}

export interface Constraint {
  id: string;
  name: string;
  type: ConstraintType;
  scope: Record<string, unknown>;
  calculation?: {
    mode?: ConstraintType;
    maxScore?: number;
    factor?: number;
    direction?: RuleDirection;
    compareBy?: 'rawScore' | 'adjustedScore' | 'finalScore';
  };
  message: string;
  sourceText: string;
  sourcePage: number | null;
  maxScore?: number;
  factor?: number;
}

export interface SubjectRulesResponse {
  subjectId: SubjectId;
  subjectName: string;
  scoreItems: ScoreItem[];
  constraints: Constraint[];
}

export interface ConfirmationState {
  teamRoleFactor?: number;
  teamRoleLabel?: string;
  authorRoleFactor?: number;
  authorRoleLabel?: string;
  materialConfirmed?: boolean;
  levelConfirmed?: boolean;
  scopeConfirmed?: boolean;
  examTimeConfirmed?: boolean;
  researchRecognized?: boolean;
  researchFormalConfirmed?: boolean;
  paperAcceptanceEligible?: boolean;
  priorScore?: number;
  manualScore?: number;
}

export interface ScoreRecord {
  id: string;
  itemId: string;
  name: string;
  direction: RuleDirection;
  category: string;
  groupKey: string;
  quantity: number;
  rawScore: number;
  adjustedScore: number;
  finalScore: number;
  constraintMessages: string[];
  confirmationMessages?: string[];
  adjustmentReason?: string;
  sourceText: string;
  sourcePage: number | null;
}

export type AcademicRuleDirection = RuleDirection;
export type AcademicScoreUnit = ScoreUnit;
export type AcademicConstraintType = ConstraintType;
export type AcademicScoreItem = ScoreItem;
export type AcademicConstraint = Constraint;
export type AcademicRulesResponse = SubjectRulesResponse & {
  subjectId: 'academic';
  subjectName: '智育';
};
export type AcademicConfirmationState = ConfirmationState;
export type AcademicScoreRecord = ScoreRecord;

// ---- Template export types ----

export interface TemplateUploadResponse {
  filename: string;
  placeholders: string[];
  uploadedAt: string;
}

export interface TemplatePlaceholdersResponse {
  placeholders: string[];
  hasTemplate: boolean;
  filename: string | null;
}

export interface FillPreviewResponse {
  placeholders: string[];
  fillData: Record<string, string>;
  placeholderLabels: Record<string, { section: string; column: string }>;
}
