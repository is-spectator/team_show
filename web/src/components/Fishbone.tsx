// 鱼骨图：鱼尾 = 项目开始，鱼头 = 项目结束 + 目标；主干上的亮点是进展，长出去的骨头是里程碑。
// 「当前日期」可以由外部传入（拖动模拟时间），已完成部分的主干会变成蓝色渐变。
import type { Fishbone as FB, Milestone, Update } from '../types';
import { DATE_RE, diffDays, md, todayIso, addDays } from '../lib/date';
import { UPDATE_STATUS } from '../lib/derive';
import { Icon } from './ui';

const W = 1040, H = 440, X0 = 72, X1 = 932, Y = 230;
const SIN = Math.sin((32 * Math.PI) / 180), COS = Math.cos((32 * Math.PI) / 180);

type VisualState = 'done' | 'in_progress' | 'planned' | 'delayed';
const BONE: Record<VisualState, { stroke: string; sw: number; dash?: string; hollow: boolean; root?: string; cls: string }> = {
  done: { stroke: '#3B4A66', sw: 3, hollow: false, cls: 'done' },
  in_progress: { stroke: '#2B5CE6', sw: 2.5, dash: '6 5', hollow: true, root: '#2B5CE6', cls: 'prog' },
  planned: { stroke: '#B4BCCB', sw: 2, dash: '5 5', hollow: true, root: '#C9CDD4', cls: 'plan' },
  delayed: { stroke: '#D92D20', sw: 2.5, dash: '6 5', hollow: true, root: '#D92D20', cls: 'late' }
};

export interface Selection {
  kind: 'milestone' | 'update' | 'project';
  id: string | null;
}

export function fishboneGeometry(doc: FB, simIso: string) {
  const P = doc.project;
  const total = Math.max(1, diffDays(P.start, P.end));
  const clamp = (d: number) => Math.max(0, Math.min(total, d));
  const pos = (s: string) => Math.round(X0 + (clamp(diffDays(P.start, s)) / total) * (X1 - X0));
  const simDay = clamp(diffDays(P.start, simIso));
  const simC = addDays(P.start, simDay);
  return { total, pos, simDay, simC };
}

/** 里程碑在某个日期下应该怎么画：完成日期还没到时按「进行中」画 */
export function milestoneVisual(m: Milestone, simC: string): { vs: VisualState; date: string } {
  const dd = m.done_date || m.planned_date;
  const done = m.status === 'done' && dd <= simC;
  const vs: VisualState = done ? 'done' : m.status === 'done' ? 'in_progress' : BONE[m.status as VisualState] ? (m.status as VisualState) : 'planned';
  return { vs, date: done ? dd : m.planned_date || dd };
}

