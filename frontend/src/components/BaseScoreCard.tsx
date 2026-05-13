import React, { useState, useCallback, useMemo } from 'react';
import { Copy, Check, Loader2, AlertTriangle } from 'lucide-react';
import type { SubjectId, AcademicBaseScoreResult } from '../types/zongce';
import './BaseScoreCard.css';

interface Props {
  sectionRef: React.RefObject<HTMLDivElement>;
  subjectId: SubjectId;
  academicResult: AcademicBaseScoreResult | null;
  academicLoading: boolean;
  academicError: string | null;
  settingsBaseScore?: number;
}

export function BaseScoreCard({
  sectionRef,
  subjectId,
  academicResult,
  academicLoading,
  academicError,
  settingsBaseScore,
}: Props) {
  const [copied, setCopied] = useState(false);

  const supportsCourseBaseScore = subjectId === 'academic' || subjectId === 'sports';
  const subjectLabel = subjectId === 'sports' ? '体育' : '智育';

  const formulaText = useMemo(() => {
    if (supportsCourseBaseScore && academicResult) {
      return academicResult.formulaText;
    }
    return '';
  }, [supportsCourseBaseScore, academicResult]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(formulaText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = formulaText;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [formulaText]);

  if (!supportsCourseBaseScore) {
    const displayScore = settingsBaseScore ?? 0;
    return (
      <div className="bsc-card" ref={sectionRef}>
        <h2 className="bsc-title">基础分</h2>
        <div className="bsc-idle">
          <span>基础分从设置中读取</span>
        </div>
        <div className="bsc-footer">
          <div className="bsc-score">基础分：{displayScore.toFixed(2)} 分</div>
        </div>
      </div>
    );
  }

  // Idle state — no file uploaded yet
  if (!academicLoading && !academicError && !academicResult) {
    return (
      <div className="bsc-card" ref={sectionRef}>
        <h2 className="bsc-title">基础分</h2>
        <div className="bsc-idle">
          <span>请先上传课程成绩文件计算{subjectLabel}基础分</span>
        </div>
      </div>
    );
  }

  // Loading state
  if (academicLoading) {
    return (
      <div className="bsc-card" ref={sectionRef}>
        <h2 className="bsc-title">基础分</h2>
        <div className="bsc-loading">
          <Loader2 size={20} className="bsc-spin" />
          <span>正在读取课程成绩文件并计算{subjectLabel}基础分…</span>
        </div>
      </div>
    );
  }

  // Error state
  if (academicError) {
    return (
      <div className="bsc-card" ref={sectionRef}>
        <h2 className="bsc-title">基础分</h2>
        <div className="bsc-error">
          <AlertTriangle size={18} />
          <span>{academicError}</span>
        </div>
      </div>
    );
  }

  if (!academicResult) {
    return (
      <div className="bsc-card" ref={sectionRef}>
        <h2 className="bsc-title">基础分</h2>
        <div className="bsc-idle">
          <span>请先上传课程成绩文件</span>
        </div>
      </div>
    );
  }

  const fileName = academicResult.fileName;
  const courseCount = academicResult.courseCount;
  const totalCredits = academicResult.totalCredits;
  const baseScore = academicResult.baseScore.toFixed(2);

  return (
    <div className="bsc-card" ref={sectionRef}>
      <h2 className="bsc-title">基础分</h2>

      <div className="bsc-meta">
        <div className="bsc-meta-row">
          <span className="bsc-meta-label">课程成绩文件：</span>
          <span className="bsc-meta-value">{fileName}</span>
        </div>
        <div className="bsc-meta-row">
          <span className="bsc-meta-label">识别到课程数：</span>
          <span className="bsc-meta-value">{courseCount} 门</span>
        </div>
        <div className="bsc-meta-row">
          <span className="bsc-meta-label">识别到总学分：</span>
          <span className="bsc-meta-value">{totalCredits}</span>
        </div>
      </div>

      <div className="bsc-formula-block">
        <div className="bsc-formula-label">计算明细：</div>
        <div className="bsc-formula">
          {academicResult.formulaText}
        </div>
      </div>

      <div className="bsc-footer">
        <button className="bsc-copy-btn" onClick={handleCopy} aria-label="复制基础分计算公式">
          {copied ? (
            <>
              <Check size={16} />
              <span>已复制</span>
            </>
          ) : (
            <>
              <Copy size={16} />
              <span>复制</span>
            </>
          )}
        </button>
        <div className="bsc-score">基础分：{baseScore} 分</div>
      </div>
    </div>
  );
}
