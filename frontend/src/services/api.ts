import type {
  SubjectConfig,
  AcademicBaseScoreResult, AcademicRulesResponse, SubjectRulesResponse,
  TemplateUploadResponse, TemplatePlaceholdersResponse, FillPreviewResponse,
} from '../types/zongce';

const BASE_URL = '/api';

export function getDownloadFilename(disposition: string, fallback: string): string {
  const encodedMatch = disposition.match(/(?:^|;\s*)filename\*=UTF-8''([^;]+)/i);
  if (encodedMatch?.[1]) {
    try {
      return decodeURIComponent(encodedMatch[1]);
    } catch {
      return encodedMatch[1];
    }
  }

  const quotedMatch = disposition.match(/(?:^|;\s*)filename="([^"]+)"/i);
  if (quotedMatch?.[1]) return quotedMatch[1];

  const plainMatch = disposition.match(/(?:^|;\s*)filename=([^;]+)/i);
  return plainMatch?.[1]?.trim() || fallback;
}

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

  // -- Subjects --
  getSubject: (subjectId: string) => request<SubjectConfig>(`/subjects/${subjectId}`),

  // -- Rules --
  getSubjectRules: (subjectId: string) =>
    request<SubjectRulesResponse>(`/rules/${subjectId}`),
  getAcademicRules: () =>
    request<AcademicRulesResponse>('/rules/academic'),

  // -- Settings --
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
    const filename = getDownloadFilename(disposition, '综测计算.docx');
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
    const filename = getDownloadFilename(disposition, '综测计算.docx');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
