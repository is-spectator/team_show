import { FishHead, Rider } from './MiniFish';
import { fishLook } from '../lib/fish';
import { byDate, days, md, ms } from '../lib/date';
import type { Item, Project } from '../types';

// 画布 1040×440：鱼尾在 X0，鱼头在 X1，主干在 Y。鱼骨向左斜 32°，上下交替，三种长度轮换避免卡片挤在一起。
const W = 1040, H = 440, X0 = 72, X1 = 932, Y = 230;
const SIN = Math.sin((32 * Math.PI) / 180), COS = Math.cos((32 * Math.PI) / 180);
const LENGTHS = [90, 165, 128];

interface Props {
  p: Project;
  today: string;
  selId: string | null;
  newId: string | null;
  onPick: (it: Item) => void;
  onGoal: () => void;
}

export function BigFish({ p, today, selId, newId, onPick, onGoal }: Props) {
  const look = fishLook(p);
  const total = ms(p.end) - ms(p.start) || 1;
  const pos = (d: string) => Math.round(X0 + Math.max(0, Math.min(1, (ms(d) - ms(p.start)) / total)) * (X1 - X0));
  const items = p.items.slice().sort(byDate);
  const used = { up: 0, down: 0 };

  const bones = items.map((it, k) => {
    const up = k % 2 === 0;
    const h = LENGTHS[used[up ? 'up' : 'down']++ % 3];
    const x = pos(it.date);
    const tx = Math.round(x - h * SIN), ty = Math.round(Y + (up ? -h * COS : h * COS));
    const cx = Math.round(x - h * SIN * 0.25), cy = Math.round(Y + (up ? -h * COS * 0.75 : h * COS * 0.75));
    const isMs = it.type === 'milestone';
    return { it, up, x, tx, ty, d: `M${x} ${Y} Q${cx} ${cy} ${tx} ${ty}`, isMs, future: it.date > today };
  });

  const nowX = p.status === 'done' ? X1 : pos(today);

  // 月份刻度：跨度越长间隔越大
  const ticks: { x: number; label: string }[] = [];
  let y = +p.start.slice(0, 4), m = +p.start.slice(5, 7) + (p.start.slice(8, 10) === '01' ? 0 : 1);
  if (m > 12) { m = 1; y++; }
  const months = days(p.start, p.end) / 30;
  const step = months > 12 ? 3 : months > 7 ? 2 : 1;
  for (let k = 0; k < 120; k++) {
    const ds = `${y}-${String(m).padStart(2, '0')}-01`;
    if (ds > p.end) break;
    if (k % step === 0) ticks.push({ x: pos(ds), label: (m === 1 ? y + '年' : '') + m + ' 月' });
    if (++m > 12) { m = 1; y++; }
  }

  const strokeOf = (b: (typeof bones)[number]) => {
    if (b.it.id === selId) return { stroke: '#2449D8', width: b.isMs ? 3.4 : 3, dash: b.isMs ? undefined : '6 5' };
    if (!b.isMs) return { stroke: look.ink, width: 2.2, dash: '6 5' };
    return b.future ? { stroke: '#C3C9D3', width: 2.6 } : { stroke: '#2C3445', width: 2.8 };
  };

  return (
    <div className="big-scroll">
      <div className="big" style={{ width: W, height: H }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          <g transform={`translate(${X0} ${Y}) scale(3.2) translate(-16 -28)`}>
            <path d={look.tail} fill={look.fill} stroke={look.ink} strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </g>
          <line x1={X0} y1={Y} x2={X1} y2={Y} stroke="#E3E7EF" strokeWidth="6" strokeLinecap="round" />
          <line x1={X0} y1={Y} x2={nowX} y2={Y} stroke={look.ink} strokeWidth="6" strokeLinecap="round" />
          {bones.map((b) => {
            const s = strokeOf(b);
            return (
              <path key={b.it.id} d={b.d} fill="none" stroke={s.stroke} strokeWidth={s.width} strokeDasharray={s.dash} strokeLinecap="round" className={b.it.id === newId ? 'grow-bone' : undefined} />
            );
          })}
          <g transform={`translate(${X1} ${Y}) scale(3.2) translate(-286 -28)`}>
            <FishHead look={look} big />
          </g>
          <line x1={nowX} y1="52" x2={nowX} y2="180" stroke={look.ink} strokeWidth="1" strokeDasharray="3 4" opacity="0.5" />
          <g transform={`translate(${nowX} ${Y - 4}) scale(2.4)`}>
            <Rider look={look} scale={2.4} />
          </g>
        </svg>

        {ticks.map((t) => (
          <span key={t.label + t.x} className="tick" style={{ left: t.x }}>{t.label}</span>
        ))}

        <button type="button" className="goal" onClick={onGoal} style={{ left: X1 - 12 }}>
          <span className="goal-date">{md(p.end)} 交付</span>
          <span className="goal-title">{p.goal || '项目目标'}</span>
        </button>

        {bones.map((b) => {
          const on = b.it.id === selId;
          const cls = ['bone', b.isMs ? (b.future ? 'plan' : 'ms') : 'upd', on ? 'on' : '', b.it.id === newId ? 'isnew' : ''].filter(Boolean).join(' ');
          const kind = b.isMs ? (b.future ? '计划' : '里程碑') : '进展';
          return (
            <span key={b.it.id}>
              <span className="root" style={{ left: b.x, top: Y, background: b.isMs ? (b.future ? '#C3C9D3' : '#2C3445') : look.ink }} aria-hidden="true" />
              <button
                type="button"
                className={cls}
                onClick={() => onPick(b.it)}
                aria-label={(b.isMs ? '里程碑：' : '进展：') + b.it.title + '，' + md(b.it.date)}
                aria-pressed={on}
                style={{
                  left: Math.max(70, Math.min(960, b.tx)),
                  ...(b.up ? { bottom: H - b.ty + 8 } : { top: b.ty + 8 }),
                  ...(b.isMs ? {} : { borderColor: on ? undefined : look.ink })
                }}
              >
                <span className="bone-date" style={b.isMs ? undefined : { color: look.ink }}>
                  {md(b.it.date)} · {kind}{b.it.links.length ? ' · ' + b.it.links.length + ' 链接' : ''}
                </span>
                <span className="bone-title">{b.it.title}</span>
              </button>
            </span>
          );
        })}

        <span className="now-tag" style={{ left: nowX }}>今天 {md(today)}</span>
      </div>
    </div>
  );
}
