import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { PageHeader } from '../components/PageHeader';
import { BaseScoreCard } from '../components/BaseScoreCard';
import { BonusScoreCard } from '../components/BonusScoreCard';
import { CourseScoreImportPanel } from '../components/CourseScoreImportPanel';
import { AcademicBonusRulePanel } from '../components/AcademicBonusRulePanel';
import { FloatingTotalBar } from '../components/FloatingTotalBar';
import type {
  SubjectId,
  AcademicBaseScoreResult,
  ConfirmationState,
  Constraint,
  SubjectRulesResponse,
  ScoreItem,
  ScoreRecord,
} from '../types/zongce';
import { SUBJECT_LABEL_MAP } from '../types/zongce';
import { api } from '../services/api';
import './SubjectPage.css';

interface Props {
  subjectId: SubjectId;
}

const EMPTY_BASE_SCORE = 0;
const BASE_SCORE_UPLOAD_SUBJECTS = new Set<SubjectId>(['academic', 'sports']);

type ActiveSection = 'base' | 'bonus';

interface SelectedRuleEntry {
  id: string;
  item: ScoreItem;
  quantity: number;
  confirmations?: ConfirmationState;
}

interface AddEligibility {
  canAdd: boolean;
  reason?: string;
}

function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function getConstraintMaxScore(constraint: Constraint): number | undefined {
  return constraint.calculation?.maxScore ?? constraint.maxScore;
}

function getConstraintFactor(constraint: Constraint): number | undefined {
  return constraint.calculation?.factor ?? constraint.factor;
}

function matchesConstraintDirection(constraint: Constraint, score: number): boolean {
  const direction = constraint.calculation?.direction ?? constraint.scope?.direction;
  if (direction === 'bonus') return score > 0;
  if (direction === 'penalty') return score < 0;
  return true;
}

function isScopedToItem(constraint: Constraint, item: ScoreItem, subjectId: SubjectId): boolean {
  const scopeGroup = constraint.scope?.groupKey;
  const scopeSubject = constraint.scope?.subjectId;
  const groupMatches = typeof scopeGroup === 'string' ? scopeGroup === item.groupKey : true;
  const subjectMatches = typeof scopeSubject === 'string' ? scopeSubject === subjectId : true;
  return groupMatches && subjectMatches;
}

function isTop5NoticeConstraint(constraint: Constraint | undefined): boolean {
  if (!constraint) return false;
  const text = `${constraint.id} ${constraint.name} ${constraint.message}`;
  return constraint.type === 'notice_only' && /top5|最高\s*5\s*项|最高五项|5项/.test(text);
}

function buildConstraintMessages(
  item: ScoreItem,
  constraints: Constraint[],
): string[] {
  return item.constraintIds
    .map((id) => constraints.find((constraint) => constraint.id === id))
    .filter((constraint): constraint is Constraint => Boolean(constraint) && !isTop5NoticeConstraint(constraint))
    .map((constraint) => constraint.message);
}

function hasConstraintMatching(item: ScoreItem, matcher: (constraintId: string) => boolean): boolean {
  return item.constraintIds.some(matcher);
}

function hasConstraintEnding(item: ScoreItem, suffix: string): boolean {
  return hasConstraintMatching(item, (constraintId) => constraintId.endsWith(suffix));
}

