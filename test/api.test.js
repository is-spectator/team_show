import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import YAML from 'yaml';
import { openDb } from '../server/db.js';
import { createApp } from '../server/app.js';
import { realProjects, sampleProjects, seedIfNeeded } from '../shared/seed.js';
import { normalizeProject, parseText, toJson, toYaml } from '../shared/project.js';

let server, base, store;
const call = async (method, path, body, headers = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return { status: res.status, data: await res.json() };
};
const W = { 'x-edit-password': 'pw' };
const template = readFileSync(new URL('../docs/project-template.yaml', import.meta.url), 'utf8');

before(async () => {
  store = openDb(':memory:');
  seedIfNeeded(store);
  server = createApp(store, { editPassword: 'pw' }).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = 'http://127.0.0.1:' + server.address().port;
});
after(() => server.close());

test('bootstrap 返回真实项目和示例项目，每个项目都有鱼和小人', async () => {
  const { status, data } = await call('GET', '/api/bootstrap');
  assert.equal(status, 200);
  assert.equal(data.authRequired, true);
  const real = data.projects.filter((p) => !p.sample), sample = data.projects.filter((p) => p.sample);
  assert.equal(real.length, 8);
  assert.equal(sample.length, 7);
  assert.equal(real[0].name, '用户场景监控');
  assert.deepEqual(real[0].items.filter((it) => it.type === 'milestone').map((it) => it.date), ['2026-10-30', '2026-11-15', '2026-11-30', '2026-12-15', '2026-12-30']);
  assert.equal(sample[0].id, 'cs-platform-2');
  assert.deepEqual(real.map((p) => p.fish).slice(0, 3), ['蓝鳍鱼', '胡子鲶', '尖嘴鱼']);
  assert.ok(data.projects.every((p) => p.rider && p.items.every((it) => it.id)));
});

test('第一版的库升级时补上真实项目，示例项目标成 sample，删掉的不会回来', () => {
  const old = openDb(':memory:');
  for (const p of sampleProjects) old.insert(p.id, { ...p, sample: undefined });
  old.remove('design-spec');
  assert.equal(seedIfNeeded(old), true);
  const list = old.list();
  assert.equal(list.filter((p) => p.sample).length, 6);
  assert.equal(list.filter((p) => !p.sample).length, realProjects.length);
  assert.ok(!old.get('design-spec'));
  old.remove('cs-x-agent');
  assert.equal(seedIfNeeded(old), false);
  assert.ok(!old.get('cs-x-agent'));
});

test('没有密码不能写，浏览不需要密码', async () => {
  assert.equal((await call('POST', '/api/projects', { text: template })).status, 401);
  assert.equal((await call('POST', '/api/auth', { password: 'bad' })).status, 401);
  assert.equal((await call('POST', '/api/auth', { password: 'pw' })).status, 200);
});

test('导入模板文件就创建一个项目，排在最前面', async () => {
  const r = await call('POST', '/api/projects', { text: template }, W);
  assert.equal(r.status, 201);
  assert.equal(r.data.name, '智能客服平台 2.0');
  assert.equal(r.data.fish, '胡子鲶');
  assert.equal(r.data.rider, '自行车');
  assert.equal(r.data.items.length, 5);
  assert.deepEqual(r.data.items.map((it) => it.type), ['milestone', 'update', 'milestone', 'update', 'milestone']);
  assert.equal(r.data.items[2].links.length, 2);
  const list = (await call('GET', '/api/bootstrap')).data.projects;
  assert.equal(list[0].id, r.data.id);

  const json = readFileSync(new URL('../docs/project-template.json', import.meta.url), 'utf8');
  const r2 = await call('POST', '/api/projects', { text: json }, W);
  assert.equal(r2.status, 201);
  assert.notEqual(r2.data.id, r.data.id);
  assert.deepEqual(r2.data.items.map((it) => it.title), r.data.items.map((it) => it.title));
});

test('导入时的错误会说清楚是哪里', async () => {
  const bad = async (text) => (await call('POST', '/api/projects', { text }, W)).data.error;
  assert.match(await bad(''), /空/);
  assert.match(await bad('name: x\nstart: "2026-01-01"'), /start 和 end/);
  assert.match(await bad('name: x\nstart: "2026-05-01"\nend: "2026-01-01"'), /晚于/);
  assert.match(await bad('name: x\nstart: "2026-01-01"\nend: "2026-05-01"\nfish: 鲨鱼'), /fish 只能是/);
  assert.match(await bad('name: x\nstart: "2026-01-01"\nend: "2026-05-01"\nitems:\n  - type: idea\n    date: "2026-02-01"'), /第 1 条 items.*type/);
  assert.match(await bad('name: x\nstart: "2026-01-01"\nend: "2026-05-01"\nitems:\n  - date: "2026-02-30"'), /第 1 条 items.*date/);
  assert.match(await bad('name: x\nstart: "2026-01-01"\nend: "2026-05-01"\nitems:\n  - date: "2026-02-01"\n    links:\n      - url: "javascript:alert(1)"'), /http/);
  assert.match(await bad('name: [unclosed'), /格式有误/);
});

