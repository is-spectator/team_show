import type { Bootstrap, Doc, Fishbone, Member, Milestone, ProjectInfo, Settings, Update } from './types';

const PW_KEY = 'team-show:edit-password';

export function getPassword(): string {
  try {
    return localStorage.getItem(PW_KEY) || '';
  } catch {
    return '';
  }
}

export function setPassword(pw: string) {
  try {
    if (pw) localStorage.setItem(PW_KEY, pw);
    else localStorage.removeItem(PW_KEY);
  } catch {
    /* 隐私模式下忽略 */
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  const pw = getPassword();
  if (pw) headers['x-edit-password'] = pw;
  let res: Response;
  try {
    res = await fetch('/api' + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, '网络连接失败，请稍后再试');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || '请求失败（' + res.status + '）');
  return data as T;
}

const enc = encodeURIComponent;

export const api = {
  bootstrap: () => call<Bootstrap>('GET', '/bootstrap'),
  login: (password: string) => call<{ ok: true }>('POST', '/auth', { password }),
  saveSettings: (s: Partial<Settings>) => call<Settings>('PUT', '/settings', s),

  createProject: (form: Record<string, unknown>) => call<Fishbone>('POST', '/projects', form),
  importNewProject: (text: string) => call<Fishbone>('POST', '/projects', { text }),
  replaceProject: (id: string, text: string) => call<Fishbone>('PUT', `/projects/${enc(id)}`, { text }),
  patchProject: (id: string, info: Partial<ProjectInfo>) => call<Fishbone>('PATCH', `/projects/${enc(id)}/info`, info),
  deleteProject: (id: string) => call('DELETE', `/projects/${enc(id)}`),
  exportUrl: (id: string, format: 'json' | 'yaml') => `/api/projects/${enc(id)}/export?format=${format}`,

  addMilestone: (pid: string, m: Partial<Milestone>) => call<Milestone>('POST', `/projects/${enc(pid)}/milestones`, m),
  saveMilestone: (pid: string, m: Milestone) => call<Milestone>('PUT', `/projects/${enc(pid)}/milestones/${enc(m.id)}`, m),
  deleteMilestone: (pid: string, id: string) => call('DELETE', `/projects/${enc(pid)}/milestones/${enc(id)}`),

  addUpdate: (pid: string, u: Partial<Update>) => call<Update>('POST', `/projects/${enc(pid)}/updates`, u),
  saveUpdate: (pid: string, u: Update) => call<Update>('PUT', `/projects/${enc(pid)}/updates/${enc(u.id)}`, u),
  deleteUpdate: (pid: string, id: string) => call('DELETE', `/projects/${enc(pid)}/updates/${enc(id)}`),

  saveMember: (m: Partial<Member>) => (m.id ? call<Member>('PUT', `/members/${enc(m.id)}`, m) : call<Member>('POST', '/members', m)),
  deleteMember: (id: string) => call('DELETE', `/members/${enc(id)}`),

  saveDoc: (d: Partial<Doc>) => (d.id ? call<Doc>('PUT', `/docs/${enc(d.id)}`, d) : call<Doc>('POST', '/docs', d)),
  deleteDoc: (id: string) => call('DELETE', `/docs/${enc(id)}`)
};
