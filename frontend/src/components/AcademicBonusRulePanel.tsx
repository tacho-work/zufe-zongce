import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ListPlus, Loader2 } from 'lucide-react';
import type { AcademicScoreItem, AcademicConstraint, AcademicConfirmationState, SubjectId } from '../types/zongce';
import './AcademicBonusRulePanel.css';

interface Props {
  subjectId?: SubjectId;
  subjectName?: string;
  scoreItems: AcademicScoreItem[];
  constraints: AcademicConstraint[];
  loading: boolean;
  error: string | null;
  getAddEligibility: (
    item: AcademicScoreItem,
    quantity: number,
    confirmations?: AcademicConfirmationState,
  ) => { canAdd: boolean; reason?: string };
  onAdd: (item: AcademicScoreItem, quantity: number, confirmations?: AcademicConfirmationState) => void;
}

interface RatioOption {
  label: string;
  factor: number;
}

type RuleKind = '' | 'competition' | 'paper' | 'exam' | 'research' | 'penalty';

interface RuleSelection {
  competitionSeries: 'academic' | 'core';
  competitionAward: string;
  competitionLevel: string;
  paperWordCount: string;
  paperLevel: string;
  paperStatus: string;
  examItemId: string;
  researchType: string;
  researchStage: string;
  researchLevel: string;
  penaltyItemId: string;
}

interface GenericCompetitionSelection {
  form: string;
  award: string;
  level: string;
  specialItemId: string;
}

interface MoralHonorSelection {
  type: string;
  form: string;
  level: string;
  praiseLevel: string;
}

interface ParsedCompetitionItem {
  item: AcademicScoreItem;
  form: 'individual' | 'team';
  award: string;
  level: string;
}

interface ParsedMoralHonorItem {
  item: AcademicScoreItem;
  type: 'honor' | 'military';
  form: 'individual' | 'group';
  level: string;
}

const TEAM_ROLE_OPTIONS: RatioOption[] = [
  { label: '组织单位已确认分值（不折算）', factor: 1 },
  { label: '队长/负责人 60%', factor: 0.6 },
  { label: '团队成员 50%（30人以下）', factor: 0.5 },
  { label: '团队成员 30%（30人及以上）', factor: 0.3 },
];

const AUTHOR_ROLE_OPTIONS: RatioOption[] = [
  { label: '独立完成或无需折算', factor: 1 },
  { label: '两人合作：第一作者 60%', factor: 0.6 },
  { label: '两人合作：第二作者 40%', factor: 0.4 },
  { label: '多人合作：第一作者 50%', factor: 0.5 },
  { label: '多人合作：第二作者 30%', factor: 0.3 },
  { label: '多人合作：第三作者 20%', factor: 0.2 },
  { label: '多人合作：第四及以上作者 10%', factor: 0.1 },
];

const DEFAULT_SELECTION: RuleSelection = {
  competitionSeries: 'academic',
  competitionAward: '',
  competitionLevel: '',
  paperWordCount: '',
  paperLevel: '',
  paperStatus: 'published',
  examItemId: '',
  researchType: '',
  researchStage: '',
  researchLevel: '',
  penaltyItemId: '',
};

const DEFAULT_GENERIC_COMPETITION_SELECTION: GenericCompetitionSelection = {
  form: '',
  award: '',
  level: '',
  specialItemId: '',
};

const DEFAULT_MORAL_HONOR_SELECTION: MoralHonorSelection = {
  type: '',
  form: '',
  level: '',
  praiseLevel: '',
};

const RULE_KIND_OPTIONS: { value: RuleKind; label: string }[] = [
  { value: '', label: '请选择' },
  { value: 'competition', label: '比赛' },
  { value: 'paper', label: '论文' },
  { value: 'exam', label: '证书/考试' },
  { value: 'research', label: '课题/著作/专利' },
  { value: 'penalty', label: '课程减分' },
];

const COMPETITION_AWARD_OPTIONS = [
  { value: '', label: '请选择' },
  { value: 'individual_first', label: '个人特等奖/一等奖/第一名' },
  { value: 'individual_second', label: '个人二等奖/第二、三名' },
  { value: 'individual_third', label: '个人三等奖/第四至第六名' },
  { value: 'team_first', label: '团体特等奖/一等奖/第一名' },
  { value: 'team_second', label: '团体二等奖/第二、三名' },
  { value: 'team_third', label: '团体三等奖/第四至第六名' },
  { value: 'participation_award', label: '参赛奖/鼓励奖等' },
];

const COMPETITION_LEVEL_OPTIONS = [
  { value: '', label: '请选择' },
  { value: 'national_or_above', label: '国家级及以上' },
  { value: 'provincial', label: '省级' },
  { value: 'intercollegiate', label: '校际（参赛范围≥3所高校）' },
  { value: 'university', label: '校级' },
  { value: 'college', label: '院级' },
];

const PAPER_WORD_OPTIONS = [
  { value: '', label: '请选择' },
  { value: 'over_4000_words', label: '4000字以上' },
  { value: 'under_4000_words', label: '4000字以下' },
];

const PAPER_LEVEL_OPTIONS = [
  { value: '', label: '请选择' },
  { value: 'national_1a', label: '国家一级A' },
  { value: 'national_1b', label: '国家一级B' },
  { value: 'national_2', label: '国家二级' },
  { value: 'provincial', label: '省级' },
];

