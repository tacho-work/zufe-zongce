import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { api } from '../services/api';
import { ChevronDown, ChevronRight, FileDown, Loader2, RotateCcw, X } from 'lucide-react';
import type { FillPreviewResponse } from '../types/zongce';
import './FillDataEditor.css';

const SUBJECT_ORDER = ['moral', 'academic', 'sports', 'aesthetic', 'labor', 'other', 'total'];
const SUBJECT_LABELS: Record<string, string> = {
  moral: '德育', academic: '智育', sports: '体育',
  aesthetic: '美育', labor: '劳育', other: '其他', total: '总分',
};

interface Props {
  open: boolean;
  onClose: () => void;
}

function getSubjectKey(placeholder: string): string {
  if (placeholder === 'total_score') return 'total';
  return placeholder.split('_')[0];
}

function getRowId(placeholder: string): string {
  return `fde-row-${placeholder}`;
}

export function FillDataEditor({ open, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<FillPreviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<Record<string, string>>({});
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [exporting, setExporting] = useState(false);
  const originalRef = useRef<Record<string, string>>({});

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getFillPreview();
      setPreview(result);
      originalRef.current = { ...result.fillData };
      setEditedData({ ...result.fillData });
      setEditedFields(new Set());
      // Expand first subject by default
      const subjects = Object.keys(groupPlaceholders(result.placeholderLabels));
      if (subjects.length > 0) {
        setCollapsed({ [subjects[0]]: false });
      }
    } catch {
      setError('加载填充数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  const groupPlaceholders = useCallback((labels: Record<string, { section: string; column: string }>): Record<string, string[]> => {
    const groups: Record<string, string[]> = {};
    for (const ph of Object.keys(labels)) {
      const sk = getSubjectKey(ph);
      if (!groups[sk]) groups[sk] = [];
      groups[sk].push(ph);
    }
    return groups;
  }, []);

  const groups = useMemo(() => {
    if (!preview) return {};
    return groupPlaceholders(preview.placeholderLabels);
  }, [preview, groupPlaceholders]);

  const sortedSubjects = useMemo(() => {
    return Object.keys(groups).sort(
      (a, b) => SUBJECT_ORDER.indexOf(a) - SUBJECT_ORDER.indexOf(b),
    );
  }, [groups]);

  const handleChange = useCallback((placeholder: string, value: string) => {
    setEditedData((prev) => ({ ...prev, [placeholder]: value }));
    setEditedFields((prev) => {
      const next = new Set(prev);
      if (value === (originalRef.current[placeholder] ?? '')) {
        next.delete(placeholder);
      } else {
        next.add(placeholder);
      }
      return next;
    });
  }, []);

  const handleReset = useCallback((placeholder: string) => {
    const original = originalRef.current[placeholder] ?? '';
    setEditedData((prev) => ({ ...prev, [placeholder]: original }));
    setEditedFields((prev) => {
      const next = new Set(prev);
      next.delete(placeholder);
      return next;
    });
  }, []);

  const handleResetAll = useCallback(() => {
    setEditedData({ ...originalRef.current });
    setEditedFields(new Set());
  }, []);

  const toggleCollapse = useCallback((subject: string) => {
    setCollapsed((prev) => ({ ...prev, [subject]: !prev[subject] }));
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      await api.fillTemplateCustom(editedData);
    } catch {
      alert('导出失败，请检查后端是否运行');
    } finally {
      setExporting(false);
    }
  }, [editedData]);

  if (!open) return null;

  const renderContent = () => {
    // Loading state
    if (loading) {
      return (
        <div className="fde-state">
          <Loader2 size={18} className="fde-spin" />
          <span>加载填充数据...</span>
        </div>
      );
    }

    // Error state
    if (error) {
      return (
        <div className="fde-state fde-state-error">
          <p>{error}</p>
          <button className="btn btn-secondary btn-sm" onClick={loadPreview}>重试</button>
        </div>
      );
    }

    // No template uploaded
    if (!preview || preview.placeholders.length === 0) {
      return (
        <div className="fde-state">
          <span>请先在"Word 模板导出"中导入模板。</span>
        </div>
      );
    }

    // No calculation data
    const hasAnyData = Object.values(preview.fillData).some((v) => v !== '');
    if (!hasAnyData) {
      return (
        <div className="fde-state">
          <span>暂无填充数据，请先提交至少一个科目。</span>
        </div>
      );
    }

    return (
      <div className="fde-root">
      {sortedSubjects.map((subject) => {
        const isCollapsed = collapsed[subject] ?? false;
        const placeholders = groups[subject];
        return (
          <div key={subject} className="fde-group">
            <button
              className="fde-group-header"
              onClick={() => toggleCollapse(subject)}
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
              <span className="fde-group-title">{SUBJECT_LABELS[subject] ?? subject}</span>
              <span className="fde-group-count">{placeholders.length} 项</span>
            </button>
            {!isCollapsed && (
              <div className="fde-group-body">
                {placeholders.map((ph) => {
                  const label = preview.placeholderLabels[ph];
                  const value = editedData[ph] ?? '';
                  const isEdited = editedFields.has(ph);
                  return (
                    <div key={ph} className="fde-row" id={getRowId(ph)}>
                      <div className="fde-row-label">
                        <span className="fde-section">{label?.section ?? ph}</span>
                        <span className="fde-column">{label?.column ?? ''}</span>
                      </div>
                      <div className="fde-row-input">
                        <textarea
                          className="fde-textarea"
                          value={value}
                          onChange={(e) => handleChange(ph, e.target.value)}
                          rows={value ? Math.min(4, value.split('\n').length) : 1}
                        />
                      </div>
                      <div className="fde-row-actions">
                        {isEdited && <span className="fde-edited-tag">已编辑</span>}
                        {isEdited && (
                          <button
                            className="fde-reset-btn"
                            onClick={() => handleReset(ph)}
                            title="重置为原始值"
                          >
                            <RotateCcw size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Bottom bar with actions */}
      <div className="fde-actions">
        {editedFields.size > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={handleResetAll}>
            <RotateCcw size={14} />
            全部重置
          </button>
        )}
        <div className="fde-actions-right">
          <span className="fde-actions-hint">
            {editedFields.size > 0
              ? `${editedFields.size} 项已编辑`
              : '数据未修改'}
          </span>
          <button
            className="btn btn-primary"
            disabled={exporting}
            onClick={handleExport}
          >
            {exporting ? (
              <><Loader2 size={16} className="fde-spin" /><span>导出中…</span></>
            ) : (
              <><FileDown size={16} /><span>导出文件</span></>
            )}
          </button>
        </div>
      </div>
      </div>
    );
  };

  return (
    <div className="fde-overlay" onClick={onClose}>
      <div className="fde-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fde-modal-header">
          <span className="fde-modal-title">编辑填充数据</span>
          <button className="fde-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="fde-modal-body">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
