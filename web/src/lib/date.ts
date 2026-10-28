// 日期一律用 YYYY-MM-DD 字符串，按 UTC 计算天数，避免时区带来的差一天。
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const DAY = 86400000;

const p2 = (n: number) => String(n).padStart(2, '0');

export function todayIso(): string {
  const t = new Date();
  return t.getFullYear() + '-' + p2(t.getMonth() + 1) + '-' + p2(t.getDate());
}

export const toMs = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
export const fromMs = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (s: string, n: number) => fromMs(toMs(s) + n * DAY);
export const diffDays = (a: string, b: string) => Math.round((toMs(b) - toMs(a)) / DAY);

/** 10/28 */
export const md = (s?: string) => (s || '').slice(5).replace('-', '/');
/** 2026/10/28 */
export const slash = (s?: string) => (s || '').replace(/-/g, '/');

/** 本周一和周日 */
export function weekRange(today = todayIso()): [string, string] {
  const dow = (new Date(toMs(today)).getUTCDay() + 6) % 7;
  const mon = addDays(today, -dow);
  return [mon, addDays(mon, 6)];
}

/** ISO 周序号 */
export function weekNumber(s: string): number {
  const d = new Date(toMs(s));
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow + 3);
  const first = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((d.getTime() - first.getTime()) / DAY - 3 + ((first.getUTCDay() + 6) % 7)) / 7);
}

/** 今天 / 昨天 / 10/26 */
export function relDay(s: string | undefined, today = todayIso()): string {
  if (!s) return '—';
  const d = diffDays(s, today);
  if (d === 0) return '今天';
  if (d === 1) return '昨天';
  if (s.slice(0, 4) !== today.slice(0, 4)) return slash(s);
  return md(s);
}

/** 6 天后 / 今天 / 2 天前 */
export function inDays(s: string, today = todayIso()): string {
  const d = diffDays(today, s);
  if (d === 0) return '今天';
  return d > 0 ? d + ' 天后' : -d + ' 天前';
}

/** 周期显示：08/01 – 12/20，跨年时带年份 */
export function period(start: string, end: string, today = todayIso()): string {
  const y = today.slice(0, 4);
  const f = (s: string) => (s.slice(0, 4) === y ? md(s) : slash(s.slice(0, 7)));
  return f(start) + ' – ' + f(end);
}
