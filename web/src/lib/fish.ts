// 鱼和小人的画法。坐标系是卡片上小鱼的 320×56：鱼尾在 x=16，鱼头从 x=286 开始，主干在 y=28。
// 详情页的大鱼复用同一套鱼头鱼尾，放大 3.2 倍。
import type { Project, Status } from '../types';

const HEAD = {
  round: { d: 'M286 15 C303 11 318 19 318 28 C318 37 303 45 286 41 Z', gill: 'M292 19 Q298 28 292 37', eye: [306, 24], mouth: [316, 31] },
  pointy: { d: 'M286 18 C297 15 308 21 319 28 C308 35 297 41 286 38 Z', gill: 'M291 21 Q296 28 291 35', eye: [302, 25], mouth: [314, 30] },
  blunt: { d: 'M286 12 C305 10 316 17 316 28 C316 39 305 46 286 44 Z', gill: 'M293 17 Q300 28 293 39', eye: [305, 22], mouth: [314, 33] },
  snout: { d: 'M286 19 C295 17 302 22 306 25 L319 26 L319 30 L306 31 C302 34 295 39 286 37 Z', gill: 'M291 22 Q295 28 291 34', eye: [299, 25], mouth: [312, 30] },
  puffer: { d: 'M286 13 C306 9 318 18 318 28 C318 38 306 47 286 43 Z', gill: 'M292 18 Q299 28 292 38', eye: [306, 23], mouth: [316, 32] }
};
const TAIL = {
  fork: 'M16 28 L3 14 L9 28 L3 42 Z',
  fan: 'M16 28 C9 20 4 15 1 15 C4 23 4 33 1 41 C4 41 9 36 16 28 Z',
  round: 'M16 28 C11 18 2 18 3 28 C2 38 11 38 16 28 Z',
  moon: 'M16 28 Q7 17 1 12 Q8 28 1 44 Q7 39 16 28 Z',
  flag: 'M16 28 L2 19 Q7 28 2 37 Z'
};
const FIN = {
  sail: 'M290 16 Q295 2 307 13',
  spikes: 'M289 14 L291 8 L295 12 L299 7 L302 12 L306 8 L307 14',
  whisker: 'M314 33 Q320 38 316 44 M311 34 Q314 40 309 45',
  nub: 'M292 15 Q297 8 302 13',
  wave: 'M289 16 Q293 9 297 14 Q301 9 305 14'
};
type Species = { head: keyof typeof HEAD; tail: keyof typeof TAIL; fin: keyof typeof FIN; ink: string; fill: string };
const SPECIES: Record<string, Species> = {
  蓝鳍鱼: { head: 'round', tail: 'fork', fin: 'sail', ink: '#2449D8', fill: '#E8EEFD' },
  胡子鲶: { head: 'blunt', tail: 'fan', fin: 'whisker', ink: '#C4532F', fill: '#FDEBE4' },
  尖嘴鱼: { head: 'pointy', tail: 'moon', fin: 'wave', ink: '#0F8577', fill: '#E0F3EF' },
  河豚: { head: 'puffer', tail: 'round', fin: 'spikes', ink: '#6B4BC8', fill: '#EFEAFB' },
  长吻鱼: { head: 'snout', tail: 'flag', fin: 'nub', ink: '#A86F06', fill: '#FBF0D9' },
  青鱼: { head: 'pointy', tail: 'fork', fin: 'sail', ink: '#3E7D2E', fill: '#E7F2E1' },
  灰鲫鱼: { head: 'round', tail: 'fan', fin: 'wave', ink: '#5B6475', fill: '#EEF0F3' }
};
export const FISH_NAMES = Object.keys(SPECIES);

