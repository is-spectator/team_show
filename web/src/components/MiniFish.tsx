import { fishLook, type FishLook } from '../lib/fish';
import { byDate, ms } from '../lib/date';
import type { Project } from '../types';

/** 小人和速度线；放在 translate 到主干上的 <g> 里 */
export function Rider({ look, scale = 1 }: { look: FishLook; scale?: number }) {
  return (
    <g className="ride">
      {look.speed && (
        <path className="speed" d="M-17 -9 L-12 -9 M-19 -5 L-13 -5" fill="none" stroke={look.ink} strokeWidth={1.2 / Math.sqrt(scale)} strokeLinecap="round" />
      )}
      {look.rider.fill && <path d={look.rider.fill} fill={look.ink} stroke="#FFFFFF" strokeWidth={0.8 / Math.sqrt(scale)} strokeLinejoin="round" />}
      <path d={look.rider.stroke} fill="none" stroke="#15181E" strokeWidth={1.5 / Math.sqrt(scale)} strokeLinecap="round" strokeLinejoin="round" />
      <path d={look.rider.dot} fill="#15181E" />
    </g>
  );
}

/** 项目卡片上的小鱼：鱼尾是开始，鱼头是交付，小人跑在今天的位置 */
export function MiniFish({ p, today }: { p: Project; today: string }) {
  const look = fishLook(p);
  const total = ms(p.end) - ms(p.start) || 1;
  const x = (d: string) => Math.round((16 + Math.max(0, Math.min(1, (ms(d) - ms(p.start)) / total)) * 272) * 10) / 10;
  const paths = { done: '', plan: '', upd: '' };
  p.items.slice().sort(byDate).forEach((it, k) => {
    const bx = x(it.date), up = k % 2 === 0, len = it.type === 'milestone' ? 15 : 10;
    const seg = `M${bx} 28 L${bx - len * 0.4} ${up ? 28 - len : 28 + len} `;
    if (it.type === 'update') paths.upd += seg;
    else if (it.date <= today) paths.done += seg;
    else paths.plan += seg;
  });
  const nowX = p.status === 'done' ? 288 : x(today);

  return (
    <svg viewBox="0 0 320 56" className="mini" aria-hidden="true">
      <path d={look.tail} fill={look.fill} stroke={look.ink} strokeWidth="1.3" strokeLinejoin="round" />
      <line x1="16" y1="28" x2="288" y2="28" stroke="#E3E7EF" strokeWidth="4" strokeLinecap="round" />
      <line x1="16" y1="28" x2={nowX} y2="28" stroke={look.ink} strokeWidth="4" strokeLinecap="round" />
      {paths.done && <path d={paths.done} fill="none" stroke="#2C3445" strokeWidth="2" strokeLinecap="round" />}
      {paths.plan && <path d={paths.plan} fill="none" stroke="#C3C9D3" strokeWidth="2" strokeLinecap="round" />}
      {paths.upd && <path d={paths.upd} fill="none" stroke={look.ink} strokeWidth="1.5" strokeDasharray="2.5 2.5" strokeLinecap="round" />}
      <FishHead look={look} />
      {look.bubbles && (
        <>
          <circle className="bub" cx={look.mouthX + 2} cy="12" r="2" fill="none" stroke={look.ink} strokeWidth="1" opacity="0.5" />
          <circle className="bub b2" cx={look.mouthX - 3} cy="6" r="1.4" fill="none" stroke={look.ink} strokeWidth="1" opacity="0.35" />
        </>
      )}
      <g transform={`translate(${nowX} 26)`}>
        <Rider look={look} />
      </g>
    </svg>
  );
}

/** 鱼鳍、鱼头、鳃、眼睛和表情；big 时线宽不随放大变粗 */
export function FishHead({ look, big = false }: { look: FishLook; big?: boolean }) {
  const ve = big ? ('non-scaling-stroke' as const) : undefined;
  const w = (n: number) => (big ? n * 1.2 : n);
  return (
    <>
      <path d={look.fin} fill={look.fill} stroke={look.ink} strokeWidth={w(1.2)} strokeLinejoin="round" strokeLinecap="round" vectorEffect={ve} />
      <path d={look.head} fill={look.fill} stroke={look.ink} strokeWidth={w(1.3)} strokeLinejoin="round" vectorEffect={ve} />
      <path d={look.gill} fill="none" stroke={look.ink} strokeWidth={w(1)} opacity="0.45" strokeLinecap="round" vectorEffect={ve} />
      {look.eyeR > 0 && (
        <>
          <circle cx={look.eyeX} cy={look.eyeY} r={look.eyeR} fill="#FFFFFF" stroke={look.ink} strokeWidth={w(1)} vectorEffect={ve} />
          <circle cx={look.eyeX + 0.8} cy={look.eyeY} r={look.pupilR} fill="#15181E" />
        </>
      )}
      <path d={look.face} fill="none" stroke="#15181E" strokeWidth={big ? 1.8 : 1.2} strokeLinecap="round" strokeLinejoin="round" vectorEffect={ve} />
      {look.drop && <path d={look.drop} fill="#9CC3F2" stroke="#4F86C6" strokeWidth={big ? 1 : 0.8} vectorEffect={ve} />}
    </>
  );
}
