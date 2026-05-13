import React from 'react';
import { ArrowDown, ArrowUp, Loader2, CheckCircle } from 'lucide-react';
import './FloatingTotalBar.css';

type ActiveSection = 'base' | 'bonus';

interface Props {
  subjectName: string;
  baseScore: number;
  bonusTotal: number;
  totalScore: number;
  activeSection: ActiveSection;
  baseSectionRef: React.RefObject<HTMLDivElement>;
  bonusSectionRef: React.RefObject<HTMLDivElement>;
  onToggle: (next: ActiveSection) => void;
  onSubmit?: () => void;
  submitting?: boolean;
  submitted?: boolean;
}

const TOGGLE_LABELS: Record<ActiveSection, string> = {
  base: '基础分',
  bonus: '附加分',
};

export function FloatingTotalBar({
  subjectName,
  baseScore,
  bonusTotal,
  totalScore,
  activeSection,
  baseSectionRef,
  bonusSectionRef,
  onToggle,
  onSubmit,
  submitting,
  submitted,
}: Props) {
  const handleToggle = () => {
    const next: ActiveSection = activeSection === 'base' ? 'bonus' : 'base';
    const targetRef = next === 'base' ? baseSectionRef : bonusSectionRef;
    targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    onToggle(next);
  };

  const Icon = activeSection === 'base' ? ArrowDown : ArrowUp;
  const bonusFormula = bonusTotal >= 0
    ? `+ ${bonusTotal}`
    : `- ${Math.abs(bonusTotal)}`;

  return (
    <div className="ftb-bar">
      <button className="ftb-toggle" onClick={handleToggle}>
        <Icon size={14} />
        <span>{TOGGLE_LABELS[activeSection]}</span>
      </button>

      <div className="ftb-total">
        <span className="ftb-label">{subjectName}总分：</span>
        <span className="ftb-formula">
          {baseScore.toFixed(2)}分 {bonusFormula}分
        </span>
        <span className="ftb-equals"> = </span>
        <span className="ftb-value">{totalScore.toFixed(2)}分</span>
      </div>

      {onSubmit && (
        <button
          className="ftb-submit-btn"
          onClick={onSubmit}
          disabled={submitting || submitted}
        >
          {submitted ? (
            <><CheckCircle size={16} /><span>已提交</span></>
          ) : submitting ? (
            <><Loader2 size={16} className="spin" /><span>提交中…</span></>
          ) : (
            <span>提交成绩</span>
          )}
        </button>
      )}
    </div>
  );
}
