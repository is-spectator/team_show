// 预览版：没有服务器时，在浏览器里模拟 /api 接口，数据存在 localStorage。
// 只用于 `npm run build:demo` 生成的单文件预览，正式部署走 server/。
import YAML from 'yaml';
import { seedDocs, seedMembers, seedProjects, seedSettings } from '../../../server/seed.js';
import {
  DATE_RE, ValidationError, arr, newId, normalizeFishbone, normalizeMilestone, normalizeUpdate, parseText, str, today
} from '../../../server/normalize.js';
import type { Doc, Fishbone, Member, Settings } from '../types';

const KEY = 'team-show:demo-data';

interface DB {
  settings: Settings;
  projects: Fishbone[];
  members: Member[];
  docs: Doc[];
}

const fresh = (): DB => JSON.parse(JSON.stringify({ settings: seedSettings, projects: seedProjects, members: seedMembers, docs: seedDocs }));

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* 读不到就用示例数据 */
  }
  return fresh();
}

let db = load();
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* 隐私模式下只保存在内存里 */
  }
}

export function resetDemo() {
  db = fresh();
  save();
}

class NotFound extends Error {
  status = 404;
}

function check(doc: Fishbone) {
  const p = doc.project;
  if (!str(p.name)) throw new ValidationError('请填写项目名称');
  if (!DATE_RE.test(p.start || '') || !DATE_RE.test(p.end || '')) throw new ValidationError('开始 / 结束日期需要是 YYYY-MM-DD 格式');
  if (p.end <= p.start) throw new ValidationError('结束日期（鱼头）需要晚于开始日期（鱼尾）');
  for (const m of doc.milestones) {
    if (!str(m.title)) throw new ValidationError('里程碑缺少名称');
    if (!DATE_RE.test(m.planned_date || '')) throw new ValidationError('里程碑「' + m.title + '」缺少计划日期');
  }
  for (const u of doc.updates) if (!DATE_RE.test(u.date || '')) throw new ValidationError('进展「' + u.title + '」的日期格式不对');
}

const project = (id: string) => {
  const p = db.projects.find((x) => x.project.id === id);
  if (!p) throw new NotFound('项目不存在');
  return p;
};
const putProject = (doc: Fishbone) => {
  check(doc);
  db.projects = db.projects.map((x) => (x.project.id === doc.project.id ? doc : x));
  return doc;
};

type Handler = (m: string[], body: any) => unknown;
const routes: [string, RegExp, Handler][] = [
  ['GET', /^\/bootstrap$/, () => ({ ...db, authRequired: false })],
  ['POST', /^\/auth$/, () => ({ ok: true })],
  ['PUT', /^\/settings$/, (_, b) => (db.settings = { ...db.settings, teamName: str(b.teamName), wikiSource: str(b.wikiSource) })],
  ['POST', /^\/projects$/, (_, b) => {
    const doc = b.text !== undefined
      ? normalizeFishbone(parseText(b.text))
      : normalizeFishbone({
          version: 1,
          project: {
            id: '', name: str(b.name), owner: str(b.owner), members: arr(b.members), line: str(b.line), phase: str(b.phase) || '立项',
            start: b.start, end: b.end, status: 'on_track', goal: { title: str(b.goalTitle) || '项目目标', description: str(b.goal) }
          },
          milestones: [], updates: []
        });
    let id = str(doc.project.id) || newId('p');
    if (db.projects.some((x) => x.project.id === id)) id += '-' + Date.now().toString(36);
    doc.project.id = id;
    check(doc);
    db.projects.unshift(doc);
    return doc;
  }],
  ['PUT', /^\/projects\/([^/]+)$/, ([id], b) => {
    project(id);
    const doc = normalizeFishbone(b.text !== undefined ? parseText(b.text) : b);
    doc.project.id = id;
    return putProject(doc);
  }],
  ['PATCH', /^\/projects\/([^/]+)\/info$/, ([id], b) => {
    const doc = project(id);
    return putProject({ ...doc, project: { ...doc.project, ...b, id } });
  }],
  ['DELETE', /^\/projects\/([^/]+)$/, ([id]) => {
    project(id);
    db.projects = db.projects.filter((x) => x.project.id !== id);
    return { ok: true };
  }]
];