test('新增进展、新增里程碑、改、删都会保存', async () => {
  const pid = 'qa-model';
  const before = (await call('GET', '/api/bootstrap')).data.projects.find((p) => p.id === pid).items.length;

  const a = await call('POST', `/api/projects/${pid}/items`, { type: 'update', date: '2026-10-28', title: '新的进展' }, W);
  assert.equal(a.status, 201);
  assert.equal(a.data.item.type, 'update');
  const b = await call('POST', `/api/projects/${pid}/items`, { type: 'milestone', date: '2026-11-30', title: '上线', links: [{ title: '方案', url: 'example.com/plan' }] }, W);
  assert.equal(b.data.item.links[0].url, 'https://example.com/plan');
  assert.equal(b.data.project.items.length, before + 2);

  const c = await call('PUT', `/api/projects/${pid}/items/${a.data.item.id}`, { type: 'milestone', date: '2026-10-29', title: '改成里程碑', text: '说明' }, W);
  assert.equal(c.status, 200);
  assert.equal(c.data.item.type, 'milestone');
  assert.equal(c.data.item.text, '说明');

  const d = await call('DELETE', `/api/projects/${pid}/items/${b.data.item.id}`, undefined, W);
  assert.equal(d.data.project.items.length, before + 1);
  assert.equal((await call('DELETE', `/api/projects/${pid}/items/${b.data.item.id}`, undefined, W)).status, 404);

  const saved = store.get(pid);
  assert.equal(saved.items.find((it) => it.id === a.data.item.id).title, '改成里程碑');
});

test('修改项目信息、换鱼换小人、删除项目', async () => {
  const r = await call('PATCH', '/api/projects/mobile-kb', { status: 'at_risk', fish: '青鱼', rider: '滑板', goal: '上线', sample: false, items: [] }, W);
  assert.equal(r.data.sample, false);
  assert.equal(r.status, 200);
  assert.equal(r.data.fish, '青鱼');
  assert.equal(r.data.rider, '滑板');
  assert.ok(r.data.items.length > 0, 'PATCH 不会改到 items');
  assert.equal((await call('PATCH', '/api/projects/mobile-kb', { end: '2020-01-01' }, W)).status, 400);
  assert.equal((await call('DELETE', '/api/projects/mobile-kb', undefined, W)).status, 200);
  assert.equal((await call('PATCH', '/api/projects/mobile-kb', { name: 'x' }, W)).status, 404);
});

test('导出的 YAML / JSON 再导入，得到同一个项目', () => {
  for (const p of store.list()) {
    const strip = (x) => ({ ...x, id: '', items: x.items.map((it) => ({ ...it, id: '' })) });
    const sorted = { ...p, items: p.items.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)) };
    assert.deepEqual(strip(normalizeProject(parseText(toYaml(p)))), strip(sorted));
    assert.deepEqual(strip(normalizeProject(parseText(toJson(p)))), strip(sorted));
  }
  assert.ok(toYaml(store.get('qa-model')).includes('sample: true'));
  assert.ok(!toYaml(store.get('scene-monitor')).includes('sample'));
  const tricky = normalizeProject({ name: 'a: b # c', start: '2026-01-01', end: '2026-02-01', goal: 'true', goal_detail: '第一行\n第二行', items: [{ date: '2026-01-10', title: '- 横杠开头', text: '"引号"' }] });
  const back = normalizeProject(YAML.parse(toYaml(tricky)));
  assert.equal(back.name, 'a: b # c');
  assert.equal(back.goal, 'true');
  assert.equal(back.goal_detail, '第一行\n第二行');
  assert.equal(back.items[0].title, '- 横杠开头');
});

test('团队名称可以修改', async () => {
  assert.equal((await call('PUT', '/api/settings', { teamName: '  ' }, W)).status, 400);
  const r = await call('PUT', '/api/settings', { teamName: '智能客服团队' }, W);
  assert.equal(r.data.teamName, '智能客服团队');
  assert.equal((await call('GET', '/api/bootstrap')).data.settings.teamName, '智能客服团队');
});
