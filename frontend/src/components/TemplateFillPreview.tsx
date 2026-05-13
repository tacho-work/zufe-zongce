import { useState, useCallback } from 'react';
import { api } from '../services/api';
import { FileDown, Loader2 } from 'lucide-react';
import './TemplateFillPreview.css';

interface Props {
  hasTemplate: boolean;
  placeholders: string[];
}

export function TemplateFillPreview({ hasTemplate, placeholders }: Props) {
  const [filling, setFilling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    setFilling(true);
    setError(null);
    try {
      await api.fillTemplate();
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出失败，请先执行计算');
    } finally {
      setFilling(false);
    }
  }, []);

  if (!hasTemplate || placeholders.length === 0) {
    return (
      <div className="tfp-empty">
        请先在"Word 模板导出"中导入模板。
      </div>
    );
  }

  return (
    <div className="tfp-root">
      <div className="tfp-info">
        模板已就绪，共识别 {placeholders.length} 个占位符。
        <button
          className="btn btn-primary"
          disabled={filling}
          onClick={handleExport}
        >
          {filling ? <Loader2 size={16} className="spin" /> : <FileDown size={16} />}
          下载填写后的登记表
        </button>
      </div>

      {error && <p className="tfp-error">{error}</p>}
    </div>
  );
}
