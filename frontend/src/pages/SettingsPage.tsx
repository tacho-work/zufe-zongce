import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../components/PageHeader';
import { ModulePanel } from '../components/ModulePanel';
import { SettingsPanel } from '../components/SettingsPanel';
import { api } from '../services/api';
import type { BaseScoreItem } from '../services/api';
import './SettingsPage.css';

const SETTINGS_BASE_SCORE_SUBJECTS = new Set(['moral', 'aesthetic', 'labor']);

export function SettingsPage() {
  // Base score settings
  const [baseScoreItems, setBaseScoreItems] = useState<BaseScoreItem[]>([]);
  const [savedBaseScores, setSavedBaseScores] = useState<Record<string, number>>({});
  const [baseScoresSaving, setBaseScoresSaving] = useState(false);

  // Shared states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Rules upload
  const [rulesUploading, setRulesUploading] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [rulesSuccess, setRulesSuccess] = useState<string | null>(null);

  const loadSettings = useCallback(() => {
    setLoading(true);
    setError(null);
    api.getBaseScoreSettings()
      .then((base) => {
        const editableItems = base.items.filter((item) => SETTINGS_BASE_SCORE_SUBJECTS.has(item.subjectId));
        setBaseScoreItems(editableItems);
        const saved: Record<string, number> = {};
        for (const item of editableItems) {
          saved[item.subjectId] = item.baseScore;
        }
        setSavedBaseScores(saved);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

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
        description="基础分配置、积分规则与导出默认参数。"
      />
      <div className="page-content">
        <ModulePanel title="服务与参数配置">
          <SettingsPanel
            loading={loading}
            error={error}
            success={success}
            baseScoreItems={baseScoreItems}
            onBaseScoreChange={handleBaseScoreChange}
            baseScoresSaving={baseScoresSaving}
            hasBaseScoreChanges={hasBaseScoreChanges}
            onBaseScoresSave={handleBaseScoresSave}
            onBaseScoresCancel={handleBaseScoresCancel}
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