function getConfirmationMissingReason(
  item: ScoreItem,
  confirmations: ConfirmationState = {},
): string | undefined {
  if (item.direction === 'bonus' && item.baseScore === 0) {
    if (confirmations.manualScore === undefined) return '请先输入本次计入分值';
    if (!Number.isFinite(confirmations.manualScore) || confirmations.manualScore <= 0) {
      return '本次计入分值必须大于 0';
    }
  }
  if (hasConstraintEnding(item, '_competition_team_ratio_notice') && confirmations.teamRoleFactor === undefined) {
    return '请先确认团队比赛中的角色或贡献率口径';
  }
  if (hasConstraintEnding(item, '_research_author_ratio_notice') && confirmations.authorRoleFactor === undefined) {
    return '请先确认科研成果作者排名折算比例';
  }
  if (hasConstraintEnding(item, '_competition_certificate_notice')) {
    if (confirmations.materialConfirmed === undefined) return '请先确认比赛证书或材料是否有效';
    if (!confirmations.materialConfirmed) return '比赛证书或材料未通过核验，不能计入';
  }
  if (hasConstraintEnding(item, '_competition_level_notice')) {
    if (confirmations.levelConfirmed === undefined) return '请先确认比赛级别是否已按名录认定';
    if (!confirmations.levelConfirmed) return '比赛级别未通过认定，不能计入';
  }
  if (hasConstraintEnding(item, '_competition_official_scope_notice')) {
    if (confirmations.scopeConfirmed === undefined) return '请先确认比赛是否属于正式组织范围';
    if (!confirmations.scopeConfirmed) return '比赛不属于规则认可的正式组织范围，不能计入';
  }
  if (hasConstraintEnding(item, '_exam_time_basis_notice')) {
    if (confirmations.examTimeConfirmed === undefined) return '请先确认考试成绩时间是否归属本学年';
    if (!confirmations.examTimeConfirmed) return '考试成绩时间不归属本学年，不能计入';
  }
  if (hasConstraintEnding(item, '_research_recognition_basis_notice')) {
    if (confirmations.researchRecognized === undefined) return '请先确认科研成果是否已由对应单位认定';
    if (!confirmations.researchRecognized) return '科研成果未完成对应认定，不能计入';
  }
  if (hasConstraintEnding(item, '_research_formal_basis_notice')) {
    if (confirmations.researchFormalConfirmed === undefined) return '请先确认科研成果是否正式立项、发表或满足录用证明条件';
    if (!confirmations.researchFormalConfirmed) return '科研成果尚未满足正式立项、发表或录用证明条件，不能计入';
  }
  if (hasConstraintEnding(item, '_paper_acceptance_eligibility_notice')) {
    if (confirmations.paperAcceptanceEligible === undefined) return '请先确认论文录用证明是否满足国家二级及以上、十月前出刊条件';
    if (!confirmations.paperAcceptanceEligible) return '论文录用证明不满足可减半计分条件，不能计入';
  }
  return undefined;
}

function buildConfirmationMessages(
  item: ScoreItem,
  confirmations: ConfirmationState = {},
): string[] {
  const messages: string[] = [];
  if (confirmations.teamRoleLabel) messages.push(`团队比赛折算：${confirmations.teamRoleLabel}`);
  if (confirmations.authorRoleLabel) messages.push(`作者比例折算：${confirmations.authorRoleLabel}`);
  if (hasConstraintEnding(item, '_competition_certificate_notice') && confirmations.materialConfirmed) {
    messages.push('比赛证书/材料：已核验');
  }
  if (hasConstraintEnding(item, '_competition_level_notice') && confirmations.levelConfirmed) {
    messages.push('比赛级别：已按名录认定');
  }
  if (hasConstraintEnding(item, '_competition_official_scope_notice') && confirmations.scopeConfirmed) {
    messages.push('比赛范围：正式组织赛事');
  }
  if (hasConstraintEnding(item, '_exam_time_basis_notice') && confirmations.examTimeConfirmed) {
    messages.push('考试时间：归属本学年');
  }
  if (hasConstraintEnding(item, '_research_recognition_basis_notice') && confirmations.researchRecognized) {
    messages.push('科研认定：已通过对应单位认定');
  }
  if (hasConstraintEnding(item, '_research_formal_basis_notice') && confirmations.researchFormalConfirmed) {
    messages.push('科研状态：已正式立项、发表或满足录用证明条件');
  }
  if (hasConstraintEnding(item, '_paper_acceptance_eligibility_notice') && confirmations.paperAcceptanceEligible) {
    messages.push('论文录用证明：满足国家二级及以上、十月前出刊条件');
  }
  if (typeof confirmations.priorScore === 'number' && confirmations.priorScore > 0) {
    messages.push(`历史已计入：${formatScore(confirmations.priorScore)} 分`);
  }
  if (typeof confirmations.manualScore === 'number' && confirmations.manualScore > 0) {
    messages.push(`自主填写分值：${formatScore(confirmations.manualScore)} 分`);
  }
  return messages;
}

function getConfirmationFactor(confirmations: ConfirmationState = {}): number {
  let factor = 1;
  if (typeof confirmations.teamRoleFactor === 'number') {
    factor = roundScore(factor * confirmations.teamRoleFactor);
  }
  if (typeof confirmations.authorRoleFactor === 'number') {
    factor = roundScore(factor * confirmations.authorRoleFactor);
  }
  return factor;
}

