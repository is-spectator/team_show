import type { Bootstrap, Item, Project, ProjectInfo, Settings } from './types';

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

type Transport = (method: string, path: string, body?: unknown) => Promise<unknown>;

const http: Transport = async (method, path, body) => {
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
  return data;
};

let transport = http;
/** 预览版没有服务器，换成在浏览器里处理请求 */
export function setTransport(t: Transport) {
  transport = t;
}

const call = <T>(method: string, path: string, body?: unknown) => transport(method, path, body) as Promise<T>;
const enc = encodeURIComponent;
type ItemInput = Omit<Item, 'id'>;

export const api = {
  bootstrap: () => call<Bootstrap>('GET', '/bootstrap'),
  login: (password: string) => call<{ ok: true }>('POST', '/auth', { password }),
  saveSettings: (s: Settings) => call<Settings>('PUT', '/settings', s),

  importProject: (text: string) => call<Project>('POST', '/projects', { text }),
  patchProject: (id: string, info: Partial<ProjectInfo>) => call<Project>('PATCH', `/projects/${enc(id)}`, info),
  deleteProject: (id: string) => call<{ ok: true }>('DELETE', `/projects/${enc(id)}`),

  addItem: (pid: string, item: ItemInput) => call<{ project: Project; item: Item }>('POST', `/projects/${enc(pid)}/items`, item),
  saveItem: (pid: string, item: Item) => call<{ project: Project; item: Item }>('PUT', `/projects/${enc(pid)}/items/${enc(item.id)}`, item),
  deleteItem: (pid: string, id: string) => call<{ project: Project }>('DELETE', `/projects/${enc(pid)}/items/${enc(id)}`)
};
