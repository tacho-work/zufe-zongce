import React, { useState, useCallback } from 'react';
import { Copy, Check, X } from 'lucide-react';
import type { ScoreRecord } from '../types/zongce';
import './BonusScoreCard.css';

function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function signedScore(value: number): string {
  return `${value >= 0 ? `+${formatScore(value)}` : formatScore(value)}分`;
}

function buildRecordCopyText(records: ScoreRecord[], total: number, subjectName: string): string {
  const lines = records.map((record, idx) => {
	    const constraints = record.constraintMessages.length > 0
	      ? record.constraintMessages.join('；')
	      : '无';
    const confirmations = record.confirmationMessages && record.confirmationMessages.length > 0
      ? record.confirmationMessages.join('；')
      : '无';
	    return [
	      `${idx + 1}. ${record.name}：${signedScore(record.finalScore)}`,
	      `   原始分：${signedScore(record.rawScore)}，实际计入：${signedScore(record.finalScore)}`,
	      `   来源：第${record.sourcePage ?? '-'}页 ${record.sourceText}`,
	      `   约束：${constraints}`,
      `   确认：${confirmations}`,
	      record.adjustmentReason ? `   调整：${record.adjustmentReason}` : '',
	    ].filter(Boolean).join('\n');
  });
  lines.push(`\n${subjectName}计分合计：${signedScore(total)}`);
  return lines.join('\n');
}

interface Props {
  bonusTotal: number;
  sectionRef: React.RefObject<HTMLDivElement>;
  records: ScoreRecord[];
  title?: string;
  subjectName: string;
}

export function BonusScoreCard({
  bonusTotal,
  sectionRef,
  records,
  title = '附加分',
  subjectName,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const activeRecord = records.find((record) => record.id === activeRecordId) ?? null;

  const handleCopy = useCallback(async () => {
    const text = buildRecordCopyText(records, bonusTotal, subjectName);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [bonusTotal, records, subjectName]);

  return (
    <div className="bnsc-card" ref={sectionRef}>
      <h2 className="bnsc-title">{title}</h2>

      {records.length === 0 ? (
        <p className="bnsc-empty">暂无{subjectName}计分记录</p>
      ) : (
        <ul className="bnsc-list">
          {records.map((record, idx) => (
            <li key={record.id} className="bnsc-item">
                <button
                  type="button"
                  className={`bnsc-record-btn${record.adjustmentReason ? ' bnsc-record-btn-adjusted' : ''}`}
                  onClick={() => setActiveRecordId(record.id)}
                >
                  <span className="bnsc-record-name">
	                  {idx + 1}. {record.name}：{signedScore(record.finalScore)}
                  </span>
                  {record.adjustmentReason && <span className="bnsc-record-badge">有调整</span>}
                </button>
            </li>
          ))}
        </ul>
      )}

      <div className="bnsc-footer">
        <button className="bnsc-copy-btn" onClick={handleCopy} aria-label="复制附加分计算过程">
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
	        <div className="bnsc-score">{title}：{signedScore(bonusTotal)}</div>
	      </div>
      {activeRecord && (
        <div className="bnsc-modal-backdrop" role="presentation" onClick={() => setActiveRecordId(null)}>
          <div
            className="bnsc-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${subjectName}计分详情`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bnsc-modal-header">
              <div>
                <div className="bnsc-modal-title">{activeRecord.name}</div>
                <div className="bnsc-modal-score">{signedScore(activeRecord.finalScore)}</div>
              </div>
              <button
                type="button"
                className="bnsc-modal-close"
                aria-label="关闭详情"
                onClick={() => setActiveRecordId(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="bnsc-modal-section">
              <div>原始分：{signedScore(activeRecord.rawScore)}</div>
              <div>实际计入：{signedScore(activeRecord.finalScore)}</div>
            </div>

            {activeRecord.adjustmentReason && (
              <div className="bnsc-modal-warning">
                调整：{activeRecord.adjustmentReason}
              </div>
            )}

            <div className="bnsc-modal-section">
              <div className="bnsc-modal-label">来源</div>
              <p>第{activeRecord.sourcePage ?? '-'}页 {activeRecord.sourceText}</p>
            </div>

            {activeRecord.constraintMessages.length > 0 && (
              <div className="bnsc-modal-section">
                <div className="bnsc-modal-label">约束</div>
                {activeRecord.constraintMessages.map((msg) => (
                  <p key={msg}>{msg}</p>
                ))}
              </div>
            )}

            {activeRecord.confirmationMessages && activeRecord.confirmationMessages.length > 0 && (
              <div className="bnsc-modal-section">
                <div className="bnsc-modal-label">确认</div>
                {activeRecord.confirmationMessages.map((msg) => (
                  <p key={msg}>{msg}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
	    </div>
	  );
	}