function calculateRuleRecords(
  entries: SelectedRuleEntry[],
  constraints: Constraint[],
  subjectId: SubjectId,
): ScoreRecord[] {
  const records: ScoreRecord[] = entries.map((entry) => {
    const sign = entry.item.direction === 'penalty' ? -1 : 1;
    const quantity = entry.item.scoreUnit === 'per_time' ? Math.max(1, entry.quantity) : 1;
    const baseScore = entry.item.direction === 'bonus' && entry.item.baseScore === 0
      ? Math.max(0, entry.confirmations?.manualScore ?? 0)
      : entry.item.baseScore;
    const rawScore = roundScore(sign * baseScore * quantity);
    let adjustedScore = rawScore;

    for (const constraintId of entry.item.constraintIds) {
      const constraint = constraints.find((c) => c.id === constraintId);
      const factor = constraint ? getConstraintFactor(constraint) : undefined;
      if (constraint?.type === 'multiplier' && typeof factor === 'number') {
        adjustedScore = roundScore(adjustedScore * factor);
      }
    }

    const confirmationFactor = getConfirmationFactor(entry.confirmations);
    if (confirmationFactor !== 1) {
      adjustedScore = roundScore(adjustedScore * confirmationFactor);
    }

    const confirmationBlockReason = getConfirmationMissingReason(entry.item, entry.confirmations);
    const priorScore = Math.max(0, entry.confirmations?.priorScore ?? 0);
    let finalScore = adjustedScore;
    let adjustmentReason: string | undefined;

    if (confirmationBlockReason) {
      finalScore = 0;
      adjustmentReason = confirmationBlockReason;
    } else if (adjustedScore > 0 && priorScore > 0) {
      finalScore = roundScore(Math.max(0, adjustedScore - priorScore));
      adjustmentReason = finalScore > 0
        ? `补分差：扣除历史已计入 ${formatScore(priorScore)} 分，本次计入 ${formatScore(finalScore)} 分`
        : `补分差：历史已计入 ${formatScore(priorScore)} 分，本次不再计入`;
    }

    return {
      id: entry.id,
      itemId: entry.item.id,
      name: entry.item.name,
      direction: entry.item.direction,
      category: entry.item.category,
      groupKey: entry.item.groupKey,
      quantity,
      rawScore,
      adjustedScore,
      finalScore,
      constraintMessages: buildConstraintMessages(entry.item, constraints),
      confirmationMessages: buildConfirmationMessages(entry.item, entry.confirmations),
      adjustmentReason,
      sourceText: entry.item.sourceText,
      sourcePage: entry.item.sourcePage,
    };
  });

  const nextRecords = records.map((record) => ({ ...record }));

  for (const constraint of constraints.filter((c) => c.type === 'exclusive_max')) {
      const scoped = nextRecords.filter((record, idx) =>
      entries[idx].item.constraintIds.includes(constraint.id) &&
      isScopedToItem(constraint, entries[idx].item, subjectId) &&
      record.finalScore > 0,
    );
    if (scoped.length <= 1) continue;

    const maxScore = Math.max(...scoped.map((record) => record.finalScore));
    let kept = false;
    for (const record of scoped) {
      if (!kept && record.finalScore === maxScore) {
        kept = true;
        continue;
      }
      record.finalScore = 0;
      record.adjustmentReason = `${constraint.name}：同组只计入最高分`;
    }
  }

  for (const constraint of constraints.filter((c) => c.type === 'cap_group' && typeof getConstraintMaxScore(c) === 'number')) {
    let remaining = getConstraintMaxScore(constraint) ?? 0;
    for (let i = 0; i < nextRecords.length; i += 1) {
      const record = nextRecords[i];
      if (!isScopedToItem(constraint, entries[i].item, subjectId) || !matchesConstraintDirection(constraint, record.finalScore)) continue;
      if (remaining <= 0) {
        record.finalScore = 0;
        record.adjustmentReason = `${constraint.name}：已达上限`;
        continue;
      }
      if (record.finalScore > remaining) {
        record.finalScore = roundScore(remaining);
        record.adjustmentReason = `${constraint.name}：超过部分不计入`;
      }
      remaining = roundScore(remaining - record.finalScore);
    }
  }

  for (const constraint of constraints.filter((c) => c.type === 'cap_total' && typeof getConstraintMaxScore(c) === 'number')) {
    let remaining = getConstraintMaxScore(constraint) ?? 0;
    for (const record of nextRecords) {
      if (!matchesConstraintDirection(constraint, record.finalScore)) continue;
      if (remaining <= 0) {
        record.finalScore = 0;
        record.adjustmentReason = `${constraint.name}：已达总上限`;
        continue;
      }
      if (record.finalScore > remaining) {
        record.finalScore = roundScore(remaining);
        record.adjustmentReason = `${constraint.name}：超过总上限部分不计入`;
      }
      remaining = roundScore(remaining - record.finalScore);
    }
  }

  const top5ConstraintIds = new Set(constraints.filter(isTop5NoticeConstraint).map((constraint) => constraint.id));
  const top5Candidates = nextRecords
    .filter((record, idx) =>
      entries[idx].item.constraintIds.some((id) => top5ConstraintIds.has(id)) &&
      record.finalScore > 0,
    )
    .sort((a, b) => b.finalScore - a.finalScore);
  if (top5Candidates.length > 5) {
    const keptIds = new Set(top5Candidates.slice(0, 5).map((record) => record.id));
    for (const record of top5Candidates.slice(5)) {
      if (!keptIds.has(record.id)) {
        record.finalScore = 0;
        record.adjustmentReason = `${SUBJECT_LABEL_MAP[subjectId]}加分最高5项：超出最高5项，暂不计入`;
      }
    }
  }

  return nextRecords.map((record) => ({
    ...record,
    finalScore: roundScore(record.finalScore),
  }));
}

