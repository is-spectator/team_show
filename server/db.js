// SQLite 存储：每个项目以 JSON 存一行，结构见 docs/project-template.yaml。
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function openDb(file) {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL');
  // 表名带 v2：第一版的数据结构不同，放在单独的表里互不影响。
  db.exec(`CREATE TABLE IF NOT EXISTS projects_v2 (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    sort INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  )`);
  db.exec('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  return new Store(db);
}

class Store {
  constructor(db) {
    this.db = db;
  }

  list() {
    return this.db.prepare('SELECT data FROM projects_v2 ORDER BY sort, rowid').all().map((r) => JSON.parse(r.data));
  }

  get(id) {
    const row = this.db.prepare('SELECT data FROM projects_v2 WHERE id = ?').get(id);
    return row ? JSON.parse(row.data) : null;
  }

  insert(id, data, { front = false } = {}) {
    const edge = this.db.prepare(`SELECT ${front ? 'MIN' : 'MAX'}(sort) AS s FROM projects_v2`).get().s ?? 0;
    this.db
      .prepare('INSERT INTO projects_v2 (id, data, sort, updated_at) VALUES (?, ?, ?, ?)')
      .run(id, JSON.stringify(data), front ? edge - 1 : edge + 1, new Date().toISOString());
    return data;
  }

  update(id, data) {
    const r = this.db
      .prepare('UPDATE projects_v2 SET data = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(data), new Date().toISOString(), id);
    return r.changes > 0;
  }

  remove(id) {
    return this.db.prepare('DELETE FROM projects_v2 WHERE id = ?').run(id).changes > 0;
  }

  count() {
    return this.db.prepare('SELECT COUNT(*) AS n FROM projects_v2').get().n;
  }

  getSettings() {
    const out = {};
    for (const r of this.db.prepare('SELECT key, value FROM settings').all()) out[r.key] = JSON.parse(r.value);
    return out;
  }

  setSettings(obj) {
    const st = this.db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
    for (const [k, v] of Object.entries(obj)) st.run(k, JSON.stringify(v));
  }

  close() {
    this.db.close();
  }
}
