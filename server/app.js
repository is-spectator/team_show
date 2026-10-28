// HTTP 接口：路由逻辑在 shared/service.js，这里只负责编辑密码、静态文件和错误格式。
import express from 'express';
import { timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { createService } from '../shared/service.js';

export function createApp(store, { editPassword = '', staticDir = '' } = {}) {
  const app = express();
  const handle = createService(store);
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

  // 设置了 EDIT_PASSWORD 时，浏览不需要密码，所有写操作都要带上 x-edit-password。
  app.use('/api', (req, res, next) => {
    if (req.method === 'GET' || passwordOk(req.get('x-edit-password'))) return next();
    res.status(401).json({ error: '需要编辑密码' });
  });

  app.use('/api', (req, res) => {
    const [status, data] = handle(req.method, req.path, req.body);
    res.status(status).json(req.path === '/bootstrap' ? { ...data, authRequired: !!editPassword } : data);
  });

  if (staticDir && existsSync(staticDir)) {
    app.use(express.static(staticDir, { index: false, maxAge: '1h' }));
    app.get('/{*any}', (req, res) => res.sendFile('index.html', { root: staticDir, maxAge: 0 }));
  }

  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: '请求内容不是合法的 JSON' });
    if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: '服务器出错了' });
  });

  return app;
}
