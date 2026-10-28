/** 本地时区的今天，YYYY-MM-DD */
export function today(): string {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export const ms = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
export const days = (from: string, to: string) => Math.round((ms(to) - ms(from)) / 86400000);
/** 10/28 */
export const md = (s: string) => s.slice(5, 7) + '/' + s.slice(8, 10);
/** 2026.10 */
export const ym = (s: string) => s.slice(0, 4) + '.' + s.slice(5, 7);
/** 2026.10.28 */
export const ymd = (s: string) => s.replace(/-/g, '.');
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const byDate = (a: { date: string }, b: { date: string }) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
