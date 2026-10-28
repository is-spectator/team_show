import { fileURLToPath } from 'node:url';
import { openDb } from './db.js';
import { createApp } from './app.js';
import { seedIfEmpty } from '../shared/seed.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const dbFile = process.env.DB_FILE || root + 'data/team.db';
const port = Number(process.env.PORT || 3000);

const store = openDb(dbFile);
if (process.env.SEED !== 'false' && seedIfEmpty(store)) console.log('已写入示例数据');

const app = createApp(store, {
  editPassword: process.env.EDIT_PASSWORD || '',
  staticDir: root + 'dist'
});
app.listen(port, () => {
  console.log(`项目展示已启动：http://localhost:${port}  数据库：${dbFile}`);
});
