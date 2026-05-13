import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../components/PageHeader';
import { ModulePanel } from '../components/ModulePanel';
import { SettingsPanel } from '../components/SettingsPanel';
import { api } from '../services/api';
import type { BaseScoreItem } from '../services/api';
import './SettingsPage.css';

export function SettingsPage() {
  // AI settings — DeepSeek only
  const [aiToken, setAiToken] = useState('');
  const [aiTokenConfigured, setAiTokenConfigured] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);

  // Base score settings
  const [baseScoreItems, setBaseScoreItems] = useState<BaseScoreItem[]>([]);
  const [savedBaseScores, setSavedBaseScores] = useState<Record<string, number>>({});
  const [baseScoresSaving, setBaseScoresSaving] = useState(false);

  // Shared states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Local-only settings
  const [exportNamingRule, setExportNamingRule] = useState('综测计算_{date}');

  // Rules upload
  const [rulesUploading, setRulesUploading] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [rulesSuccess, setRulesSuccess] = useState<string | null>(null);

  const loadSettings = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.getAISettings(),
      api.getBaseScoreSettings(),
    ])
      .then(([ai, base]) => {
        setAiTokenConfigured(ai.aiTokenConfigured);

        setBaseScoreItems(base.items);
        const saved: Record<string, number> = {};
        for (const item of base.items) {
          saved[item.subjectId] = item.baseScore;
        }
        setSavedBaseScores(saved);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const handleAISave = async () => {
    setAiSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const body: { aiProvider: string; aiBaseUrl: string; aiModel: string; aiToken?: string } = {
        aiProvider: 'deepseek',
        aiBaseUrl: 'https://api.deepseek.com/v1',
        aiModel: 'deepseek-chat',
      };
      if (aiToken) body.aiToken = aiToken;
      await api.updateAISettings(body);
      setAiToken('');
      setAiTokenConfigured(true);
      setSuccess('DeepSeek API Key 已保存');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setAiSaving(false);
    }
  };

  const handleAICancel = () => {
    setAiToken('');
  };

  const hasAIChanges = aiToken !== '';

  const handleBaseScoreChange = (subjectId: string, value: number) => {
    setBaseScoreItems((prev) =>
      prev.map((item) =>
        item.subjectId === subjectId ? { ...item, baseScore: value } : item,
      ),
    );
  };

  const handleBaseScoresSave = async () => {
    setBaseScoresSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const items = baseScoreItems.map((item) => ({
        subjectId: item.subjectId,
        baseScore: item.baseScore,
      }));
      const updated = await api.updateBaseScoreSettings({ items });
      setBaseScoreItems(updated.items);
      const saved: Record<string, number> = {};
      for (const item of updated.items) {
        saved[item.subjectId] = item.baseScore;
      }
      setSavedBaseScores(saved);
      setSuccess('基础分配置已保存');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setBaseScoresSaving(false);
    }
  };

  const handleBaseScoresCancel = () => {
    setBaseScoreItems((prev) =>
      prev.map((item) => ({
        ...item,
        baseScore: savedBaseScores[item.subjectId] ?? item.baseScore,
      })),
    );
  };

  const hasBaseScoreChanges = baseScoreItems.some(
    (item) => item.baseScore !== savedBaseScores[item.subjectId],
  );

  const handleRulesUpload = async (file: File) => {
    setRulesUploading(true);
    setRulesError(null);
    setRulesSuccess(null);
    try {
      const result = await api.uploadRulesFile(file);
      const lines = Object.entries(result.summary)
        .map(([id, count]) => `${id}: ${count} 条`)
        .join('、');
      setRulesSuccess(`积分规则已更新\n${lines}`);
    } catch (e: unknown) {
      setRulesError(e instanceof Error ? e.message : '上传失败');
    } finally {
      setRulesUploading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="设置"
        description="DeepSeek API 密钥、基础分配置与默认参数。Token 仅在后端保存，不会显示在前端。"
      />
      <div className="page-content">
        <ModulePanel title="服务与参数配置">
          <SettingsPanel
            aiToken={aiToken}
            aiTokenConfigured={aiTokenConfigured}
            onAITokenChange={setAiToken}
            loading={loading}
            aiSaving={aiSaving}
            error={error}
            success={success}
            hasAIChanges={hasAIChanges}
            onAISave={handleAISave}
            onAICancel={handleAICancel}
            baseScoreItems={baseScoreItems}
            onBaseScoreChange={handleBaseScoreChange}
            baseScoresSaving={baseScoresSaving}
            hasBaseScoreChanges={hasBaseScoreChanges}
            onBaseScoresSave={handleBaseScoresSave}
            onBaseScoresCancel={handleBaseScoresCancel}
            exportNamingRule={exportNamingRule}
            onExportNamingRuleChange={setExportNamingRule}
            rulesUploading={rulesUploading}
            rulesError={rulesError}
            rulesSuccess={rulesSuccess}
            onRulesUpload={handleRulesUpload}
          />
        </ModulePanel>
      </div>
    </>
  );
}
