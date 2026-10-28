// SQLite 存储：项目、成员、文档都以 JSON 存一行，结构见 shared/fishbone.schema.json 和 README。
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const COLLECTIONS = ['projects', 'members', 'docs'];

export function openDb(file) {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL');
  for (const c of COLLECTIONS) {
    db.exec(`CREATE TABLE IF NOT EXISTS ${c} (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      sort INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    )`);
  }
  db.exec('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  return new Store(db);
}

class Store {
  constructor(db) {
    this.db = db;
  }

  list(c) {
    check(c);
    return this.db.prepare(`SELECT data FROM ${c} ORDER BY sort, rowid`).all().map((r) => JSON.parse(r.data));
  }

  get(c, id) {
    check(c);
    const row = this.db.prepare(`SELECT data FROM ${c} WHERE id = ?`).get(id);
    return row ? JSON.parse(row.data) : null;
  }

  insert(c, id, data, { front = false } = {}) {
    check(c);
    const edge = this.db.prepare(`SELECT ${front ? 'MIN' : 'MAX'}(sort) AS s FROM ${c}`).get().s ?? 0;
    this.db
      .prepare(`INSERT INTO ${c} (id, data, sort, updated_at) VALUES (?, ?, ?, ?)`)
      .run(id, JSON.stringify(data), front ? edge - 1 : edge + 1, new Date().toISOString());
    return data;
  }

  update(c, id, data) {
    check(c);
    const r = this.db
      .prepare(`UPDATE ${c} SET data = ?, updated_at = ? WHERE id = ?`)
      .run(JSON.stringify(data), new Date().toISOString(), id);
    return r.changes > 0;
  }

  remove(c, id) {
    check(c);
    return this.db.prepare(`DELETE FROM ${c} WHERE id = ?`).run(id).changes > 0;
  }

  count(c) {
    check(c);
    return this.db.prepare(`SELECT COUNT(*) AS n FROM ${c}`).get().n;
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

  transaction(fn) {
    this.db.exec('BEGIN');
    try {
      const r = fn();
      this.db.exec('COMMIT');
      return r;
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }

  close() {
    this.db.close();
  }
}

function check(c) {
  if (!COLLECTIONS.includes(c)) throw new Error('unknown collection ' + c);
}
