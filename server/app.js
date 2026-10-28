// HTTP 接口。所有数据一次性通过 /api/bootstrap 下发，写操作按实体粒度提交，避免多人同时编辑时整份覆盖。
import express from 'express';
import { timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import YAML from 'yaml';
import { seedSettings } from './seed.js';
import {
  DATE_RE, ValidationError, requireText,
  validateFishbone, validateProjectInfo, validateMilestone, validateUpdate
} from './validate.js';

const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const newId = (prefix) => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const str = (v) => (typeof v === 'string' ? v.trim() : '');
const arr = (v) => (Array.isArray(v) ? v : []);

class NotFound extends Error {
  status = 404;
}

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

function normalizeMilestone(m) {
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

function normalizeUpdate(u) {
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

export function createApp(store, { editPassword = '', staticDir = '' } = {}) {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  const passwordOk = (given) => {
    if (!editPassword) return true;
    const a = Buffer.from(String(given || ''));
    const b = Buffer.from(editPassword);
    return a.length === b.length && timingSafeEqual(a, b);
  };

  app.post('/api/auth', (req, res) => {
    if (!passwordOk(req.body?.password)) return res.status(401).json({ error: '密码不对' });
    res.json({ ok: true });
  });

  // 设置了 EDIT_PASSWORD 时，所有写操作都要带上 x-edit-password。
  app.use('/api', (req, res, next) => {
    if (req.method === 'GET' || passwordOk(req.get('x-edit-password'))) return next();
    res.status(401).json({ error: '需要编辑密码' });
  });

  app.get('/api/bootstrap', (req, res) => {
    res.json({
      settings: { ...seedSettings, ...store.getSettings() },
      authRequired: !!editPassword,
      projects: store.list('projects'),
      members: store.list('members'),
      docs: store.list('docs')
    });
  });

  app.put('/api/settings', (req, res) => {
    const s = {};
    for (const k of Object.keys(seedSettings)) if (typeof req.body?.[k] === 'string') s[k] = req.body[k].trim();
    store.setSettings(s);
    res.json({ ...seedSettings, ...store.getSettings() });
  });

  // ---------- 项目 ----------
  const loadProject = (id) => {
    const p = store.get('projects', id);
    if (!p) throw new NotFound('项目不存在');
    return p;
  };
  const saveProject = (doc) => {
    validateFishbone(doc);
    store.update('projects', doc.project.id, doc);
    return doc;
  };

  app.post('/api/projects', (req, res) => {
    const b = req.body || {};
    let doc;
    if (b.text !== undefined) {
      doc = normalizeFishbone(parseText(b.text));
    } else {
      requireText(b, 'name', '项目名称');
      doc = normalizeFishbone({
        version: 1,
        project: {
          id: '', name: str(b.name), owner: str(b.owner), members: arr(b.members),
          line: str(b.line), phase: str(b.phase) || '立项',
          start: b.start, end: b.end, status: 'on_track',
          goal: { title: str(b.goalTitle) || '项目目标', description: str(b.goal) }
        },
        milestones: [],
        updates: []
      });
    }
    let id = str(doc.project.id) || newId('p');
    if (store.get('projects', id)) id = id + '-' + Date.now().toString(36);
    doc.project.id = id;
    validateFishbone(doc);
    store.insert('projects', id, doc, { front: true });
    res.status(201).json(doc);
  });

  app.put('/api/projects/:id', (req, res) => {
    loadProject(req.params.id);
    const doc = normalizeFishbone(req.body?.text !== undefined ? parseText(req.body.text) : req.body);
    doc.project.id = req.params.id;
    res.json(saveProject(doc));
  });

  app.patch('/api/projects/:id/info', (req, res) => {
    const doc = loadProject(req.params.id);
    const { id, ...patch } = req.body || {};
    const info = { ...doc.project, ...patch, id: doc.project.id };
    validateProjectInfo(info);
    res.json(saveProject({ ...doc, project: info }));
  });

  app.delete('/api/projects/:id', (req, res) => {
    if (!store.remove('projects', req.params.id)) throw new NotFound('项目不存在');
    res.json({ ok: true });
  });

  app.get('/api/projects/:id/export', (req, res) => {
    const doc = loadProject(req.params.id);
    const yaml = req.query.format === 'yaml';
    const name = encodeURIComponent(doc.project.id) + (yaml ? '.yaml' : '.json');
    res.set('Content-Disposition', `attachment; filename="${name}"`);
    res.type(yaml ? 'text/yaml' : 'application/json');
    res.send(yaml ? YAML.stringify(doc) : JSON.stringify(doc, null, 2));
  });

  // 里程碑 / 进展的增删改共用一套逻辑。
  const items = [
    { path: 'milestones', prefix: 'm', normalize: normalizeMilestone, validate: validateMilestone },
    { path: 'updates', prefix: 'u', normalize: normalizeUpdate, validate: validateUpdate }
  ];
  for (const it of items) {
    app.post(`/api/projects/:id/${it.path}`, (req, res) => {
      const doc = loadProject(req.params.id);
      const item = it.normalize({ ...req.body, id: newId(it.prefix) });
      it.validate(item);
      saveProject({ ...doc, [it.path]: [...doc[it.path], item] });
      res.status(201).json(item);
    });
    app.put(`/api/projects/:id/${it.path}/:itemId`, (req, res) => {
      const doc = loadProject(req.params.id);
      if (!doc[it.path].some((x) => x.id === req.params.itemId)) throw new NotFound('记录不存在');
      const item = it.normalize({ ...req.body, id: req.params.itemId });
      it.validate(item);
      saveProject({ ...doc, [it.path]: doc[it.path].map((x) => (x.id === item.id ? item : x)) });
      res.json(item);
    });
    app.delete(`/api/projects/:id/${it.path}/:itemId`, (req, res) => {
      const doc = loadProject(req.params.id);
      const rest = doc[it.path].filter((x) => x.id !== req.params.itemId);
      if (rest.length === doc[it.path].length) throw new NotFound('记录不存在');
      saveProject({ ...doc, [it.path]: rest });
      res.json({ ok: true });
    });
  }

  // ---------- 成员 / 文档 ----------
  const simple = {
    members: {
      prefix: 'mb',
      clean: (b) => {
        requireText(b, 'name', '姓名');
        return {
          name: str(b.name), role: str(b.role), group: str(b.group), since: str(b.since), city: str(b.city),
          email: str(b.email), bio: str(b.bio), skills: arr(b.skills).map(str).filter(Boolean)
        };
      }
    },
    docs: {
      prefix: 'd',
      clean: (b) => {
        requireText(b, 'title', '文档标题');
        const updated = DATE_RE.test(b.updated || '') ? b.updated : today();
        return {
          title: str(b.title), url: str(b.url), category: str(b.category), project: str(b.project),
          owner: str(b.owner), source: str(b.source), updated, pinned: !!b.pinned, note: str(b.note)
        };
      }
    }
  };
  for (const [c, def] of Object.entries(simple)) {
    app.post(`/api/${c}`, (req, res) => {
      const data = { id: newId(def.prefix), ...def.clean(req.body || {}) };
      store.insert(c, data.id, data);
      res.status(201).json(data);
    });
    app.put(`/api/${c}/:id`, (req, res) => {
      const old = store.get(c, req.params.id);
      if (!old) throw new NotFound('记录不存在');
      const data = { ...old, ...def.clean(req.body || {}), id: old.id };
      store.update(c, data.id, data);
      res.json(data);
    });
    app.delete(`/api/${c}/:id`, (req, res) => {
      if (!store.remove(c, req.params.id)) throw new NotFound('记录不存在');
      res.json({ ok: true });
    });
  }

  app.use('/api', (req, res) => res.status(404).json({ error: '接口不存在' }));

  if (staticDir && existsSync(staticDir)) {
    app.use(express.static(staticDir, { index: false, maxAge: '1h' }));
    app.get('/{*any}', (req, res) => res.sendFile('index.html', { root: staticDir, maxAge: 0 }));
  }

  app.use((err, req, res, next) => {
    if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: '服务器出错了' });
  });

  return app;
}
