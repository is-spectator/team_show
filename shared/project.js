// 项目数据：校验、补齐、导入导出。服务端和浏览器里的预览版共用，格式见 docs/project-template.yaml。
import YAML from 'yaml';

export const STATUSES = ['on_track', 'at_risk', 'delayed', 'done'];
export const FISH = ['蓝鳍鱼', '胡子鲶', '尖嘴鱼', '河豚', '长吻鱼', '青鱼', '灰鲫鱼'];
export const RIDERS = ['自行车', '小轿车', '跑步的人', '滑板车', '滑板'];
// 没写 fish / rider 时按项目序号轮换，相邻的两条鱼不会一样。
const RIDER_OF_FISH = ['自行车', '小轿车', '跑步的人', '滑板车', '滑板', '小轿车', '跑步的人'];

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class ValidationError extends Error {
  status = 400;
}

export const newId = (prefix) => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const text = (v) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');
const isDate = (v) => DATE_RE.test(v) && !Number.isNaN(Date.parse(v + 'T00:00:00Z')) && new Date(v + 'T00:00:00Z').toISOString().startsWith(v);

function list(v) {
  if (Array.isArray(v)) return v.map(text).filter(Boolean);
  if (typeof v === 'string') return v.split(/[,，、]/).map((s) => s.trim()).filter(Boolean);
  return [];
}

// 只放行 http(s) 和 mailto，避免 javascript: 之类的地址被渲染成可点击的链接。
function cleanUrl(raw, where) {
  const u = text(raw);
  if (!u) return '';
  if (/^(https?:\/\/|mailto:)/i.test(u)) return u;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) return 'https://' + u.replace(/^\/+/, '');
  throw new ValidationError(where + '的链接地址需要以 http:// 或 https:// 开头');
}

function cleanLinks(v, where) {
  if (v == null) return [];
  if (!Array.isArray(v)) throw new ValidationError(where + '的 links 需要是列表');
  return v
    .map((l) => (typeof l === 'string' ? { url: l } : l))
    .filter((l) => l && typeof l === 'object' && (text(l.title) || text(l.url)))
    .map((l) => {
      const url = cleanUrl(l.url, where);
      return { title: text(l.title) || url, url };
    });
}

/** 补齐并校验一条进展 / 里程碑；where 用在报错里，比如「第 3 条 items」。 */
export function normalizeItem(raw, where = '这条记录') {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new ValidationError(where + '需要是一个对象');
  const type = raw.type == null || raw.type === '' ? 'update' : raw.type;
  if (type !== 'milestone' && type !== 'update') throw new ValidationError(where + '的 type 只能是 milestone（里程碑）或 update（进展）');
  const date = text(raw.date);
  if (!isDate(date)) throw new ValidationError(where + '的 date 需要是 "YYYY-MM-DD" 格式的日期');
  const body = text(raw.text);
  return {
    id: text(raw.id) || newId('i'),
    type,
    date,
    title: text(raw.title) || body.slice(0, 16) || (type === 'milestone' ? '里程碑' : '进展'),
    author: text(raw.author),
    text: body,
    links: cleanLinks(raw.links, where)
  };
}

