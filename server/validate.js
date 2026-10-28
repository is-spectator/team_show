// 数据校验：鱼骨图用 shared/fishbone.schema.json，成员和文档用简单规则。
import Ajv2020 from 'ajv/dist/2020.js';
import { readFileSync } from 'node:fs';

const schema = JSON.parse(readFileSync(new URL('../shared/fishbone.schema.json', import.meta.url), 'utf8'));
const ajv = new Ajv2020({ allErrors: false, strict: false });
ajv.addSchema(schema);
const ref = (name) => ajv.compile({ $ref: 'fishbone.schema.json#/$defs/' + name });

const checkDoc = ajv.getSchema('fishbone.schema.json');
const checkProject = ref('project');
const checkMilestone = ref('milestone');
const checkUpdate = ref('update');

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class ValidationError extends Error {
  status = 400;
}

function explain(fn, prefix) {
  const e = fn.errors?.[0];
  if (!e) return prefix + '数据不合法';
  const where = (prefix + e.instancePath.replace(/^\//, '').replace(/\//g, '.')).replace(/\.$/, '') || '数据';
  return where + ' ' + translate(e);
}

function translate(e) {
  switch (e.keyword) {
    case 'required': return '缺少字段 ' + e.params.missingProperty;
    case 'pattern': return '需要是 YYYY-MM-DD 格式的日期';
    case 'enum': return '只能是 ' + e.params.allowedValues.join(' / ');
    case 'const': return '需要等于 ' + JSON.stringify(e.params.allowedValue);
    case 'minLength': return '不能为空';
    case 'type': return '类型应为 ' + e.params.type;
    default: return e.message;
  }
}

function run(fn, data, prefix) {
  if (!fn(data)) throw new ValidationError(explain(fn, prefix));
}

function checkRange(p) {
  if (p.end <= p.start) throw new ValidationError('结束日期（鱼头）需要晚于开始日期（鱼尾）');
}

function uniqueIds(list, label) {
  const seen = new Set();
  for (const x of list) {
    if (seen.has(x.id)) throw new ValidationError(label + ' id 重复：' + x.id);
    seen.add(x.id);
  }
}

export function validateFishbone(doc) {
  run(checkDoc, doc, '');
  checkRange(doc.project);
  uniqueIds(doc.milestones, '里程碑');
  uniqueIds(doc.updates, '进展');
}

export function validateProjectInfo(p) {
  run(checkProject, p, 'project.');
  checkRange(p);
}

export function validateMilestone(m) {
  run(checkMilestone, m, '里程碑.');
}

export function validateUpdate(u) {
  run(checkUpdate, u, '进展.');
}

export function requireText(obj, key, label) {
  if (typeof obj[key] !== 'string' || !obj[key].trim()) throw new ValidationError('请填写' + label);
}
