import type {
  SubjectSummary, SubjectConfig, AssessmentRule,
  ExportPreview,
  StudentScorePreview, AcademicBaseScoreResult, AcademicRulesResponse, SubjectRulesResponse,
  TemplateUploadResponse, TemplatePlaceholdersResponse, FillPreviewResponse,
} from '../types/zongce';

const BASE_URL = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let serverMsg = "";
    try {
      const body = await res.json();
      if (body?.error) serverMsg = `: ${body.error}`;
    } catch { /* ignore parse failure */ }
    throw new Error(`API error ${res.status}${serverMsg}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface Part {
  id: number; label: string; type: string; order: number;
}

export interface DashboardSummary {
  parts: (Part & { record_count: number })[];
  total_records: number;
}

export interface RecordItem {
  id: number; part_id: number; category: string; status: string;
  score: number; metadata_json: string; created_at: string; updated_at: string;
}

export interface AISettingsResponse {
  aiProvider: string;
  aiBaseUrl: string;
  aiModel: string;
  aiTokenConfigured: boolean;
  updatedAt: string | null;
}

export interface BaseScoreItem {
  subjectId: string;
  subjectName: string;
  baseScore: number;
}

export interface BaseScoreSettingsResponse {
  items: BaseScoreItem[];
  updatedAt: string | null;
}

export const api = {
  health: () => request<{ status: string }>('/health'),
  setup: () => request('/setup', { method: 'POST' }),
  getParts: () => request<Part[]>('/parts'),
  getDashboardSummary: () => request<DashboardSummary>('/dashboard/summary'),
  getDashboardPart: (partId: number) => request<any>(`/dashboard/parts/${partId}`),
  getRecords: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<RecordItem[]>(`/records${qs}`);
  },
  createRecord: (body: Partial<RecordItem>) =>
    request<RecordItem>('/records', { method: 'POST', body: JSON.stringify(body) }),
  getRecord: (id: number) => request<RecordItem>(`/records/${id}`),
  updateRecord: (id: number, body: Partial<RecordItem>) =>
    request<RecordItem>(`/records/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteRecord: (id: number) =>
    request<void>(`/records/${id}`, { method: 'DELETE' }),
  getMaterials: () => request<any[]>('/materials'),
  getTasks: () => request<any[]>('/tasks'),
  getTimeline: () => request<any[]>('/timeline'),

  // -- Subjects --
  getSubjects: () => request<SubjectSummary[]>('/subjects'),
  getSubject: (subjectId: string) => request<SubjectConfig>(`/subjects/${subjectId}`),
  patchSubject: (subjectId: string, body: { baseScore?: number; maxScore?: number; status?: string }) =>
    request<{ ok: boolean }>(`/subjects/${subjectId}`, { method: 'PATCH', body: JSON.stringify(body) }),

  // -- Rules --
  getSubjectRules: (subjectId: string) =>
    request<SubjectRulesResponse>(`/rules/${subjectId}`),
  getAcademicRules: () =>
    request<AcademicRulesResponse>('/rules/academic'),
  createRule: (subjectId: string, body: Partial<AssessmentRule>) =>
    request<{ id: string }>(`/subjects/${subjectId}/rules`, { method: 'POST', body: JSON.stringify(body) }),
  patchRule: (ruleId: string, body: Partial<AssessmentRule>) =>
    request<{ ok: boolean }>(`/rules/${ruleId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteRule: (ruleId: string) =>
    request<void>(`/rules/${ruleId}`, { method: 'DELETE' }),

  // -- Calculate --
  runCalculation: () =>
    request<StudentScorePreview[]>('/calculate', { method: 'POST' }),

  // -- Export --
  getExportPreview: () => request<ExportPreview>('/export/preview'),
  doExport: (format: 'excel' | 'csv') =>
    request<any>('/export', { method: 'POST', body: JSON.stringify({ format }) }),

  // -- Settings --
  getAISettings: () => request<AISettingsResponse>('/settings/ai'),
  updateAISettings: (body: { aiProvider: string; aiBaseUrl: string; aiModel: string; aiToken?: string; clearAiToken?: boolean }) =>
    request<AISettingsResponse>('/settings/ai', { method: 'PATCH', body: JSON.stringify(body) }),
  getBaseScoreSettings: () => request<BaseScoreSettingsResponse>('/settings/base-scores'),
  updateBaseScoreSettings: (body: { items: { subjectId: string; baseScore: number }[] }) =>
    request<BaseScoreSettingsResponse>('/settings/base-scores', { method: 'PATCH', body: JSON.stringify(body) }),

  // -- Rules upload --
  uploadRulesFile: async (file: File): Promise<{ ok: boolean; summary: Record<string, number> }> => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${BASE_URL}/settings/rules/upload`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) {
      let msg = '';
      try { const body = await res.json(); if (body?.error) msg = `: ${body.error}${body.details ? '\n' + body.details.join('\n') : ''}`; } catch { /* ignore */ }
      throw new Error(`上传失败${msg}`);
    }
    return res.json();
  },

  // -- Base score (file upload) --
  uploadSubjectBaseScore: async (subjectId: 'academic' | 'sports', file: File): Promise<AcademicBaseScoreResult> => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE_URL}/subjects/${subjectId}/base-score`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      let serverMsg = "";
      try {
        const body = await res.json();
        if (body?.error) serverMsg = `: ${body.error}`;
      } catch { /* ignore parse failure */ }
      throw new Error(`API error ${res.status}${serverMsg}`);
    }
    return res.json();
  },
  uploadAcademicBaseScore: (file: File): Promise<AcademicBaseScoreResult> =>
    api.uploadSubjectBaseScore('academic', file),

  // -- Submit --
  submitSubjectScore: (subjectId: string, data: { baseScore: number; totalScore: number; entries: any[] }) =>
    request<{ ok: boolean }>(`/subjects/${subjectId}/submit`, { method: 'PUT', body: JSON.stringify(data) }),
  getScoreSummary: () =>
    request<{ subjects: Array<{ subjectId: string; subjectName: string; baseScore: number; totalScore: number | null }> }>('/export/score-summary'),

  // -- Template export --
  uploadTemplate: async (file: File): Promise<TemplateUploadResponse> => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${BASE_URL}/export/template/upload`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) {
      let msg = '';
      try { const body = await res.json(); if (body?.error) msg = `: ${body.error}`; } catch { /* ignore */ }
      throw new Error(`API error ${res.status}${msg}`);
    }
    return res.json();
  },
  getTemplatePlaceholders: () =>
    request<TemplatePlaceholdersResponse>('/export/template/placeholders'),
  deleteTemplate: () =>
    request<{ ok: boolean }>('/export/template', { method: 'DELETE' }),
  fillTemplate: async (studentId?: string): Promise<void> => {
    const body: Record<string, string> = {};
    if (studentId) body.studentId = studentId;
    const res = await fetch(`${BASE_URL}/export/template/fill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let msg = '';
      try { const body = await res.json(); if (body?.error) msg = `: ${body.error}`; } catch { /* ignore */ }
      throw new Error(`API error ${res.status}${msg}`);
    }
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') ?? '';
    const nameMatch = disposition.match(/filename="?(.+?)"?$/);
    const filename = nameMatch?.[1] ?? `filled-${studentId}.docx`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
  getFillPreview: () =>
    request<FillPreviewResponse>('/export/template/fill-preview'),
  getAIStatus: (taskId: string) =>
    request<{ status: string; ok?: boolean; placeholders?: string[]; message?: string; error?: string }>(`/export/template/ai-status/${taskId}`),
  fillTemplateCustom: async (fillData: Record<string, string>): Promise<void> => {
    const res = await fetch(`${BASE_URL}/export/template/fill-custom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fillData }),
    });
    if (!res.ok) {
      let msg = '';
      try { const body = await res.json(); if (body?.error) msg = `: ${body.error}`; } catch { /* ignore */ }
      throw new Error(`API error ${res.status}${msg}`);
    }
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') ?? '';
    const nameMatch = disposition.match(/filename="?(.+?)"?$/);
    const filename = nameMatch?.[1] ?? '综测计算.docx';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
  aiRecognizeTemplate: () =>
    request<{ taskId: string; message: string }>('/export/template/ai-placeholders', { method: 'POST' }),
};