/** 补齐并校验整个项目。index 是它在列表里的序号，用来轮换默认的鱼和小人。 */
export function normalizeProject(raw, index = 0) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new ValidationError('内容需要是一个项目（至少包含 name、start、end）');
  const name = text(raw.name);
  if (!name) throw new ValidationError('缺少 name（项目名称）');
  const start = text(raw.start), end = text(raw.end);
  if (!isDate(start) || !isDate(end)) throw new ValidationError('start 和 end 需要是 "YYYY-MM-DD" 格式的日期');
  if (end <= start) throw new ValidationError('end（交付）需要晚于 start（开始）');
  const status = raw.status == null || raw.status === '' ? 'on_track' : raw.status;
  if (!STATUSES.includes(status)) throw new ValidationError('status 只能是 on_track / at_risk / delayed / done');
  const fish = text(raw.fish) || FISH[index % FISH.length];
  if (!FISH.includes(fish)) throw new ValidationError('fish 只能是 ' + FISH.join(' / '));
  const rider = text(raw.rider) || RIDER_OF_FISH[FISH.indexOf(fish)];
  if (!RIDERS.includes(rider)) throw new ValidationError('rider 只能是 ' + RIDERS.join(' / '));
  if (raw.items != null && !Array.isArray(raw.items)) throw new ValidationError('items 需要是列表');
  const items = (raw.items || []).map((it, k) => normalizeItem(it, '第 ' + (k + 1) + ' 条 items '));
  const seen = new Set();
  for (const it of items) {
    if (seen.has(it.id)) it.id = newId('i');
    seen.add(it.id);
  }
  return {
    id: text(raw.id),
    name,
    owner: text(raw.owner),
    members: list(raw.members),
    start,
    end,
    status,
    fish,
    rider,
    goal: text(raw.goal) || '项目目标',
    goal_detail: text(raw.goal_detail),
    items
  };
}

export function parseText(src) {
  if (typeof src !== 'string' || !src.trim()) throw new ValidationError('内容是空的');
  try {
    return src.trim().startsWith('{') ? JSON.parse(src) : YAML.parse(src);
  } catch (e) {
    throw new ValidationError('格式有误：' + String(e.message).split('\n')[0]);
  }
}

const byDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

/** 导出用的数据：去掉内部 id，字段顺序和模板一致，再导入就能得到同一个项目。 */
export function exportObject(p) {
  return {
    name: p.name, owner: p.owner, members: p.members, start: p.start, end: p.end, status: p.status,
    fish: p.fish, rider: p.rider, goal: p.goal, goal_detail: p.goal_detail,
    items: p.items.slice().sort(byDate).map((it) => {
      const o = { type: it.type, date: it.date, title: it.title, author: it.author, text: it.text };
      return it.links.length ? { ...o, links: it.links.map((l) => ({ title: l.title, url: l.url })) } : o;
    })
  };
}

// 普通的中英文短句不加引号，其余（日期、含冒号或 # 的文字、多行文字等）一律用 JSON 风格的双引号，YAML 能直接读。
const PLAIN = /^[\p{L}\p{N}][\p{L}\p{N} ·、，。！？（）()《》“”_./%+~-]*$/u;
const q = (s) => (PLAIN.test(s) && !/^(true|false|null|yes|no|on|off|~|[-+.\d][\d.eE+_-]*)$/i.test(s) && !/\s$/.test(s) ? s : JSON.stringify(s));

export function toYaml(p) {
  const o = exportObject(p);
  const out = [
    '# ' + o.name + ' · 鱼骨图数据（在项目展示页「导入项目」可以直接导入）',
    'name: ' + q(o.name),
    'owner: ' + q(o.owner),
    'members: [' + o.members.map(q).join(', ') + ']',
    'start: ' + JSON.stringify(o.start),
    'end: ' + JSON.stringify(o.end),
    'status: ' + o.status,
    'fish: ' + o.fish,
    'rider: ' + o.rider,
    'goal: ' + q(o.goal),
    'goal_detail: ' + q(o.goal_detail),
    o.items.length ? 'items:' : 'items: []'
  ];
  for (const it of o.items) {
    out.push('  - type: ' + it.type, '    date: ' + JSON.stringify(it.date), '    title: ' + q(it.title), '    author: ' + q(it.author), '    text: ' + q(it.text));
    if (it.links) {
      out.push('    links:');
      for (const l of it.links) out.push('      - title: ' + q(l.title), '        url: ' + q(l.url));
    }
  }
  return out.join('\n') + '\n';
}

export function toJson(p) {
  return JSON.stringify(exportObject(p), null, 2) + '\n';
}
