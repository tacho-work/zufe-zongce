import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, FileText, X, Loader2, Check, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import type { TemplateUploadResponse } from '../types/zongce';
import './TemplateImportPanel.css';

interface Props {
  onTemplateChange: (hasTemplate: boolean) => void;
  onPlaceholdersReady: (placeholders: string[]) => void;
}

type Status = 'idle' | 'uploading' | 'success' | 'error';

const AI_TASK_KEY = 'template-ai-task-id';

export function TemplateImportPanel({ onTemplateChange, onPlaceholdersReady }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [dragOver, setDragOver] = useState(false);
  const [uploadResult, setUploadResult] = useState<TemplateUploadResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [aiRecognizing, setAiRecognizing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, []);

  const stopPolling = useCallback(() => {
    setAiRecognizing(false);
    localStorage.removeItem(AI_TASK_KEY);
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const startPolling = useCallback((taskId: string) => {
    localStorage.setItem(AI_TASK_KEY, taskId);
    const poll = async () => {
      if (!mountedRef.current) return;
      try {
        const statusResp = await api.getAIStatus(taskId);
        if (!mountedRef.current) return;
        if (statusResp.status === 'done') {
          const placeholders = (statusResp as { placeholders: string[] }).placeholders;
          setUploadResult((prev) => prev ? { ...prev, placeholders } : null);
          onPlaceholdersReady(placeholders);
          stopPolling();
        } else if (statusResp.status === 'error') {
          setErrorMsg((statusResp as { error: string }).error ?? 'AI 识别失败');
          stopPolling();
        } else {
          pollTimerRef.current = setTimeout(poll, 3000);
        }
      } catch {
        if (mountedRef.current) {
          setErrorMsg('查询 AI 识别状态失败');
          stopPolling();
        }
      }
    };
    pollTimerRef.current = setTimeout(poll, 2000);
  }, [onPlaceholdersReady, stopPolling]);

  // On mount, check server template state and resume AI polling if needed
  useEffect(() => {
    const savedTaskId = localStorage.getItem(AI_TASK_KEY);
    api.getTemplatePlaceholders().then((res) => {
      if (res.hasTemplate) {
        setStatus('success');
        setUploadResult({
          filename: res.filename ?? '已加载模板',
          placeholders: res.placeholders,
          uploadedAt: new Date().toISOString(),
        });
        onTemplateChange(true);
        onPlaceholdersReady(res.placeholders);
        // Resume AI polling if there's a saved task or server says it's processing
        const taskId = res.aiTaskId || savedTaskId;
        if (taskId && res.placeholders.length === 0) {
          setAiRecognizing(true);
          startPolling(taskId);
        } else if (taskId && res.placeholders.length > 0) {
          // AI already completed — clean up localStorage
          localStorage.removeItem(AI_TASK_KEY);
        }
      }
    }).catch(() => {});
  }, [onTemplateChange, onPlaceholdersReady, startPolling]);

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
      onTemplateChange(true);
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
    stopPolling();
    setStatus('idle');
    setUploadResult(null);
    setErrorMsg('');
    onTemplateChange(false);
    onPlaceholdersReady([]);
    setTimeout(() => inputRef.current?.click(), 0);
  }, [onTemplateChange, onPlaceholdersReady, stopPolling]);

  const handleDelete = useCallback(async () => {
    stopPolling();
    try {
      await api.deleteTemplate();
    } catch { /* ignore */ }
    setStatus('idle');
    setUploadResult(null);
    setErrorMsg('');
    onTemplateChange(false);
    onPlaceholdersReady([]);
  }, [onTemplateChange, onPlaceholdersReady, stopPolling]);

  const handleRetry = useCallback(() => {
    stopPolling();
    setStatus('idle');
    setErrorMsg('');
  }, [stopPolling]);

  const handleAIRecognize = useCallback(async () => {
    setAiRecognizing(true);
    setErrorMsg('');
    try {
      const { taskId } = await api.aiRecognizeTemplate();
      startPolling(taskId);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'AI 识别启动失败');
      stopPolling();
    }
  }, [startPolling, stopPolling]);

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
          <p className="tip-hint">拖拽 .docx 文件到此处，或点击选择</p>
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
            <div className="tip-ai-section">
              <p className="tip-hint">空白模板未检测到占位符，可使用 AI 自动识别插入。</p>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleAIRecognize}
                disabled={aiRecognizing}
              >
                {aiRecognizing ? <><Loader2 size={14} className="spin" /> 识别中</> : <><Sparkles size={14} /> AI 识别占位符</>}
              </button>
              {errorMsg && <p className="tip-error-msg">{errorMsg}</p>}
            </div>
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
