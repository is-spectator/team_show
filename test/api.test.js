import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../server/db.js';
import { createApp } from '../server/app.js';
import { seedIfEmpty, seedProjects } from '../server/seed.js';
import { validateFishbone } from '../server/validate.js';

let server, base, store;
const call = async (method, path, body, headers = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
};

before(async () => {
  store = openDb(':memory:');
  seedIfEmpty(store);
  server = createApp(store, { editPassword: 'pw' }).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = 'http://127.0.0.1:' + server.address().port;
});
after(() => server.close());

const W = { 'x-edit-password': 'pw' };

test('bootstrap 返回示例数据，且示例数据都符合 schema', async () => {
  const { status, data } = await call('GET', '/api/bootstrap');
  assert.equal(status, 200);
  assert.equal(data.authRequired, true);
  assert.equal(data.projects.length, 7);
  assert.equal(data.members.length, 8);
  assert.ok(data.docs.length >= 12);
  assert.equal(data.projects[0].project.id, 'cs-platform-2');
  for (const p of seedProjects) validateFishbone(p);
});

test('没有密码不能写', async () => {
  const r = await call('POST', '/api/projects/cs-platform-2/updates', { date: '2026-10-28', title: 'x' });
  assert.equal(r.status, 401);
  assert.equal((await call('POST', '/api/auth', { password: 'bad' })).status, 401);
  assert.equal((await call('POST', '/api/auth', { password: 'pw' })).status, 200);
});

test('写进展、改进展、删进展都会持久化', async () => {
  const add = await call('POST', '/api/projects/cs-platform-2/updates', { date: '2026-10-28', title: '缓存优化', author: '刘洋', content: 'P99 降到 0.8s' }, W);
  assert.equal(add.status, 201);
  assert.equal(add.data.status, 'normal');
  const id = add.data.id;
  let doc = store.get('projects', 'cs-platform-2');
  assert.ok(doc.updates.some((u) => u.id === id));

  const upd = await call('PUT', `/api/projects/cs-platform-2/updates/${id}`, { ...add.data, status: 'risk', risk: '缺人' }, W);
  assert.equal(upd.status, 200);
  doc = store.get('projects', 'cs-platform-2');
  assert.equal(doc.updates.find((u) => u.id === id).status, 'risk');

  assert.equal((await call('DELETE', `/api/projects/cs-platform-2/updates/${id}`, undefined, W)).status, 200);
  assert.ok(!store.get('projects', 'cs-platform-2').updates.some((u) => u.id === id));
});

test('里程碑标记完成时自动补完成日期，改回计划会去掉', async () => {
  const doc = store.get('projects', 'cs-platform-2');
  const m4 = doc.milestones.find((m) => m.id === 'm4');
  const r = await call('PUT', '/api/projects/cs-platform-2/milestones/m4', { ...m4, status: 'done', attachments: [{ title: '', url: 'https://x.com/a' }] }, W);
  assert.equal(r.status, 200);
  assert.match(r.data.done_date, /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(r.data.attachments, [{ title: 'https://x.com/a', url: 'https://x.com/a', type: 'doc' }]);
  const back = await call('PUT', '/api/projects/cs-platform-2/milestones/m4', { ...r.data, status: 'planned' }, W);
  assert.equal(back.data.done_date, undefined);
});

test('非法数据会被拒绝并给出中文原因', async () => {
  const r = await call('POST', '/api/projects/cs-platform-2/updates', { date: '10/28', title: 'x' }, W);
  assert.equal(r.status, 400);
  assert.match(r.data.error, /YYYY-MM-DD/);
  const bad = await call('PATCH', '/api/projects/cs-platform-2/info', { start: '2026-12-01', end: '2026-11-01' }, W);
  assert.equal(bad.status, 400);
  assert.match(bad.data.error, /晚于/);
});

test('YAML 导入新建项目，导出再导入保持一致', async () => {
  const yaml = `version: 1
project:
  id: yaml-demo
  name: YAML 项目
  start: "2026-11-01"
  end: "2027-01-31"
milestones:
  - title: 立项
    planned_date: "2026-11-01"
updates: []
`;
  const c = await call('POST', '/api/projects', { text: yaml }, W);
  assert.equal(c.status, 201);
  assert.equal(c.data.project.id, 'yaml-demo');
  assert.equal(c.data.milestones[0].id, 'm1');
  assert.equal(c.data.milestones[0].status, 'planned');

  const exp = await call('GET', '/api/projects/yaml-demo/export?format=yaml');
  assert.equal(exp.status, 200);
  const re = await call('PUT', '/api/projects/yaml-demo', { text: exp.data }, W);
  assert.equal(re.status, 200);
  assert.deepEqual(re.data, store.get('projects', 'yaml-demo'));
});

test('表单新建项目，成员和文档的增改删', async () => {
  const p = await call('POST', '/api/projects', { name: '新项目', owner: '陈思', line: '客服', start: '2026-11-01', end: '2026-12-31', goal: '一句话目标' }, W);
  assert.equal(p.status, 201);
  assert.equal(store.list('projects')[0].project.id, p.data.project.id, '新项目排在最前');

  const m = await call('POST', '/api/members', { name: '新人', group: '研发', skills: ['Go', ''] }, W);
  assert.deepEqual(m.data.skills, ['Go']);
  assert.equal((await call('PUT', `/api/members/${m.data.id}`, { ...m.data, city: '上海' }, W)).data.city, '上海');
  assert.equal((await call('DELETE', `/api/members/${m.data.id}`, undefined, W)).status, 200);

  const d = await call('POST', '/api/docs', { title: '新文档', url: 'https://x.com' }, W);
  assert.match(d.data.updated, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal((await call('POST', '/api/docs', { title: ' ' }, W)).status, 400);
});
