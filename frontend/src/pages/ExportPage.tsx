import { useState, useEffect, useCallback } from 'react';
import { FileEdit } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { ModulePanel } from '../components/ModulePanel';
import { TemplateImportPanel } from '../components/TemplateImportPanel';
import { TemplateFillPreview } from '../components/TemplateFillPreview';
import { FillDataEditor } from '../components/FillDataEditor';
import { api } from '../services/api';
import './ExportPage.css';

interface ScoreSummarySubject {
  subjectId: string;
  subjectName: string;
  baseScore: number;
  totalScore: number | null;
}

export function ExportPage() {
  const [templatePlaceholders, setTemplatePlaceholders] = useState<string[]>([]);
  const [hasTemplate, setHasTemplate] = useState(false);
  const [scoreSummary, setScoreSummary] = useState<ScoreSummarySubject[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [fillEditorOpen, setFillEditorOpen] = useState(false);

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
    fetchScoreSummary();
    api.getTemplatePlaceholders().then((res) => {
      if (res.hasTemplate) {
        setHasTemplate(true);
        setTemplatePlaceholders(res.placeholders);
      }
    }).catch(() => {});
  }, [fetchScoreSummary]);

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
      </div>
    </>
  );
}
