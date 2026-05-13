import fs from 'node:fs';
import path from 'node:path';
import { getDataDir } from '../utils/paths.js';

export type AcademicRuleDirection = 'bonus' | 'penalty';
export type AcademicScoreUnit = 'fixed' | 'per_time';
export type AcademicConstraintType =
  | 'notice_only'
  | 'exclusive_max'
  | 'cap_total'
  | 'cap_group'
  | 'multiplier'
  | 'per_time';

export interface AcademicScoreItem {
  id: string;
  name: string;
  direction: AcademicRuleDirection;
  baseScore: number;
  scoreUnit: AcademicScoreUnit;
  category: string;
  groupKey: string;
  keywords: string[];
  constraintIds: string[];
  sourceText: string;
  sourcePage: number | null;
}

export interface AcademicConstraint {
  id: string;
  name: string;
  type: AcademicConstraintType;
  scope: Record<string, unknown>;
  calculation?: {
    mode?: AcademicConstraintType;
    maxScore?: number;
    factor?: number;
    direction?: AcademicRuleDirection;
    compareBy?: 'rawScore' | 'adjustedScore' | 'finalScore';
  };
  message: string;
  sourceText: string;
  sourcePage: number | null;
  maxScore?: number;
  factor?: number;
}

export interface AcademicRulesResponse {
  subjectId: string;
  subjectName: string;
  scoreItems: AcademicScoreItem[];
  constraints: AcademicConstraint[];
}

interface SubjectRulesBlock {
  label?: string;
  scoreItems?: AcademicScoreItem[];
  constraints?: AcademicConstraint[];
}

interface AcademicRulesFile {
  schemaVersion: string;
  subjects?: Record<string, SubjectRulesBlock | null | undefined>;
}

const RULES_PATH = path.join(getDataDir(), 'output.json');

const SUBJECT_LABELS: Record<string, string> = {
  moral: '德育',
  academic: '智育',
  sports: '体育',
  aesthetic: '美育',
  labor: '劳育',
};

function assertRulesFile(value: unknown): asserts value is AcademicRulesFile {
  if (!value || typeof value !== 'object') {
    throw new Error('Rules file root must be an object');
  }

  const file = value as AcademicRulesFile;
  if (file.subjects !== undefined && (!file.subjects || typeof file.subjects !== 'object')) {
    throw new Error('subjects must be an object when present');
  }
}

function readRulesFile(): AcademicRulesFile {
  const raw = fs.readFileSync(RULES_PATH, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  assertRulesFile(parsed);
  return parsed;
}

export function loadSubjectRules(subjectId: string): AcademicRulesResponse {
  const parsed = readRulesFile();
  const subject = parsed.subjects?.[subjectId];
  const subjectName = subject?.label ?? SUBJECT_LABELS[subjectId] ?? subjectId;

  if (!subject) {
    return {
      subjectId,
      subjectName,
      scoreItems: [],
      constraints: [],
    };
  }

  if (subject.scoreItems !== undefined && !Array.isArray(subject.scoreItems)) {
    throw new Error(`subjects.${subjectId}.scoreItems must be an array when present`);
  }
  if (subject.constraints !== undefined && !Array.isArray(subject.constraints)) {
    throw new Error(`subjects.${subjectId}.constraints must be an array when present`);
  }

  return {
    subjectId,
    subjectName,
    scoreItems: subject.scoreItems ?? [],
    constraints: subject.constraints ?? [],
  };
}

export function loadAcademicRules(): AcademicRulesResponse {
  return loadSubjectRules('academic');
}