function getRuleAddEligibility(
  entries: SelectedRuleEntry[],
  constraints: Constraint[],
  subjectId: SubjectId,
  item: ScoreItem,
  quantity: number,
  confirmations?: ConfirmationState,
): AddEligibility {
  const missingReason = getConfirmationMissingReason(item, confirmations);
  if (missingReason) return { canAdd: false, reason: missingReason };

  const candidateId = `candidate-${item.id}`;
  const simulatedEntries = [
    ...entries,
    { id: candidateId, item, quantity, confirmations },
  ];
  const simulatedRecords = calculateRuleRecords(simulatedEntries, constraints, subjectId);
  const candidateRecord = simulatedRecords.find((record) => record.id === candidateId);
  if (!candidateRecord) return { canAdd: false, reason: '无法完成规则试算' };

  if (candidateRecord.adjustedScore > 0 && candidateRecord.finalScore <= 0) {
    return {
      canAdd: false,
      reason: candidateRecord.adjustmentReason ?? '该规则已被上限或取高约束拦截',
    };
  }

  return { canAdd: true };
}

export function SubjectPage({ subjectId }: Props) {
  const subjectName = SUBJECT_LABEL_MAP[subjectId];
  const [activeSection, setActiveSection] = useState<ActiveSection>('base');
  const [subjectRules, setSubjectRules] = useState<SubjectRulesResponse | null>(null);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [selectedEntries, setSelectedEntries] = useState<SelectedRuleEntry[]>([]);

  const baseSectionRef = useRef<HTMLDivElement>(null);
  const bonusSectionRef = useRef<HTMLDivElement>(null);

  // Base score state (upload-driven for academic and sports)
  const [baseScoreResults, setBaseScoreResults] = useState<Partial<Record<SubjectId, AcademicBaseScoreResult>>>({});
  const [baseScoreLoading, setBaseScoreLoading] = useState(false);
  const [baseScoreError, setBaseScoreError] = useState<string | null>(null);
  const supportsBaseScoreUpload = BASE_SCORE_UPLOAD_SUBJECTS.has(subjectId);
  const currentBaseScoreResult = baseScoreResults[subjectId] ?? null;

  // Settings base score (for moral/aesthetic/labor)
  const [settingsBaseScore, setSettingsBaseScore] = useState<number>(0);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!BASE_SCORE_UPLOAD_SUBJECTS.has(subjectId)) return;
    setBaseScoreLoading(true);
    setBaseScoreError(null);
    try {
      const data = await api.uploadSubjectBaseScore(subjectId as 'academic' | 'sports', file);
      setBaseScoreResults((prev) => ({ ...prev, [subjectId]: data }));
    } catch (err: unknown) {
      setBaseScoreError((err as Error).message ?? "Upload failed");
    } finally {
      setBaseScoreLoading(false);
    }
  }, [subjectId]);

  const getAddEligibility = useCallback((
    item: ScoreItem,
    quantity: number,
    confirmations?: ConfirmationState,
  ) =>
    getRuleAddEligibility(selectedEntries, subjectRules?.constraints ?? [], subjectId, item, quantity, confirmations),
  [selectedEntries, subjectRules, subjectId]);

  const handleAddRule = useCallback((
    item: ScoreItem,
    quantity: number,
    confirmations?: ConfirmationState,
  ) => {
    const eligibility = getRuleAddEligibility(
      selectedEntries,
      subjectRules?.constraints ?? [],
      subjectId,
      item,
      quantity,
      confirmations,
    );
    if (!eligibility.canAdd) return;
    setSelectedEntries((prev) => [
      ...prev,
      {
        id: `${subjectId}-entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        item,
        quantity,
        confirmations,
      },
    ]);
  }, [selectedEntries, subjectRules, subjectId]);

  const handleToggle = useCallback((next: ActiveSection) => {
    setActiveSection(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setRulesLoading(true);
    setRulesError(null);
    setSubjectRules(null);
    setSelectedEntries([]);
    setSubmitted(false);

    // Load rules and subject config in parallel
    const load = async () => {
      try {
        const [rules, config] = await Promise.all([
          api.getSubjectRules(subjectId),
          api.getSubject(subjectId),
        ]);
        if (cancelled) return;
        setSubjectRules(rules);
        setSettingsBaseScore(config.baseScore);
      } catch (err: unknown) {
        if (!cancelled) setRulesError((err as Error).message ?? '规则加载失败');
      } finally {
        if (!cancelled) setRulesLoading(false);
      }
    };
    load();

    return () => { cancelled = true; };
  }, [subjectId]);

  const scoreRecords = useMemo(
    () => calculateRuleRecords(selectedEntries, subjectRules?.constraints ?? [], subjectId),
    [selectedEntries, subjectRules, subjectId],
  );

  const scoreTotal = useMemo(
    () => roundScore(scoreRecords.reduce((sum, record) => sum + record.finalScore, 0)),
    [scoreRecords],
  );

  const bonusTotal = scoreTotal;

  const baseScore = currentBaseScoreResult
    ? currentBaseScoreResult.baseScore
    : settingsBaseScore;
  const totalScore = baseScore + bonusTotal;

  const handleSubmit = useCallback(async () => {
    if (submitting || submitted) return;
    setSubmitting(true);
    try {
      const entries = scoreRecords.map((record) => {
        const entry = selectedEntries.find((e) => e.id === record.id);
        return {
          name: record.name,
          scoreType: record.direction === 'penalty' ? 'penalty' : 'bonus',
          score: record.finalScore,
          quantity: (entry?.item.scoreUnit === 'per_time') ? (entry?.quantity ?? 1) : 1,
          materialName: record.confirmationMessages?.join('; ') ?? null,
          sourceText: record.sourceText,
          sourcePage: record.sourcePage,
        };
      });
      await api.submitSubjectScore(subjectId, { baseScore, totalScore, entries });
      setSubmitted(true);
    } catch (err: unknown) {
      alert((err as Error).message ?? '提交失败');
    } finally {
      setSubmitting(false);
    }
  }, [subjectId, baseScore, totalScore, scoreRecords, selectedEntries, submitting, submitted]);

  return (
    <div className="subject-page">
      <PageHeader
        title={subjectName}
        description="课程分数文件 → 基础分计算"
      />

      <div className="subject-body">
        {/* Row 1: base score card + course import */}
        <div className="subject-row">
          <BaseScoreCard
            sectionRef={baseSectionRef}
            subjectId={subjectId}
            academicResult={currentBaseScoreResult}
            academicLoading={baseScoreLoading}
            academicError={baseScoreError}
            settingsBaseScore={settingsBaseScore}
          />
          <CourseScoreImportPanel
            onFileSelect={supportsBaseScoreUpload ? handleFileUpload : undefined}
            disabled={!supportsBaseScoreUpload}
          />
        </div>

        {/* Row 2: bonus score card + proof upload */}
        <div className="subject-row">
          <BonusScoreCard
            key={`records-${subjectId}`}
            bonusTotal={bonusTotal}
            sectionRef={bonusSectionRef}
            records={scoreRecords}
            title={`${subjectName}计分`}
            subjectName={subjectName}
          />
          <AcademicBonusRulePanel
            key={`rules-${subjectId}`}
            subjectId={subjectId}
            subjectName={subjectName}
            scoreItems={subjectRules?.scoreItems ?? []}
            constraints={subjectRules?.constraints ?? []}
            loading={rulesLoading}
            error={rulesError}
            getAddEligibility={getAddEligibility}
            onAdd={handleAddRule}
          />
        </div>
      </div>

      <FloatingTotalBar
        subjectName={subjectName}
        baseScore={baseScore}
        bonusTotal={bonusTotal}
        totalScore={totalScore}
        activeSection={activeSection}
        baseSectionRef={baseSectionRef}
        bonusSectionRef={bonusSectionRef}
        onToggle={handleToggle}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitted={submitted}
      />
    </div>
  );
}
