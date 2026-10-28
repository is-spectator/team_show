// 纯数据处理：补齐鱼骨图字段、解析 JSON/YAML。服务端和浏览器里的预览版共用。
import YAML from 'yaml';

export class ValidationError extends Error {
  status = 400;
}

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
export const newId = (prefix) => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
export const str = (v) => (typeof v === 'string' ? v.trim() : '');
export const arr = (v) => (Array.isArray(v) ? v : []);

// 和原型的 normalize 一致：补齐 id、状态、附件等可省略的字段。
export function normalizeFishbone(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) throw new ValidationError('数据需要是一个对象');
  if (!d.project || typeof d.project !== 'object') throw new ValidationError('缺少 project');
  return {
    ...d,
    version: d.version ?? 1,
    project: { members: [], status: 'on_track', goal: { title: '项目目标' }, ...d.project },
    milestones: arr(d.milestones).map((m, i) => normalizeMilestone({ ...m, id: m?.id || 'm' + (i + 1) })),
    updates: arr(d.updates).map((u, i) => normalizeUpdate({ ...u, id: u?.id || 'u' + (i + 1) }))
  };
}

export function normalizeMilestone(m) {
  const out = {
    side: 'auto',
    ...m,
    planned_date: m.planned_date || m.done_date,
    status: m.status || (m.done_date ? 'done' : 'planned'),
    attachments: cleanAttachments(m.attachments)
  };
  if (out.status === 'done') out.done_date = out.done_date || today();
  else delete out.done_date;
  return out;
}

export function normalizeUpdate(u) {
  return {
    ...u,
    title: u.title || str(u.content).slice(0, 16) || '进展',
    status: u.status || 'normal',
    attachments: cleanAttachments(u.attachments)
  };
}

function cleanAttachments(list) {
  return arr(list)
    .filter((a) => a && (str(a.title) || str(a.url)))
    .map((a) => ({ ...a, title: str(a.title) || str(a.url), url: str(a.url), type: a.type || 'doc' }));
}

export function parseText(text) {
  if (typeof text !== 'string' || !text.trim()) throw new ValidationError('内容为空');
  try {
    return text.trim().startsWith('{') ? JSON.parse(text) : YAML.parse(text);
  } catch (e) {
    throw new ValidationError('格式有误：' + e.message.split('\n')[0]);
  }
}
