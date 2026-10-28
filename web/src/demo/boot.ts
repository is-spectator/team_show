// 预览版：没有服务器，在浏览器里跑和服务端同一套接口逻辑，数据存在 localStorage。
// 只用于 `npm run build:demo` 生成的单文件预览，正式部署走 server/。
import { setTransport, ApiError } from '../api';
import { createService } from '../../../shared/service.js';
import { seedProjects } from '../../../shared/seed.js';
import type { Project, Settings } from '../types';

const KEY = 'team-show:demo-v2';
type DB = { projects: Project[]; settings: Partial<Settings> };

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* 读不到就用示例数据 */
  }
  return { projects: JSON.parse(JSON.stringify(seedProjects)), settings: {} };
}

const db = load();
const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* 隐私模式下只保存在内存里 */
  }
};

const handle = createService({
  list: () => db.projects,
  get: (id: string) => db.projects.find((p) => p.id === id) || null,
  insert: (_id: string, data: Project, { front = false } = {}) => {
    if (front) db.projects.unshift(data);
    else db.projects.push(data);
    save();
    return data;
  },
  update: (id: string, data: Project) => {
    db.projects = db.projects.map((p) => (p.id === id ? data : p));
    save();
    return true;
  },
  remove: (id: string) => {
    const n = db.projects.length;
    db.projects = db.projects.filter((p) => p.id !== id);
    save();
    return db.projects.length < n;
  },
  getSettings: () => db.settings,
  setSettings: (s: Partial<Settings>) => {
    db.settings = { ...db.settings, ...s };
    save();
  }
});

setTransport(async (method, path, body) => {
  if (path === '/auth') return { ok: true };
  try {
    const [, data] = handle(method, path, JSON.parse(JSON.stringify(body ?? {})));
    const out = JSON.parse(JSON.stringify(data));
    return path === '/bootstrap' ? { ...out, authRequired: false } : out;
  } catch (e) {
    const err = e as Error & { status?: number };
    throw new ApiError(err.status || 500, err.message);
  }
});