const PAPER_STATUS_OPTIONS = [
  { value: 'published', label: '正式发表' },
  { value: 'acceptance_notice', label: '用稿通知/录用证明减半' },
];

const RESEARCH_TYPE_OPTIONS = [
  { value: '', label: '请选择' },
  { value: 'project', label: '研究课题' },
  { value: 'book', label: '学术著作' },
  { value: 'patent', label: '专利' },
];

const RESEARCH_STAGE_OPTIONS = [
  { value: '', label: '请选择' },
  { value: 'approved', label: '立项' },
  { value: 'completed', label: '结题' },
];

const RESEARCH_LEVEL_OPTIONS = [
  { value: '', label: '请选择' },
  { value: 'national', label: '国家级' },
  { value: 'provincial_ministerial', label: '省部级' },
  { value: 'municipal_departmental', label: '市厅级' },
  { value: 'university', label: '校级' },
];

function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function signedScore(item: AcademicScoreItem): string {
  if (item.direction === 'bonus' && item.baseScore === 0) return '自定';
  const score = item.direction === 'penalty' ? -item.baseScore : item.baseScore;
  return score >= 0 ? `+${formatScore(score)}` : formatScore(score);
}

function hasConstraintMatching(
  item: AcademicScoreItem | null,
  matcher: (constraintId: string) => boolean,
): boolean {
  return Boolean(item?.constraintIds.some(matcher));
}

function hasConstraintEnding(item: AcademicScoreItem | null, suffix: string): boolean {
  return hasConstraintMatching(item, (constraintId) => constraintId.endsWith(suffix));
}

function isExclusiveConstraint(constraint: AcademicConstraint): boolean {
  return constraint.type === 'exclusive_max';
}

function isTop5NoticeConstraint(constraint: AcademicConstraint): boolean {
  const text = `${constraint.id} ${constraint.name} ${constraint.message}`;
  return constraint.type === 'notice_only' && /top5|最高\s*5\s*项|最高五项|5项/.test(text);
}

function byChineseLabel(a: string, b: string): number {
  return a.localeCompare(b, 'zh-Hans-CN');
}

function booleanSelectValue(value: boolean | undefined): string {
  if (value === undefined) return '';
  return value ? 'yes' : 'no';
}

function parseBooleanSelect(value: string): boolean | undefined {
  if (value === 'yes') return true;
  if (value === 'no') return false;
  return undefined;
}

const COMPETITION_AWARD_ID_MAP: Record<string, string> = {
  individual_first: 'comp_first',
  individual_second: 'comp_second',
  individual_third: 'comp_third',
  team_first: 'comp_team_first',
  team_second: 'comp_team_second',
  team_third: 'comp_team_third',
  participation_award: 'comp_participant',
};

const COMPETITION_LEVEL_ID_MAP: Record<string, string> = {
  national_or_above: 'national',
  provincial: 'provincial',
  intercollegiate: 'inter_uni',
  university: 'university',
  college: 'college',
};

const GENERIC_COMPETITION_AWARD_LABELS: Record<string, string> = {
  first: '特等奖/一等奖/第一名',
  second: '二等奖/第二、三名',
  third: '三等奖/第四至第六名',
  participant: '参赛奖/鼓励奖等',
};

const SPORTS_COMPETITION_AWARD_LABELS: Record<string, string> = {
  ...GENERIC_COMPETITION_AWARD_LABELS,
  third: '三等奖/第四至八名',
};

const GENERIC_COMPETITION_LEVEL_LABELS: Record<string, string> = {
  national: '国家级及以上',
  provincial: '省级',
  inter_uni: '校际（参赛范围≥3所高校）',
  university: '校级',
  college: '院级',
};

const MORAL_HONOR_TYPE_LABELS: Record<string, string> = {
  honor: '荣誉奖励',
  military: '军训荣誉',
  praise: '通报表扬',
};

const MORAL_HONOR_FORM_LABELS: Record<string, string> = {
  individual: '个人',
  group: '集体',
};

const MORAL_HONOR_LEVEL_LABELS: Record<string, string> = {
  national: '国家级',
  provincial: '省级',
  university: '校级',
  college: '院级',
};

const MORAL_PRAISE_LEVEL_LABELS: Record<string, string> = {
  school: '校级及以上',
  college: '院级',
};

const PAPER_WORD_ID_MAP: Record<string, string> = {
  over_4000_words: 'over_4000',
  under_4000_words: 'under_4000',
};

const PAPER_LEVEL_ID_MAP: Record<string, string> = {
  national_1a: 'national_a',
  national_1b: 'national_b',
  national_2: 'national_2',
  provincial: 'provincial',
};

const RESEARCH_STAGE_ID_MAP: Record<string, string> = {
  approved: '立项',
  completed: '结题',
};

const RESEARCH_LEVEL_ID_MAP: Record<string, string> = {
  national: 'national',
  provincial_ministerial: 'provincial_ministerial',
  municipal_departmental: 'city_department',
  university: 'university',
};

function parseGenericCompetitionItem(item: AcademicScoreItem): ParsedCompetitionItem | null {
  const match = item.id.match(/^[a-z]+_comp_(team_)?(first|second|third|participant)_(national|provincial|inter_uni|university|college)$/);
  if (!match) return null;
  return {
    item,
    form: match[1] ? 'team' : 'individual',
    award: match[2],
    level: match[3],
  };
}

