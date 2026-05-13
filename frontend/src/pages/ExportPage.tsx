import { useState, useEffect, useCallback } from 'react';
import { FileEdit } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { ModulePanel } from '../components/ModulePanel';
import { TemplateImportPanel } from '../components/TemplateImportPanel';
import { TemplateFillPreview } from '../components/TemplateFillPreview';
import { FillDataEditor } from '../components/FillDataEditor';
import { api } from '../services/api';
import type { ExportPreview } from '../types/zongce';
import './ExportPage.css';

interface ScoreSummarySubject {
  subjectId: string;
  subjectName: string;
  baseScore: number;
  totalScore: number | null;
}

export function ExportPage() {
  const [data, setData] = useState<ExportPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templatePlaceholders, setTemplatePlaceholders] = useState<string[]>([]);
  const [hasTemplate, setHasTemplate] = useState(false);
  const [scoreSummary, setScoreSummary] = useState<ScoreSummarySubject[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [fillEditorOpen, setFillEditorOpen] = useState(false);

  const fetchPreview = useCallback(async () => {
    try {
      setLoading(true);
      const result = await api.getExportPreview();
      setData(result);
      setError(null);
    } catch {
      setError('无法加载数据（后端可能未启动，或需先执行计算）');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchScoreSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const result = await api.getScoreSummary();
      setScoreSummary(result.subjects);
    } catch {
      // silently fail — score summary is non-critical
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreview();
    fetchScoreSummary();
    api.getTemplatePlaceholders().then((res) => {
      if (res.hasTemplate) {
        setHasTemplate(true);
        setTemplatePlaceholders(res.placeholders);
      }
    }).catch(() => {});
  }, [fetchPreview, fetchScoreSummary]);

  if (loading) {
    return (
      <>
        <PageHeader title="导出" description="加载中..." />
        <div className="page-content"><p className="sp-loading">加载中...</p></div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="导出" description="Word 模板导出" />
      <div className="page-content">

        {/* Section 1: Score summary */}
        <ModulePanel title="成绩汇总">
          {summaryLoading ? (
            <p className="sp-loading">加载中...</p>
          ) : scoreSummary.length === 0 ? (
            <p className="text-muted">暂无已提交的成绩数据。</p>
          ) : (
            <div className="export-summary-grid">
              {scoreSummary.map((s) => (
                <div key={s.subjectId} className="export-summary-item">
                  <span className="export-summary-name">{s.subjectName}</span>
                  <span className="export-summary-total">
                    总分：{s.totalScore !== null ? s.totalScore.toFixed(2) : '未提交'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ModulePanel>

        {/* Section 2: Template import & fill */}
        <ModulePanel title="Word 模板导出">
          <TemplateImportPanel
            onTemplateChange={setHasTemplate}
            onPlaceholdersReady={setTemplatePlaceholders}
          />
          {hasTemplate && (
            <TemplateFillPreview
              hasTemplate={hasTemplate}
              placeholders={templatePlaceholders}
            />
          )}
        </ModulePanel>

        {/* Section 3: Fill data preview & edit button */}
        <ModulePanel title="导出文件">
          <div className="ep-fill-entry">
            <p className="ep-fill-desc">预览各占位符对应的填充数据，支持手动修改后导出。</p>
            <button
              className="btn btn-primary"
              onClick={() => setFillEditorOpen(true)}
              disabled={!hasTemplate}
            >
              <FileEdit size={16} />
              编辑填充数据
            </button>
          </div>
        </ModulePanel>

        <FillDataEditor open={fillEditorOpen} onClose={() => setFillEditorOpen(false)} />

        {/* Error state */}
        {error && (
          <div className="sp-error">
            <p>{error}</p>
            <button className="btn btn-primary btn-sm" onClick={fetchPreview}>重试</button>
          </div>
        )}
      </div>
    </>
  );
}
