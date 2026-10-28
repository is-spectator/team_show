// 接口逻辑：服务端（SQLite）和预览版（localStorage）共用同一套路由，只是存储不同。
// store 需要提供 list / get / insert / update / remove / getSettings / setSettings。
import { ValidationError, normalizeItem, normalizeProject, parseText, newId } from './project.js';

export const DEFAULT_SETTINGS = { teamName: '项目展示' };

export class NotFound extends Error {
  status = 404;
}

const ITEM_FIELDS = ['type', 'date', 'title', 'author', 'text', 'links'];
const PROJECT_FIELDS = ['name', 'owner', 'members', 'start', 'end', 'status', 'fish', 'rider', 'goal', 'goal_detail'];
const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj && obj[k] !== undefined).map((k) => [k, obj[k]]));

export function createService(store) {
  const load = (id) => {
    const p = store.get(id);
    if (!p) throw new NotFound('项目不存在');
    return p;
  };
  const save = (p) => {
    store.update(p.id, p);
    return p;
  };
  const withItems = (p, items) => save(normalizeProject({ ...p, items }));

  const routes = [
    ['GET', /^\/bootstrap$/, () => ({ settings: { ...DEFAULT_SETTINGS, ...store.getSettings() }, projects: store.list() })],

    ['PUT', /^\/settings$/, (b) => {
      const teamName = typeof b.teamName === 'string' ? b.teamName.trim() : '';
      if (!teamName) throw new ValidationError('请填写团队名称');
      store.setSettings({ teamName });
      return { ...DEFAULT_SETTINGS, ...store.getSettings() };
    }],

    // 导入：{ text } 是粘贴的 YAML / JSON，{ project } 是已经解析好的对象。
    ['POST', /^\/projects$/, (b) => {
      const raw = b.text !== undefined ? parseText(b.text) : b.project;
      const p = normalizeProject({ ...raw, id: undefined }, store.list().length);
      p.id = newId('p');
      p.items = p.items.map((it) => ({ ...it, id: newId('i') }));
      store.insert(p.id, p, { front: true });
      return [201, p];
    }],

    ['PATCH', /^\/projects\/([^/]+)$/, (b, id) => {
      const p = load(id);
      return save(normalizeProject({ ...p, ...pick(b, PROJECT_FIELDS), id: p.id, items: p.items }));
    }],

    ['DELETE', /^\/projects\/([^/]+)$/, (b, id) => {
      if (!store.remove(id)) throw new NotFound('项目不存在');
      return { ok: true };
    }],

    ['POST', /^\/projects\/([^/]+)\/items$/, (b, id) => {
      const p = load(id);
      const item = normalizeItem({ ...pick(b, ITEM_FIELDS), id: newId('i') });
      return [201, { project: withItems(p, [...p.items, item]), item }];
    }],

    ['PUT', /^\/projects\/([^/]+)\/items\/([^/]+)$/, (b, id, itemId) => {
      const p = load(id);
      if (!p.items.some((x) => x.id === itemId)) throw new NotFound('这条记录已经被删除了');
      const item = normalizeItem({ ...pick(b, ITEM_FIELDS), id: itemId });
      return { project: withItems(p, p.items.map((x) => (x.id === itemId ? item : x))), item };
    }],

    ['DELETE', /^\/projects\/([^/]+)\/items\/([^/]+)$/, (b, id, itemId) => {
      const p = load(id);
      const rest = p.items.filter((x) => x.id !== itemId);
      if (rest.length === p.items.length) throw new NotFound('这条记录已经被删除了');
      return { project: withItems(p, rest) };
    }]
  ];

  /** 返回 [状态码, 数据]；校验失败和找不到时抛出带 status 的错误。 */
  return function handle(method, path, body) {
    for (const [m, re, fn] of routes) {
      const hit = method === m && path.match(re);
      if (!hit) continue;
      const out = fn(body && typeof body === 'object' ? body : {}, ...hit.slice(1).map(decodeURIComponent));
      return Array.isArray(out) ? out : [200, out];
    }
    throw new NotFound('接口不存在');
  };
}