function parseMoralHonorItem(item: AcademicScoreItem): ParsedMoralHonorItem | null {
  const match = item.id.match(/^moral_(military_)?honor_(individual|group)_(national|provincial|university|college)$/);
  if (!match) return null;
  return {
    item,
    type: match[1] ? 'military' : 'honor',
    form: match[2] as 'individual' | 'group',
    level: match[3],
  };
}

function getMoralHonorItem(
  parsedItems: ParsedMoralHonorItem[],
  scoreItems: AcademicScoreItem[],
  selection: MoralHonorSelection,
): AcademicScoreItem | null {
  if (selection.type === 'praise') {
    if (!selection.praiseLevel) return null;
    return scoreItems.find((item) => item.id === `moral_praise_${selection.praiseLevel}`) ?? null;
  }
  if (!selection.type || !selection.form || !selection.level) return null;
  return parsedItems.find((entry) =>
    entry.type === selection.type &&
    entry.form === selection.form &&
    entry.level === selection.level,
  )?.item ?? null;
}

function getCompetitionAwardLabel(subjectId: SubjectId, award: string): string {
  const labels = subjectId === 'sports' ? SPORTS_COMPETITION_AWARD_LABELS : GENERIC_COMPETITION_AWARD_LABELS;
  return labels[award] ?? award;
}

function getCompetitionLevelLabel(level: string): string {
  return GENERIC_COMPETITION_LEVEL_LABELS[level] ?? level;
}

function getGenericCompetitionItem(
  parsedItems: ParsedCompetitionItem[],
  specialItems: AcademicScoreItem[],
  selection: GenericCompetitionSelection,
): AcademicScoreItem | null {
  if (selection.form === 'special') {
    return specialItems.find((item) => item.id === selection.specialItemId) ?? null;
  }
  if (!selection.form || !selection.award || !selection.level) return null;
  return parsedItems.find((entry) =>
    entry.form === selection.form &&
    entry.award === selection.award &&
    entry.level === selection.level,
  )?.item ?? null;
}

function findSelectedItem(
  scoreItems: AcademicScoreItem[],
  kind: RuleKind,
  selection: RuleSelection,
): AcademicScoreItem | null {
  if (kind === 'competition') {
    if (!selection.competitionAward || !selection.competitionLevel) return null;
    const awardId = COMPETITION_AWARD_ID_MAP[selection.competitionAward];
    const levelId = COMPETITION_LEVEL_ID_MAP[selection.competitionLevel];
    if (!awardId || !levelId) return null;
    const prefix = selection.competitionSeries === 'core' ? 'academic_core' : 'academic';
    const id = `${prefix}_${awardId}_${levelId}`;
    return scoreItems.find((item) => item.id === id) ?? null;
  }

  if (kind === 'paper') {
    if (!selection.paperWordCount || !selection.paperLevel || !selection.paperStatus) return null;
    const wordId = PAPER_WORD_ID_MAP[selection.paperWordCount];
    const levelId = PAPER_LEVEL_ID_MAP[selection.paperLevel];
    if (!wordId || !levelId) return null;
    const statusPrefix = selection.paperStatus === 'acceptance_notice'
      ? 'academic_paper_acceptance'
      : 'academic_paper';
    const id = `${statusPrefix}_${levelId}_${wordId}`;
    return scoreItems.find((item) => item.id === id) ?? null;
  }

  if (kind === 'exam') {
    return scoreItems.find((item) => item.id === selection.examItemId) ?? null;
  }

  if (kind === 'research') {
    if (selection.researchType === 'book') {
      return scoreItems.find((item) => item.id === 'academic_book_patent') ?? null;
    }
    if (selection.researchType === 'patent') {
      return scoreItems.find((item) => item.id === 'academic_book_patent') ?? null;
    }
    if (selection.researchType === 'project') {
      if (!selection.researchStage || !selection.researchLevel) return null;
      const stageId = RESEARCH_STAGE_ID_MAP[selection.researchStage];
      const levelId = RESEARCH_LEVEL_ID_MAP[selection.researchLevel];
      if (!stageId || !levelId) return null;
      const id = `academic_research_project_${levelId}_${stageId}`;
      return scoreItems.find((item) => item.id === id) ?? null;
    }
    return null;
  }

  if (kind === 'penalty') {
    return scoreItems.find((item) => item.id === selection.penaltyItemId) ?? null;
  }

  return null;
}

