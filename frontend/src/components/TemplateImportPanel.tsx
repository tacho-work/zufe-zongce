import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, FileText, X, Loader2, Check } from 'lucide-react';
import { api } from '../services/api';
import type { TemplateUploadResponse } from '../types/zongce';
import './TemplateImportPanel.css';

interface Props {
  onTemplateChange: (hasTemplate: boolean) => void;
  onPlaceholdersReady: (placeholders: string[]) => void;
}

type Status = 'idle' | 'uploading' | 'success' | 'error';

export function TemplateImportPanel({ onTemplateChange, onPlaceholdersReady }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [dragOver, setDragOver] = useState(false);
  const [uploadResult, setUploadResult] = useState<TemplateUploadResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // On mount, check server template state.
  useEffect(() => {
    api.getTemplatePlaceholders().then((res) => {
      if (res.hasTemplate) {
        setStatus('success');
        setUploadResult({
          filename: res.filename ?? '已加载模板',
          placeholders: res.placeholders,
          uploadedAt: new Date().toISOString(),
        });
        onTemplateChange(res.placeholders.length > 0);
        onPlaceholdersReady(res.placeholders);
      }
    }).catch(() => {});
  }, [onTemplateChange, onPlaceholdersReady]);

  const uploadFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.docx')) {
      setStatus('error');
      setErrorMsg('仅支持 .docx 格式文件');
      return;
    }

    setStatus('uploading');
    try {
      const result = await api.uploadTemplate(file);
      setUploadResult(result);
      setStatus('success');
      onTemplateChange(result.placeholders.length > 0);
      onPlaceholdersReady(result.placeholders);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : '上传失败');
    }
  }, [onTemplateChange, onPlaceholdersReady]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const handleReplace = useCallback(() => {
    setStatus('idle');
    setUploadResult(null);
    setErrorMsg('');
    onTemplateChange(false);
    onPlaceholdersReady([]);
    setTimeout(() => inputRef.current?.click(), 0);
  }, [onTemplateChange, onPlaceholdersReady]);

  const handleDelete = useCallback(async () => {
    try {
      await api.deleteTemplate();
    } catch { /* ignore */ }
    setStatus('idle');
    setUploadResult(null);
    setErrorMsg('');
    onTemplateChange(false);
    onPlaceholdersReady([]);
  }, [onTemplateChange, onPlaceholdersReady]);

  const handleRetry = useCallback(() => {
    setStatus('idle');
    setErrorMsg('');
  }, []);

  return (
    <div
      className={`tip-panel ${dragOver ? 'tip-dragover' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".docx"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {status === 'idle' && (
        <div className="tip-idle" onClick={() => inputRef.current?.click()}>
          <Upload size={24} />
          <p className="tip-title">导入 Word 模板</p>
          <p className="tip-hint">请上传已插入占位符的 .docx 文件</p>
        </div>
      )}

      {status === 'uploading' && (
        <div className="tip-progress">
          <Loader2 size={24} className="spin" />
          <p>正在上传模板...</p>
        </div>
      )}

      {status === 'success' && uploadResult && (
        <div className="tip-success">
          <div className="tip-success-header">
            <FileText size={20} />
            <span className="tip-filename">{uploadResult.filename}</span>
            <Check size={16} className="tip-check" />
          </div>
          <div className="tip-placeholder-count">
            检测到 <strong>{uploadResult.placeholders.length}</strong> 个可填充字段
          </div>
          {uploadResult.placeholders.length === 0 && (
            <p className="tip-error-msg">未检测到占位符，请更换为已插入占位符的模板。</p>
          )}

          <div className="tip-actions">
            <button className="btn btn-secondary btn-sm" onClick={handleReplace}>
              更换模板
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleDelete}>
              <X size={14} /> 删除
            </button>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="tip-error">
          <p className="tip-error-msg">{errorMsg}</p>
          <button className="btn btn-secondary btn-sm" onClick={handleRetry}>
            重试
          </button>
        </div>
      )}
    </div>
  );
}