for (const [path, prefix, normalize] of [['milestones', 'm', normalizeMilestone], ['updates', 'u', normalizeUpdate]] as const) {
  const key = path as 'milestones' | 'updates';
  routes.push(
    ['POST', new RegExp(`^/projects/([^/]+)/${path}$`), ([id], b) => {
      const doc = project(id);
      const item = normalize({ ...b, id: newId(prefix) });
      putProject({ ...doc, [key]: [...doc[key], item] });
      return item;
    }],
    ['PUT', new RegExp(`^/projects/([^/]+)/${path}/([^/]+)$`), ([id, itemId], b) => {
      const doc = project(id);
      if (!doc[key].some((x) => x.id === itemId)) throw new NotFound('记录不存在');
      const item = normalize({ ...b, id: itemId });
      putProject({ ...doc, [key]: doc[key].map((x) => (x.id === itemId ? item : x)) });
      return item;
    }],
    ['DELETE', new RegExp(`^/projects/([^/]+)/${path}/([^/]+)$`), ([id, itemId]) => {
      const doc = project(id);
      putProject({ ...doc, [key]: doc[key].filter((x) => x.id !== itemId) });
      return { ok: true };
    }]
  );
}

const cleaners = {
  members: (b: any) => {
    if (!str(b.name)) throw new ValidationError('请填写姓名');
    return { name: str(b.name), role: str(b.role), group: str(b.group), since: str(b.since), city: str(b.city), email: str(b.email), bio: str(b.bio), skills: arr(b.skills).map(str).filter(Boolean) };
  },
  docs: (b: any) => {
    if (!str(b.title)) throw new ValidationError('请填写文档标题');
    return { title: str(b.title), url: str(b.url), category: str(b.category), project: str(b.project), owner: str(b.owner), source: str(b.source), updated: DATE_RE.test(b.updated || '') ? b.updated : today(), pinned: !!b.pinned, note: str(b.note) };
  }
};
for (const c of ['members', 'docs'] as const) {
  const list = () => db[c] as { id: string }[];
  routes.push(
    ['POST', new RegExp(`^/${c}$`), (_, b) => {
      const data = { id: newId(c === 'members' ? 'mb' : 'd'), ...cleaners[c](b) };
      list().push(data);
      return data;
    }],
    ['PUT', new RegExp(`^/${c}/([^/]+)$`), ([id], b) => {
      const old = list().find((x) => x.id === id);
      if (!old) throw new NotFound('记录不存在');
      const data = { ...old, ...cleaners[c](b), id };
      (db as any)[c] = list().map((x) => (x.id === id ? data : x));
      return data;
    }],
    ['DELETE', new RegExp(`^/${c}/([^/]+)$`), ([id]) => {
      (db as any)[c] = list().filter((x) => x.id !== id);
      return { ok: true };
    }]
  );
}

/** 预览版的导出：直接生成 data: 链接 */
export function demoExportUrl(id: string, format: 'json' | 'yaml') {
  const doc = db.projects.find((x) => x.project.id === id);
  const text = format === 'yaml' ? YAML.stringify(doc) : JSON.stringify(doc, null, 2);
  return 'data:' + (format === 'yaml' ? 'text/yaml' : 'application/json') + ';charset=utf-8,' + encodeURIComponent(text);
}

export function installMockApi() {
  const real = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const path = url.replace(/^https?:\/\/[^/]+/, '');
    if (!path.startsWith('/api/')) return real(input, init);
    const method = (init?.method || 'GET').toUpperCase();
    const sub = decodeURI(path.slice(4).split('?')[0]);
    const json = (status: number, data: unknown) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
    for (const [m, re, h] of routes) {
      const hit = m === method && sub.match(re);
      if (!hit) continue;
      try {
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        const out = h(hit.slice(1).map(decodeURIComponent), body);
        if (method !== 'GET') save();
        return json(method === 'POST' ? 201 : 200, out);
      } catch (e) {
        if (method !== 'GET') db = load();
        const status = (e as { status?: number }).status || 500;
        return json(status, { error: status < 500 ? (e as Error).message : '出错了' });
      }
    }
    return json(404, { error: '接口不存在' });
  };
}