export function AcademicBonusRulePanel({
  subjectId = 'academic',
  subjectName = '智育',
  scoreItems,
  constraints,
  loading,
  error,
  getAddEligibility,
	onAdd,
}: Props) {
  const [ruleKind, setRuleKind] = useState<RuleKind>('');
  const [selection, setSelection] = useState<RuleSelection>(DEFAULT_SELECTION);
  const [genericCategory, setGenericCategory] = useState('');
  const [genericItemId, setGenericItemId] = useState('');
  const [genericCompetitionSelection, setGenericCompetitionSelection] = useState<GenericCompetitionSelection>(
    DEFAULT_GENERIC_COMPETITION_SELECTION,
  );
  const [moralHonorSelection, setMoralHonorSelection] = useState<MoralHonorSelection>(
    DEFAULT_MORAL_HONOR_SELECTION,
  );
  const [quantity, setQuantity] = useState(1);
  const [confirmations, setConfirmations] = useState<AcademicConfirmationState>({});
  const isAcademicSubject = subjectId === 'academic';

  useEffect(() => {
    setRuleKind('');
    setSelection(DEFAULT_SELECTION);
    setGenericCategory('');
    setGenericItemId('');
    setGenericCompetitionSelection(DEFAULT_GENERIC_COMPETITION_SELECTION);
    setMoralHonorSelection(DEFAULT_MORAL_HONOR_SELECTION);
    setQuantity(1);
    setConfirmations({});
  }, [subjectId]);

  const constraintMap = useMemo(
    () => new Map(constraints.map((constraint) => [constraint.id, constraint])),
    [constraints],
  );

  const genericCategories = useMemo(
    () => Array.from(new Set(scoreItems.map((item) => item.category).filter(Boolean))).sort(byChineseLabel),
    [scoreItems],
  );

  const genericItems = useMemo(
    () => scoreItems
      .filter((item) => item.category === genericCategory)
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN')),
    [scoreItems, genericCategory],
  );

  const isGenericCompetitionCategory = !isAcademicSubject && genericCategory.includes('竞赛');
  const isMoralHonorCategory = subjectId === 'moral' && genericCategory === '德育荣誉';

  const parsedGenericCompetitionItems = useMemo(
    () => genericItems
      .map(parseGenericCompetitionItem)
      .filter((entry): entry is ParsedCompetitionItem => Boolean(entry)),
    [genericItems],
  );

  const genericCompetitionSpecialItems = useMemo(
    () => genericItems.filter((item) => !parseGenericCompetitionItem(item)),
    [genericItems],
  );

  const genericCompetitionForms = useMemo(() => {
    const forms = new Set(parsedGenericCompetitionItems.map((entry) => entry.form));
    const options = [
      ...(forms.has('individual') ? [{ value: 'individual', label: '个人' }] : []),
      ...(forms.has('team') ? [{ value: 'team', label: '团体' }] : []),
    ];
    if (genericCompetitionSpecialItems.length > 0) {
      options.push({ value: 'special', label: '其他竞赛项目' });
    }
    return options;
  }, [parsedGenericCompetitionItems, genericCompetitionSpecialItems]);

  const genericCompetitionAwardOptions = useMemo(() => {
    const awards = Array.from(new Set(parsedGenericCompetitionItems
      .filter((entry) => entry.form === genericCompetitionSelection.form)
      .map((entry) => entry.award)));
    return awards.map((award) => ({
      value: award,
      label: getCompetitionAwardLabel(subjectId, award),
    }));
  }, [parsedGenericCompetitionItems, genericCompetitionSelection.form, subjectId]);

  const genericCompetitionLevelOptions = useMemo(() => {
    const levels = Array.from(new Set(parsedGenericCompetitionItems
      .filter((entry) =>
        entry.form === genericCompetitionSelection.form &&
        entry.award === genericCompetitionSelection.award)
      .map((entry) => entry.level)));
    return levels.map((level) => ({
      value: level,
      label: getCompetitionLevelLabel(level),
    }));
  }, [parsedGenericCompetitionItems, genericCompetitionSelection.form, genericCompetitionSelection.award]);

  const parsedMoralHonorItems = useMemo(
    () => genericItems
      .map(parseMoralHonorItem)
      .filter((entry): entry is ParsedMoralHonorItem => Boolean(entry)),
    [genericItems],
  );

  const moralHonorTypeOptions = useMemo(() => {
    const types = new Set(parsedMoralHonorItems.map((entry) => entry.type));
    const options = [
      ...(types.has('honor') ? [{ value: 'honor', label: MORAL_HONOR_TYPE_LABELS.honor }] : []),
      ...(types.has('military') ? [{ value: 'military', label: MORAL_HONOR_TYPE_LABELS.military }] : []),
    ];
    if (genericItems.some((item) => item.id.startsWith('moral_praise_'))) {
      options.push({ value: 'praise', label: MORAL_HONOR_TYPE_LABELS.praise });
    }
    return options;
  }, [parsedMoralHonorItems, genericItems]);

  const moralHonorFormOptions = useMemo(() => {
    const forms = Array.from(new Set(parsedMoralHonorItems
      .filter((entry) => entry.type === moralHonorSelection.type)
      .map((entry) => entry.form)));
    return forms.map((form) => ({
      value: form,
      label: MORAL_HONOR_FORM_LABELS[form] ?? form,
    }));
  }, [parsedMoralHonorItems, moralHonorSelection.type]);

  const moralHonorLevelOptions = useMemo(() => {
    const levels = Array.from(new Set(parsedMoralHonorItems
      .filter((entry) =>
        entry.type === moralHonorSelection.type &&
        entry.form === moralHonorSelection.form)
      .map((entry) => entry.level)));
    return levels.map((level) => ({
      value: level,
      label: MORAL_HONOR_LEVEL_LABELS[level] ?? level,
    }));
  }, [parsedMoralHonorItems, moralHonorSelection.type, moralHonorSelection.form]);

  const moralPraiseLevelOptions = useMemo(
    () => genericItems
      .filter((item) => item.id.startsWith('moral_praise_'))
      .map((item) => item.id.replace('moral_praise_', ''))
      .map((level) => ({
        value: level,
        label: MORAL_PRAISE_LEVEL_LABELS[level] ?? level,
      })),
    [genericItems],
  );

  const selectedItem = useMemo(
    () => {
      if (isAcademicSubject) return findSelectedItem(scoreItems, ruleKind, selection);
      if (isGenericCompetitionCategory) {
        return getGenericCompetitionItem(
          parsedGenericCompetitionItems,
          genericCompetitionSpecialItems,
          genericCompetitionSelection,
        );
      }
      if (isMoralHonorCategory) {
        return getMoralHonorItem(parsedMoralHonorItems, genericItems, moralHonorSelection);
      }
      return scoreItems.find((item) => item.id === genericItemId) ?? null;
    },
    [
      scoreItems,
      ruleKind,
      selection,
      isAcademicSubject,
      isGenericCompetitionCategory,
      isMoralHonorCategory,
      parsedGenericCompetitionItems,
      genericCompetitionSpecialItems,
      genericCompetitionSelection,
      parsedMoralHonorItems,
      genericItems,
      moralHonorSelection,
      genericItemId,
    ],
  );

  const examItems = useMemo(
    () => scoreItems.filter((item) => item.category === '通用考试'),
    [scoreItems],
  );

  const penaltyItems = useMemo(
    () => scoreItems.filter((item) => item.category === '智育扣分'),
    [scoreItems],
  );

	  const selectedConstraints = selectedItem
	    ? selectedItem.constraintIds
	        .map((id) => constraintMap.get(id))
	        .filter((constraint): constraint is AcademicConstraint => {
            if (!constraint) return false;
            return !isTop5NoticeConstraint(constraint);
          })
	    : [];
	  const selectedQuantity = selectedItem?.scoreUnit === 'per_time' ? Math.max(1, quantity) : 1;
	  const addEligibility = selectedItem
	    ? getAddEligibility(selectedItem, selectedQuantity, confirmations)
	    : { canAdd: false };

  const needsManualScore = selectedItem?.direction === 'bonus' && selectedItem.baseScore === 0;
  const needsTeamRole = hasConstraintEnding(selectedItem, '_competition_team_ratio_notice');
  const needsAuthorRole = hasConstraintEnding(selectedItem, '_research_author_ratio_notice');
  const needsMaterialCheck = hasConstraintEnding(selectedItem, '_competition_certificate_notice');
  const needsLevelCheck = hasConstraintEnding(selectedItem, '_competition_level_notice');
  const needsScopeCheck = hasConstraintEnding(selectedItem, '_competition_official_scope_notice');
  const needsCompetitionChecks = needsMaterialCheck || needsLevelCheck || needsScopeCheck;
  const needsExamTime = hasConstraintEnding(selectedItem, '_exam_time_basis_notice');
  const needsResearchRecognition = hasConstraintEnding(selectedItem, '_research_recognition_basis_notice');
  const needsResearchFormal = hasConstraintEnding(selectedItem, '_research_formal_basis_notice');
  const needsPaperAcceptance = hasConstraintEnding(selectedItem, '_paper_acceptance_eligibility_notice');
  const supportsPriorScore = selectedItem && [
    '_exam_same_type_exclusive_max',
    '_paper_acceptance_eligibility_notice',
  ].some((suffix) => hasConstraintEnding(selectedItem, suffix));
  const hasConfirmationFields = Boolean(
    needsTeamRole ||
    needsAuthorRole ||
    needsCompetitionChecks ||
    needsExamTime ||
    needsResearchRecognition ||
    needsResearchFormal ||
    needsPaperAcceptance ||
    supportsPriorScore ||
    needsManualScore,
  );

  const updateConfirmations = (patch: Partial<AcademicConfirmationState>) => {
    setConfirmations((prev) => ({ ...prev, ...patch }));
  };

  const updateSelection = (patch: Partial<RuleSelection>) => {
    setSelection((prev) => ({ ...prev, ...patch }));
    setConfirmations({});
    setQuantity(1);
  };

  const handleKindChange = (nextKind: RuleKind) => {
    setRuleKind(nextKind);
    setSelection(DEFAULT_SELECTION);
    setConfirmations({});
    setQuantity(1);
  };

  const handleGenericCategoryChange = (nextCategory: string) => {
    setGenericCategory(nextCategory);
    setGenericItemId('');
    setGenericCompetitionSelection(DEFAULT_GENERIC_COMPETITION_SELECTION);
    setMoralHonorSelection(DEFAULT_MORAL_HONOR_SELECTION);
    setConfirmations({});
    setQuantity(1);
  };

  const handleGenericItemChange = (nextItemId: string) => {
    setGenericItemId(nextItemId);
    setConfirmations({});
    setQuantity(1);
  };

  const updateGenericCompetitionSelection = (patch: Partial<GenericCompetitionSelection>) => {
    setGenericCompetitionSelection((prev) => ({ ...prev, ...patch }));
    setConfirmations({});
    setQuantity(1);
  };

  const updateMoralHonorSelection = (patch: Partial<MoralHonorSelection>) => {
    setMoralHonorSelection((prev) => ({ ...prev, ...patch }));
    setConfirmations({});
    setQuantity(1);
  };

  const updateRatio = (
    value: string,
    options: RatioOption[],
    factorKey: 'teamRoleFactor' | 'authorRoleFactor',
    labelKey: 'teamRoleLabel' | 'authorRoleLabel',
  ) => {
    const option = options.find((candidate) => candidate.label === value);
    updateConfirmations({
      [factorKey]: option?.factor,
      [labelKey]: option?.label,
    });
  };

  const handleAdd = () => {
    if (!selectedItem || !addEligibility.canAdd) return;
    onAdd(selectedItem, selectedQuantity, confirmations);
    setRuleKind('');
    setSelection(DEFAULT_SELECTION);
    setGenericItemId('');
    setGenericCompetitionSelection(DEFAULT_GENERIC_COMPETITION_SELECTION);
    setMoralHonorSelection(DEFAULT_MORAL_HONOR_SELECTION);
    setQuantity(1);
    setConfirmations({});
  };

  return (
    <div className="abp-panel">
      <h2 className="abp-title">{subjectName}规则添加</h2>

      {loading && (
        <div className="abp-state">
          <Loader2 size={18} className="abp-spin" />
          <span>正在加载{subjectName}规则…</span>
        </div>
      )}

      {error && (
        <div className="abp-state abp-state-error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && scoreItems.length === 0 && (
        <div className="abp-empty">暂无可用{subjectName}规则</div>
      )}

	      {!loading && !error && scoreItems.length > 0 && (
	        <>
          <div className="abp-select-grid">
            {isAcademicSubject ? (
              <label className="abp-select-field">
                计分类别
                <select
                  value={ruleKind}
                  onChange={(event) => handleKindChange(event.target.value as RuleKind)}
                >
                  {RULE_KIND_OPTIONS.map((option) => (
                    <option key={option.value || 'empty'} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            ) : (
              <>
                <label className="abp-select-field">
                  计分类别
                  <select
                    value={genericCategory}
                    onChange={(event) => handleGenericCategoryChange(event.target.value)}
                  >
                    <option value="">请选择</option>
                    {genericCategories.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
                {isGenericCompetitionCategory ? (
                  <>
                    <label className="abp-select-field">
                      项目形式
                      <select
                        value={genericCompetitionSelection.form}
                        onChange={(event) =>
                          updateGenericCompetitionSelection({
                            form: event.target.value,
                            award: '',
                            level: '',
                            specialItemId: '',
                          })}
                      >
                        <option value="">请选择</option>
                        {genericCompetitionForms.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    {genericCompetitionSelection.form === 'special' ? (
                      <label className="abp-select-field abp-select-field-wide">
                        计分项目
                        <select
                          value={genericCompetitionSelection.specialItemId}
                          onChange={(event) =>
                            updateGenericCompetitionSelection({ specialItemId: event.target.value })}
                        >
                          <option value="">请选择</option>
                          {genericCompetitionSpecialItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}（{signedScore(item)}）
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <>
                        <label className="abp-select-field">
                          奖项/排名
                          <select
                            value={genericCompetitionSelection.award}
                            disabled={!genericCompetitionSelection.form}
                            onChange={(event) =>
                              updateGenericCompetitionSelection({
                                award: event.target.value,
                                level: '',
                              })}
                          >
                            <option value="">请选择</option>
                            {genericCompetitionAwardOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                        <label className="abp-select-field">
                          赛事级别
                          <select
                            value={genericCompetitionSelection.level}
                            disabled={!genericCompetitionSelection.award}
                            onChange={(event) =>
                              updateGenericCompetitionSelection({ level: event.target.value })}
                          >
                            <option value="">请选择</option>
                            {genericCompetitionLevelOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                      </>
                    )}
                  </>
                ) : isMoralHonorCategory ? (
                  <>
                    <label className="abp-select-field">
                      荣誉类型
                      <select
                        value={moralHonorSelection.type}
                        onChange={(event) =>
                          updateMoralHonorSelection({
                            type: event.target.value,
                            form: '',
                            level: '',
                            praiseLevel: '',
                          })}
                      >
                        <option value="">请选择</option>
                        {moralHonorTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    {moralHonorSelection.type === 'praise' ? (
                      <label className="abp-select-field">
                        表扬级别
                        <select
                          value={moralHonorSelection.praiseLevel}
                          onChange={(event) =>
                            updateMoralHonorSelection({ praiseLevel: event.target.value })}
                        >
                          <option value="">请选择</option>
                          {moralPraiseLevelOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <>
                        <label className="abp-select-field">
                          荣誉对象
                          <select
                            value={moralHonorSelection.form}
                            disabled={!moralHonorSelection.type}
                            onChange={(event) =>
                              updateMoralHonorSelection({
                                form: event.target.value,
                                level: '',
                              })}
                          >
                            <option value="">请选择</option>
                            {moralHonorFormOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                        <label className="abp-select-field">
                          荣誉级别
                          <select
                            value={moralHonorSelection.level}
                            disabled={!moralHonorSelection.form}
                            onChange={(event) =>
                              updateMoralHonorSelection({ level: event.target.value })}
                          >
                            <option value="">请选择</option>
                            {moralHonorLevelOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                      </>
                    )}
                  </>
                ) : (
                  <label className="abp-select-field abp-select-field-wide">
                    计分项目
                    <select
                      value={genericItemId}
                      disabled={!genericCategory}
                      onChange={(event) => handleGenericItemChange(event.target.value)}
                    >
                      <option value="">请选择</option>
                      {genericItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}（{signedScore(item)}）
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </>
            )}

            {isAcademicSubject && ruleKind === 'competition' && (
              <>
                <label className="abp-select-field">
                  比赛类型
                  <select
                    value={selection.competitionSeries}
                    onChange={(event) =>
                      updateSelection({ competitionSeries: event.target.value as RuleSelection['competitionSeries'] })}
                  >
                    <option value="academic">普通智育比赛</option>
                    <option value="core">三大核心赛事</option>
                  </select>
                </label>
                <label className="abp-select-field">
                  奖项/排名
                  <select
                    value={selection.competitionAward}
                    onChange={(event) => updateSelection({ competitionAward: event.target.value })}
                  >
                    {COMPETITION_AWARD_OPTIONS.map((option) => (
                      <option key={option.value || 'empty'} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="abp-select-field">
                  赛事级别
                  <select
                    value={selection.competitionLevel}
                    onChange={(event) => updateSelection({ competitionLevel: event.target.value })}
                  >
                    {COMPETITION_LEVEL_OPTIONS.map((option) => (
                      <option key={option.value || 'empty'} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </>
            )}

            {isAcademicSubject && ruleKind === 'paper' && (
              <>
                <label className="abp-select-field">
                  字数
                  <select
                    value={selection.paperWordCount}
                    onChange={(event) => updateSelection({ paperWordCount: event.target.value })}
                  >
                    {PAPER_WORD_OPTIONS.map((option) => (
                      <option key={option.value || 'empty'} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="abp-select-field">
                  论文级别
                  <select
                    value={selection.paperLevel}
                    onChange={(event) => {
                      const nextLevel = event.target.value;
                      updateSelection({
                        paperLevel: nextLevel,
                        paperStatus: nextLevel === 'provincial' ? 'published' : selection.paperStatus,
                      });
                    }}
                  >
                    {PAPER_LEVEL_OPTIONS.map((option) => (
                      <option key={option.value || 'empty'} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="abp-select-field">
                  发表状态
                  <select
                    value={selection.paperStatus}
                    disabled={selection.paperLevel === 'provincial'}
                    onChange={(event) => updateSelection({ paperStatus: event.target.value })}
                  >
                    {PAPER_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </>
            )}

            {isAcademicSubject && ruleKind === 'exam' && (
              <label className="abp-select-field abp-select-field-wide">
                证书/考试结果
                <select
                  value={selection.examItemId}
                  onChange={(event) => updateSelection({ examItemId: event.target.value })}
                >
                  <option value="">请选择</option>
                  {examItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}（{signedScore(item)}）
                    </option>
                  ))}
                </select>
              </label>
            )}

            {isAcademicSubject && ruleKind === 'research' && (
              <>
                <label className="abp-select-field">
                  成果类型
                  <select
                    value={selection.researchType}
                    onChange={(event) => updateSelection({ researchType: event.target.value })}
                  >
                    {RESEARCH_TYPE_OPTIONS.map((option) => (
                      <option key={option.value || 'empty'} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                {selection.researchType === 'project' && (
                  <>
                    <label className="abp-select-field">
                      课题状态
                      <select
                        value={selection.researchStage}
                        onChange={(event) => updateSelection({ researchStage: event.target.value })}
                      >
                        {RESEARCH_STAGE_OPTIONS.map((option) => (
                          <option key={option.value || 'empty'} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="abp-select-field">
                      课题级别
                      <select
                        value={selection.researchLevel}
                        onChange={(event) => updateSelection({ researchLevel: event.target.value })}
                      >
                        {RESEARCH_LEVEL_OPTIONS.map((option) => (
                          <option key={option.value || 'empty'} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                  </>
                )}
              </>
            )}

            {isAcademicSubject && ruleKind === 'penalty' && (
              <label className="abp-select-field abp-select-field-wide">
                减分情况
                <select
                  value={selection.penaltyItemId}
                  onChange={(event) => updateSelection({ penaltyItemId: event.target.value })}
                >
                  <option value="">请选择</option>
                  {penaltyItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}（{signedScore(item)}）
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {((isAcademicSubject && ruleKind) || (!isAcademicSubject && genericCategory)) && !selectedItem && (
            <div className="abp-empty">继续选择上方条件后生成计分项</div>
          )}

	          {selectedItem && (
            <div className="abp-selected">
              <div className="abp-selected-header">
                <span>{selectedItem.name}</span>
                <strong>{signedScore(selectedItem)}</strong>
              </div>
              <p>{selectedItem.sourceText}</p>
              {selectedItem.scoreUnit === 'per_time' && (
                <label className="abp-quantity">
                  次数/门数
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(event) => setQuantity(Number(event.target.value) || 1)}
                  />
                </label>
              )}
	              {selectedConstraints.length > 0 && (
	                <div className="abp-constraints">
	                  {selectedConstraints.map((constraint) => (
	                    <span
                        key={constraint.id}
                        className={isExclusiveConstraint(constraint) ? 'abp-constraint-danger' : undefined}
                      >
                        {constraint.message}
                      </span>
	                  ))}
	                </div>
	              )}
              {hasConfirmationFields && (
                <div className="abp-confirm-box">
                  <div className="abp-confirm-title">补充确认信息</div>
                  {needsManualScore && (
                    <label className="abp-confirm-field">
                      本次计入分值
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={confirmations.manualScore ?? ''}
                        onChange={(event) =>
                          updateConfirmations({
                            manualScore: event.target.value === '' ? undefined : Number(event.target.value),
                          })}
                      />
                    </label>
                  )}
                  {needsTeamRole && (
                    <label className="abp-confirm-field">
                      团队角色/贡献率
                      <select
                        value={confirmations.teamRoleLabel ?? ''}
                        onChange={(event) =>
                          updateRatio(event.target.value, TEAM_ROLE_OPTIONS, 'teamRoleFactor', 'teamRoleLabel')}
                      >
                        <option value="">请选择</option>
                        {TEAM_ROLE_OPTIONS.map((option) => (
                          <option key={option.label} value={option.label}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  {needsAuthorRole && (
                    <label className="abp-confirm-field">
                      作者排名/人数
                      <select
                        value={confirmations.authorRoleLabel ?? ''}
                        onChange={(event) =>
                          updateRatio(event.target.value, AUTHOR_ROLE_OPTIONS, 'authorRoleFactor', 'authorRoleLabel')}
                      >
                        <option value="">请选择</option>
                        {AUTHOR_ROLE_OPTIONS.map((option) => (
                          <option key={option.label} value={option.label}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                  )}
	                  {needsMaterialCheck && (
                    <label className="abp-confirm-field">
                      证书/材料核验
                      <select
                        value={booleanSelectValue(confirmations.materialConfirmed)}
                        onChange={(event) => updateConfirmations({ materialConfirmed: parseBooleanSelect(event.target.value) })}
                      >
                        <option value="">请选择</option>
                        <option value="yes">已核验有效</option>
                        <option value="no">未通过核验</option>
                      </select>
                    </label>
                  )}
	                  {needsLevelCheck && (
                    <label className="abp-confirm-field">
                      比赛级别认定
                      <select
                        value={booleanSelectValue(confirmations.levelConfirmed)}
                        onChange={(event) => updateConfirmations({ levelConfirmed: parseBooleanSelect(event.target.value) })}
                      >
                        <option value="">请选择</option>
                        <option value="yes">已按名录认定</option>
                        <option value="no">未通过认定</option>
                      </select>
                    </label>
                  )}
	                  {needsScopeCheck && (
                    <label className="abp-confirm-field">
                      赛事组织范围
                      <select
                        value={booleanSelectValue(confirmations.scopeConfirmed)}
                        onChange={(event) => updateConfirmations({ scopeConfirmed: parseBooleanSelect(event.target.value) })}
                      >
                        <option value="">请选择</option>
                        <option value="yes">正式组织赛事</option>
                        <option value="no">对抗赛/邀请赛/友谊赛等</option>
                      </select>
                    </label>
                  )}
                  {needsExamTime && (
                    <label className="abp-confirm-field">
                      考试成绩时间
                      <select
                        value={booleanSelectValue(confirmations.examTimeConfirmed)}
                        onChange={(event) => updateConfirmations({ examTimeConfirmed: parseBooleanSelect(event.target.value) })}
                      >
                        <option value="">请选择</option>
                        <option value="yes">归属本学年</option>
                        <option value="no">不归属本学年</option>
                      </select>
                    </label>
                  )}
                  {needsResearchRecognition && (
                    <label className="abp-confirm-field">
                      科研认定
                      <select
                        value={booleanSelectValue(confirmations.researchRecognized)}
                        onChange={(event) => updateConfirmations({ researchRecognized: parseBooleanSelect(event.target.value) })}
                      >
                        <option value="">请选择</option>
                        <option value="yes">已由对应单位认定</option>
                        <option value="no">未完成认定</option>
                      </select>
                    </label>
                  )}
                  {needsResearchFormal && (
                    <label className="abp-confirm-field">
                      科研成果状态
                      <select
                        value={booleanSelectValue(confirmations.researchFormalConfirmed)}
                        onChange={(event) => updateConfirmations({ researchFormalConfirmed: parseBooleanSelect(event.target.value) })}
                      >
                        <option value="">请选择</option>
                        <option value="yes">已正式立项/发表/满足录用条件</option>
                        <option value="no">暂不满足</option>
                      </select>
                    </label>
                  )}
                  {needsPaperAcceptance && (
                    <label className="abp-confirm-field">
                      录用证明资格
                      <select
                        value={booleanSelectValue(confirmations.paperAcceptanceEligible)}
                        onChange={(event) => updateConfirmations({ paperAcceptanceEligible: parseBooleanSelect(event.target.value) })}
                      >
                        <option value="">请选择</option>
                        <option value="yes">国家二级及以上且十月前出刊</option>
                        <option value="no">不符合减半计分条件</option>
                      </select>
                    </label>
                  )}
                  {supportsPriorScore && (
                    <label className="abp-confirm-field">
                      历史已计入分值
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        value={confirmations.priorScore ?? 0}
                        onChange={(event) =>
                          updateConfirmations({ priorScore: Math.max(0, Number(event.target.value) || 0) })}
                      />
                    </label>
                  )}
                </div>
              )}
	              {!addEligibility.canAdd && addEligibility.reason && (
	                <div className="abp-blocked">{addEligibility.reason}</div>
	              )}
            </div>
          )}

          <button
            className="abp-add-btn"
            type="button"
            onClick={handleAdd}
            disabled={!selectedItem || !addEligibility.canAdd}
          >
	            <ListPlus size={16} />
	            {hasConfirmationFields ? '确认并添加' : '添加到智育计分'}
	          </button>
        </>
      )}
    </div>
  );
}
