import { FileText, Upload, Loader2 } from 'lucide-react';
import { useRef } from 'react';
import type { BaseScoreItem } from '../services/api';
import './SettingsPanel.css';

interface Props {
  loading: boolean;
  error: string | null;
  success: string | null;
  // Base scores
  baseScoreItems: BaseScoreItem[];
  onBaseScoreChange: (subjectId: string, value: number) => void;
  baseScoresSaving: boolean;
  hasBaseScoreChanges: boolean;
  onBaseScoresSave: () => void;
  onBaseScoresCancel: () => void;
  // Rules upload
  rulesUploading: boolean;
  rulesError: string | null;
  rulesSuccess: string | null;
  onRulesUpload: (file: File) => void;
}

export function SettingsPanel({
  loading, error, success,
  baseScoreItems, onBaseScoreChange, baseScoresSaving, hasBaseScoreChanges,
  onBaseScoresSave, onBaseScoresCancel,
  rulesUploading, rulesError, rulesSuccess, onRulesUpload,
}: Props) {
  const rulesFileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="sp-grid">
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
              德育、美育、劳育使用这里的固定基础分；智育和体育在对应科目页上传成绩文件后计算。
            </p>
            <div className="sp-base-score-grid">
              {baseScoreItems.map((item) => (
                <div className="sp-field sp-base-score-field" key={item.subjectId}>
                  <label>{item.subjectName}</label>
                  <input
                    type="number"
                    value={item.baseScore}
                    onChange={(e) => onBaseScoreChange(item.subjectId, Number(e.target.value))}
                    className="sp-input"
                    min={0}
                    max={100}
                  />
                </div>
              ))}
              <div className="sp-base-score-note">
                <span>智育</span>
                <span>上传成绩文件计算</span>
              </div>
              <div className="sp-base-score-note">
                <span>体育</span>
                <span>上传成绩文件计算</span>
              </div>
            </div>
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
