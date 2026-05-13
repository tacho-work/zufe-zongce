// ============================================================
// Shared zongce (综测) types — backend
// ============================================================

export const ASSESSMENT_SUBJECTS = [
  { id: 'moral' as const, name: '德育' },
  { id: 'academic' as const, name: '智育' },
  { id: 'sports' as const, name: '体育' },
  { id: 'aesthetic' as const, name: '美育' },
  { id: 'labor' as const, name: '劳育' },
];

export type SubjectId = (typeof ASSESSMENT_SUBJECTS)[number]['id'];

export interface SubjectConfigRow {
  subject_id: string;
  subject_name: string;
  base_score: number;
  max_score: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AssessmentRuleRow {
  id: string;
  subject_id: string;
  name: string;
  score_type: string;
  score: number;
  condition_field: string;
  condition_operator: string;
  condition_value: string;
  material_required: number;
  material_name: string | null;
  source_text: string | null;
  source_page: number | null;
  confidence: number | null;
  confirmed: number;
  created_at: string;
  updated_at: string;
}

export interface RuleCandidateRow {
  id: string;
  suggested_subject_id: string | null;
  name: string;
  score_type: string;
  score: number;
  material_required: number;
  material_name: string | null;
  source_text: string;
  source_page: number | null;
  confidence: number;
  status: string;
  created_at: string;
}

export interface StudentRow {
  id: string;
  batch_id: string;
  student_id: string;
  student_name: string;
  raw_data_json: string;
  created_at: string;
}

export interface CalculationResultRow {
  id: string;
  student_id: string;
  subject_id: string;
  base_score: number;
  bonus_total: number;
  penalty_total: number;
  final_score: number;
  missing_materials_json: string;
  rule_results_json: string;
  created_at: string;
}