const O = (cx: number, cy: number, r: number) => `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 `;
// 小人的原点在主干上，向上画。fill 用鱼的颜色，stroke / dot 用深色。
const RIDERS: Record<string, { fill: string; stroke: string; dot: string }> = {
  自行车: { fill: '', stroke: O(-6, -4, 4) + O(7, -4, 4) + 'M-6 -4 L-1 -11 L5 -11 L7 -4 M-1 -11 L1 -4 L-6 -4 M5 -11 L4 -14 L6 -14 M0 -11 L-1 -13 M-1 -13 L1 -17 L5 -13', dot: O(2, -19.5, 2.4) },
  小轿车: { fill: 'M-10 -2 L-10 -7 Q-10 -9 -7 -9 L-4 -9 L-1 -14 L5 -14 L8 -9 L10 -8 Q11 -7 11 -5 L11 -2 Z', stroke: 'M-1 -9 L1 -12.5 L4.5 -12.5 L6.5 -9 Z', dot: O(-5, -2, 2.6) + O(6, -2, 2.6) },
  跑步的人: { fill: '', stroke: 'M1 -15 L-1 -8 M-4 -12 L0 -14 L3 -11 L5 -12 M-1 -8 L3 -5 L2 -1 M-1 -8 L-4 -4 L-7 -5', dot: O(2, -18.5, 2.5) },
  滑板车: { fill: '', stroke: O(-7, -2, 2.5) + O(7, -2, 2.5) + 'M-7 -2 L5 -2 L4 -16 L1 -16 M4 -16 L7 -16 M-2 -3 L-1 -9 L1 -13 M-1 -9 L3 -11', dot: O(0, -16, 2.3) },
  滑板: { fill: 'M-9 -4 Q-9 -2 -7 -2 L7 -2 Q9 -2 9 -4 Z', stroke: 'M-1 -16 L-1 -9 M-5 -14 L-1 -13 L3 -15 M-1 -9 L-4 -4 M-1 -9 L3 -4', dot: O(-0.5, -19, 2.4) + O(-6, 0, 1.4) + O(6, 0, 1.4) },
  // 已交付：举旗冲线
  finish: { fill: 'M8 -22 L16 -19 L8 -16 Z', stroke: 'M0 -15 L0 -7 M0 -13 L-4 -19 M0 -13 L4 -19 M0 -7 L-3 -1 M0 -7 L3 -1 M8 -22 L8 -2', dot: O(0, -18, 2.4) }
};
export const RIDER_NAMES = Object.keys(RIDERS).filter((k) => k !== 'finish');

export const STATUS: Record<Status, { label: string; color: string; dot: string }> = {
  on_track: { label: '按计划推进', color: '#1C7C4A', dot: '#1C7C4A' },
  at_risk: { label: '需要关注', color: '#A65405', dot: '#D07012' },
  delayed: { label: '有延期', color: '#B42F25', dot: '#C1352B' },
  done: { label: '已交付', color: '#555C69', dot: '#9AA1AD' }
};

/** 表情跟着状态变：按计划微笑，需要关注冒汗，有延期皱眉，已交付眯眼笑 */
function face(h: (typeof HEAD)[keyof typeof HEAD], status: Status) {
  const [ex, ey] = h.eye, [mx, my] = h.mouth;
  const smile = `M${mx - 4} ${my - 1} Q${mx - 2} ${my + 2} ${mx} ${my - 1}`;
  if (status === 'done') return { r: 0, pr: 0, d: `M${ex - 3} ${ey} Q${ex} ${ey - 3.5} ${ex + 3} ${ey} ${smile}`, drop: '' };
  if (status === 'delayed') return { r: 3.4, pr: 1.6, d: `M${ex - 4} ${ey - 6} L${ex + 3} ${ey - 4} M${mx - 4} ${my + 1} Q${mx - 2} ${my - 2} ${mx} ${my + 1}`, drop: '' };
  if (status === 'at_risk') return { r: 3.2, pr: 1.5, d: `M${mx - 4} ${my} L${mx} ${my}`, drop: `M${ex + 6} ${ey - 9} Q${ex + 3} ${ey - 4} ${ex + 6} ${ey - 3} Q${ex + 9} ${ey - 4} ${ex + 6} ${ey - 9} Z` };
  return { r: 3, pr: 1.5, d: smile, drop: '' };
}

export type FishLook = ReturnType<typeof fishLook>;

export function fishLook(p: Pick<Project, 'fish' | 'rider' | 'status'>) {
  const sp = SPECIES[p.fish] || SPECIES['蓝鳍鱼'];
  const h = HEAD[sp.head], fc = face(h, p.status);
  const done = p.status === 'done';
  const rider = RIDERS[done ? 'finish' : p.rider] || RIDERS['自行车'];
  return {
    ink: sp.ink, fill: sp.fill, head: h.d, gill: h.gill, tail: TAIL[sp.tail], fin: FIN[sp.fin],
    eyeX: h.eye[0], eyeY: h.eye[1], eyeR: fc.r, pupilR: fc.pr, face: fc.d, drop: fc.drop,
    mouthX: h.mouth[0], bubbles: !done, speed: !done, rider
  };
}