export function FishboneChart({
  doc, simIso, selected, newId, onMilestone, onUpdate, onGoal
}: {
  doc: FB;
  simIso: string;
  selected: Selection | null;
  newId?: string | null;
  onMilestone: (m: Milestone) => void;
  onUpdate: (u: Update) => void;
  onGoal: () => void;
}) {
  const P = doc.project;
  const { pos, simDay, simC } = fishboneGeometry(doc, simIso);
  const nx = pos(simC);
  const isSel = (kind: Selection['kind'], id: string) => selected?.kind === kind && selected.id === id;

  // ---------- 骨头 ----------
  const vis = doc.milestones
    .map((m) => ({ m, ...milestoneVisual(m, simC) }))
    .filter((v) => DATE_RE.test(v.date || ''))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const cnt = { up: 0, down: 0 };
  const bones = vis.map((v, i) => {
    const st = BONE[v.vs];
    const side: 'up' | 'down' = v.m.side === 'up' || v.m.side === 'down' ? v.m.side : i % 2 === 0 ? 'up' : 'down';
    const up = side === 'up';
    const h = [96, 150][cnt[side]++ % 2];
    const x = pos(v.date);
    const tx = Math.round(x - h * SIN), ty = Math.round(Y + (up ? -h * COS : h * COS));
    const cx = Math.round(x - h * SIN * 0.25), cy = Math.round(Y + (up ? -h * COS * 0.75 : h * COS * 0.75));
    const sel = isSel('milestone', v.m.id);
    const stroke = sel ? '#2B5CE6' : st.stroke;
    const dateText =
      v.vs === 'done' ? md(v.date) + ' 完成'
      : v.vs === 'in_progress' ? md(v.date) + ' · 进行中'
      : v.vs === 'delayed' ? md(v.date) + ' · 延期'
      : md(v.date) + ' · 计划';
    return { ...v, st, up, x, tx, ty, cx, cy, sel, stroke, dateText, lx: Math.max(72, Math.min(968, tx)) };
  });

  // ---------- 亮点 ----------
  const sparks = doc.updates
    .filter((u) => DATE_RE.test(u.date || '') && u.date <= simC)
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  // ---------- 月份刻度 ----------
  const ticks: { label: string; x: number }[] = [];
  let ty0 = +P.start.slice(0, 4), tm = +P.start.slice(5, 7);
  if (+P.start.slice(8, 10) !== 1) {
    tm++;
    if (tm > 12) { tm = 1; ty0++; }
  }
  const total = diffDays(P.start, P.end);
  const step = total > 400 ? 3 : total > 200 ? 2 : 1;
  for (let k = 0; k < 120; k++) {
    const s = ty0 + '-' + String(tm).padStart(2, '0') + '-01';
    if (s > P.end) break;
    if (k % step === 0) ticks.push({ label: (tm === 1 ? ty0 + ' 年 ' : '') + tm + ' 月', x: pos(s) });
    tm++;
    if (tm > 12) { tm = 1; ty0++; }
  }

  const isToday = simC === todayIso();

  return (
    <div className="fb" style={{ width: W, height: H }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', left: 0, top: 0 }} aria-hidden="true">
        <defs>
          <linearGradient id="fbDone" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor="#7FA6FF" /><stop offset="1" stopColor="#2B5CE6" /></linearGradient>
          <linearGradient id="fbBody" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#F1F5FF" /><stop offset="1" stopColor="#D3DFFF" /></linearGradient>
        </defs>
        {/* 鱼尾 */}
        <path d={`M${X0} ${Y} L14 186 Q34 ${Y} 14 274 Z`} fill="url(#fbBody)" stroke="#2B5CE6" strokeWidth="1.5" strokeLinejoin="round" />
        {/* 主干 */}
        <line x1={X0} y1={Y} x2={X1} y2={Y} stroke="#DDE2EC" strokeWidth="7" strokeLinecap="round" />
        <line x1={X0} y1={Y} x2={nx} y2={Y} stroke="url(#fbDone)" strokeWidth="7" strokeLinecap="round" />
        {/* 鱼头 */}
        <g transform={`translate(930 ${Y})`}>
          <path d="M0 -46 C26 -70 70 -62 96 -30 C106 -18 110 -8 110 0 C110 8 106 18 96 30 C70 62 26 70 0 46 Z" fill="url(#fbBody)" stroke="#2B5CE6" strokeWidth="1.5" />
          <path d="M16 -30 Q32 0 16 30" fill="none" stroke="#2B5CE6" strokeWidth="1.2" opacity="0.5" />
          <circle cx="78" cy="-14" r="6" fill="#FFFFFF" stroke="#2B5CE6" strokeWidth="1.5" />
          <circle cx="80" cy="-14" r="2.5" fill="#1D2129" />
        </g>
        <line x1={nx} y1="44" x2={nx} y2={Y} stroke="#2B5CE6" strokeWidth="1" strokeDasharray="3 4" opacity="0.6" />
        {bones.map((b) => (
          <g key={b.m.id} className={b.m.id === newId ? 'fadein' : undefined}>
            <path d={`M${b.x} ${Y} Q${b.cx} ${b.cy} ${b.tx} ${b.ty}`} fill="none" stroke={b.stroke} strokeWidth={b.st.sw} strokeDasharray={b.st.dash} strokeLinecap="round" />
            <circle cx={b.x} cy={Y} r="4.5" fill={b.st.root || b.stroke} stroke="#FFFFFF" strokeWidth="2" />
            <circle cx={b.tx} cy={b.ty} r="4" fill={b.st.hollow ? '#FFFFFF' : b.stroke} stroke={b.stroke} strokeWidth="2" />
          </g>
        ))}
      </svg>

      {ticks.map((t) => (
        <span key={t.label + t.x}>
          <span className="mtk" style={{ left: t.x }} />
          <span className="mon" style={{ left: t.x }}>{t.label}</span>
        </span>
      ))}

      <button type="button" className="goal" onClick={onGoal} aria-label="编辑项目目标">
        <span style={{ display: 'block', fontSize: 11, color: '#6B7280' }}>目标 · {md(P.end)}</span>
        <span style={{ display: 'block', fontWeight: 700, marginTop: 1 }}>{P.goal?.title || '项目目标'}</span>
      </button>

      {bones.map((b) => {
        const atts = b.m.attachments || [];
        return (
          <button
            key={b.m.id}
            type="button"
            className={'lab ' + b.st.cls + (b.sel ? ' sel' : '') + (b.m.id === newId ? ' rise' : '')}
            style={{ left: b.lx, ...(b.up ? { bottom: H - b.ty + 10 } : { top: b.ty + 10 }) }}
            onClick={() => onMilestone(b.m)}
            aria-label={'里程碑：' + b.m.title + '，' + b.dateText + '，点击查看和编辑'}
          >
            <span className="lab-d">{b.dateText}</span>
            <span className="lab-t">{b.m.title}</span>
            {atts.length > 0 && (
              <span className="lab-a"><Icon name="clip" size={11} />{atts.length} 个附件</span>
            )}
          </button>
        );
      })}

      {sparks.map((u) => {
        const c = (UPDATE_STATUS[u.status || 'normal'] || UPDATE_STATUS.normal).color;
        const on = isSel('update', u.id);
        return (
          <button
            key={u.id}
            type="button"
            className={'spark' + (u.id === newId ? ' isnew' : '') + (on ? ' sel' : '')}
            style={{ left: pos(u.date), background: c, ['--c' as string]: c }}
            onClick={() => onUpdate(u)}
            aria-label={md(u.date) + ' 进展：' + u.title + '，点击查看和编辑'}
            title={md(u.date) + ' ' + u.title}
          />
        );
      })}

      <div className="nowdot" style={{ left: nx }} aria-hidden="true" />
      <div className="nowtag" style={{ left: nx }}>
        {(isToday ? '今天 ' : '模拟 ') + md(simC) + ' · 第 ' + simDay + ' 天'}
      </div>
    </div>
  );
}
