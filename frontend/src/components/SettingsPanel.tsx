import { Cpu, FileText, Upload, Loader2 } from 'lucide-react';
import { useRef } from 'react';
import type { BaseScoreItem } from '../services/api';
import './SettingsPanel.css';

interface Props {
  // AI
  aiToken: string;
  aiTokenConfigured: boolean;
  onAITokenChange: (v: string) => void;
  loading: boolean;
  aiSaving: boolean;
  error: string | null;
  success: string | null;
  hasAIChanges: boolean;
  onAISave: () => void;
  onAICancel: () => void;
  // Base scores
  baseScoreItems: BaseScoreItem[];
  onBaseScoreChange: (subjectId: string, value: number) => void;
  baseScoresSaving: boolean;
  hasBaseScoreChanges: boolean;
  onBaseScoresSave: () => void;
  onBaseScoresCancel: () => void;
  // Local defaults
  exportNamingRule: string;
  onExportNamingRuleChange: (v: string) => void;
  // Rules upload
  rulesUploading: boolean;
  rulesError: string | null;
  rulesSuccess: string | null;
  onRulesUpload: (file: File) => void;
}

export function SettingsPanel({
  aiToken, aiTokenConfigured, onAITokenChange,
  loading, aiSaving, error, success, hasAIChanges,
  onAISave, onAICancel,
  baseScoreItems, onBaseScoreChange, baseScoresSaving, hasBaseScoreChanges,
  onBaseScoresSave, onBaseScoresCancel,
  exportNamingRule, onExportNamingRuleChange,
  rulesUploading, rulesError, rulesSuccess, onRulesUpload,
}: Props) {
  const rulesFileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="sp-grid">
      {/* AI config — DeepSeek only */}
      <div className="sp-section">
        <h3 className="sp-section-title">
          <Cpu size={16} /> DeepSeek API 配置
        </h3>
        {loading ? (
          <p className="sp-desc">加载中...</p>
        ) : (
          <>
            <div className="sp-field">
              <label>Provider</label>
              <p className="sp-desc" style={{ margin: 0, fontWeight: 500, color: 'var(--color-text)' }}>
                DeepSeek
              </p>
            </div>
            <div className="sp-field">
              <label>API Base URL</label>
              <p className="sp-desc" style={{ margin: 0, fontWeight: 500, color: 'var(--color-text)' }}>
                https://api.deepseek.com/v1
              </p>
            </div>
            <div className="sp-field">
              <label>Model</label>
              <p className="sp-desc" style={{ margin: 0, fontWeight: 500, color: 'var(--color-text)' }}>
                deepseek-chat
              </p>
            </div>
            <div className="sp-field">
              <label>API Key</label>
              <input
                type="password"
                value={aiToken}
                onChange={(e) => onAITokenChange(e.target.value)}
                className="sp-input"
                placeholder={aiTokenConfigured ? '已配置，留空则不修改' : '请输入 DeepSeek API Key'}
              />
              <span className="sp-hint">
                Token 状态：
                <span className={`sp-chip ${aiTokenConfigured ? 'sp-chip-ok' : 'sp-chip-no'}`}>
                  {aiTokenConfigured ? '已配置' : '未配置'}
                </span>
                留空则保持现有 Token 不变
              </span>
            </div>
            <div className="sp-actions">
              <button
                className="sp-btn sp-btn-primary"
                onClick={onAISave}
                disabled={aiSaving || !hasAIChanges}
              >
                {aiSaving ? <><Loader2 size={14} className="sp-spin" /> 保存中</> : '保存'}
              </button>
              <button
                className="sp-btn"
                onClick={onAICancel}
                disabled={!hasAIChanges}
              >
                取消
              </button>
            </div>
          </>
        )}
      </div>

      {/* Base scores config */}
      <div className="sp-section">
        <h3 className="sp-section-title">
          <FileText size={16} /> 基础分配置
        </h3>
        {loading ? (
          <p className="sp-desc">加载中...</p>
        ) : (
          <>
            <p className="sp-desc" style={{ marginTop: 0, marginBottom: 'var(--space-md)' }}>
              设置各科目基础分。当前仅保存配置，后续计算接入时使用。
            </p>
            {baseScoreItems.map((item) => (
              <div className="sp-field" key={item.subjectId}>
                <label>{item.subjectName}</label>
                <input
                  type="number"
                  value={item.baseScore}
                  onChange={(e) => onBaseScoreChange(item.subjectId, Number(e.target.value))}
                  className="sp-input sp-input-narrow"
                  min={0}
                  max={100}
                />
              </div>
            ))}
            <div className="sp-actions">
              <button
                className="sp-btn sp-btn-primary"
                onClick={onBaseScoresSave}
                disabled={baseScoresSaving || !hasBaseScoreChanges}
              >
                {baseScoresSaving ? <><Loader2 size={14} className="sp-spin" /> 保存中</> : '保存'}
              </button>
              <button
                className="sp-btn"
                onClick={onBaseScoresCancel}
                disabled={!hasBaseScoreChanges}
              >
                取消
              </button>
            </div>
          </>
        )}
      </div>

      {/* Local defaults */}
      <div className="sp-section">
        <h3 className="sp-section-title">
          <FileText size={16} /> 其他配置
        </h3>
        <div className="sp-field">
          <label>导出文件命名规则</label>
          <input
            type="text"
            value={exportNamingRule}
            onChange={(e) => onExportNamingRuleChange(e.target.value)}
            className="sp-input"
            placeholder="综测计算_{date}"
          />
        </div>
      </div>

      {/* Rules file upload */}
      <div className="sp-section">
        <h3 className="sp-section-title">
          <Upload size={16} /> 积分规则
        </h3>
        <p className="sp-desc" style={{ marginTop: 0, marginBottom: 'var(--space-md)' }}>
          上传 JSON 格式的积分规则文件，将覆盖当前使用的规则。
        </p>
        <input
          ref={rulesFileRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onRulesUpload(file);
            e.target.value = '';
          }}
        />
        <div className="sp-actions">
          <button
            className="sp-btn sp-btn-primary"
            onClick={() => rulesFileRef.current?.click()}
            disabled={rulesUploading}
          >
            {rulesUploading ? <><Loader2 size={14} className="sp-spin" /> 上传中</> : <>选择文件并上传</>}
          </button>
        </div>
        {rulesSuccess && (
          <p className="sp-feedback sp-feedback-success" style={{ marginTop: 'var(--space-sm)' }}>
            {rulesSuccess}
          </p>
        )}
        {rulesError && (
          <p className="sp-feedback sp-feedback-error" style={{ marginTop: 'var(--space-sm)', whiteSpace: 'pre-line' }}>
            {rulesError}
          </p>
        )}
      </div>

      {/* Global feedback */}
      {!loading && (success || error) && (
        <div className="sp-feedback-global">
          {success && <p className="sp-feedback sp-feedback-success">{success}</p>}
          {error && <p className="sp-feedback sp-feedback-error">{error}</p>}
        </div>
      )}
    </div>
  );
}
