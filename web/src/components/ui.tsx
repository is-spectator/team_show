import { useEffect, useState, type ReactNode } from 'react';
import type { Attachment, AttachmentType, ProjectStatus } from '../types';
import { ATTACHMENT_TYPE, PROJECT_STATUS, avatarColor, isUrl } from '../lib/derive';

// ---------- 图标 ----------
const ICONS: Record<string, ReactNode> = {
  dashboard: (<><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>),
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  sync: <path d="M4 6h16M4 12h10M4 18h7" />,
  people: (<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.2.6 3.5 2.8 3.5 6" /></>),
  book: (<><path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z" /><path d="M8 7h6" /></>),
  search: (<><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  clip: <path d="M21 11.5l-8.6 8.6a5 5 0 0 1-7.1-7.1l8.6-8.6a3.3 3.3 0 0 1 4.7 4.7l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4l7.9-7.9" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  io: (<><path d="M12 3v12M7 10l5 5 5-5" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></>),
  lock: (<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>),
  unlock: (<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 7.5-2" /></>),
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  doc: (<><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></>),
  gear: (<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>)
};

export function Icon({ name, size = 16 }: { name: keyof typeof ICONS | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

// ---------- 小部件 ----------
export function Avatar({ name, group, size = 28 }: { name: string; group?: string; size?: number }) {
  return (
    <span className="av" style={{ width: size, height: size, fontSize: Math.round(size * 0.42), ...avatarColor(group, name) }}>
      {name.slice(0, 1) || '?'}
    </span>
  );
}

export function StatusTag({ status }: { status: ProjectStatus }) {
  const s = PROJECT_STATUS[status] || PROJECT_STATUS.on_track;
  return (
    <span className="st" style={{ background: s.bg, color: s.fg }}>
      <span className="dot" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

export function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span className="bar"><span style={{ display: 'block', height: '100%', width: pct + '%', background: color }} /></span>
      <span className="num">{pct}%</span>
    </span>
  );
}

export function Modal({ title, sub, onClose, children, width = 560 }: { title: string; sub?: ReactNode; onClose: () => void; children: ReactNode; width?: number }) {
  useEsc(onClose);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pn modal" role="dialog" aria-modal="true" aria-label={title} style={{ width }}>
        <div className="mhead">
          <div style={{ minWidth: 0 }}>
            <h2>{title}</h2>
            {sub && <div className="muted" style={{ marginTop: 4, lineHeight: 1.6 }}>{sub}</div>}
          </div>
          <button type="button" className="ib" onClick={onClose} aria-label="关闭"><Icon name="close" size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Drawer({ title, head, onClose, children, foot }: { title: string; head?: ReactNode; onClose: () => void; children: ReactNode; foot: ReactNode }) {
  useEsc(onClose);
  return (
    <div>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={title}>
        <div className="mhead">
          <div style={{ minWidth: 0 }}>
            {head}
            <h2 style={{ marginTop: head ? 6 : 0 }}>{title}</h2>
          </div>
          <button type="button" className="ib" onClick={onClose} aria-label="关闭"><Icon name="close" size={18} /></button>
        </div>
        <div className="dbody">{children}</div>
        <div className="mfoot">{foot}</div>
      </aside>
    </div>
  );
}

function useEsc(fn: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && fn();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [fn]);
}

/** 第一次点显示「确认删除」，再点才执行 */
export function DeleteButton({ onConfirm, label = '删除' }: { onConfirm: () => void; label?: string }) {
  const [armed, setArmed] = useState(false);
  return (
    <button type="button" className={'b ' + (armed ? 'danger' : 'danger-ghost')} onClick={() => (armed ? onConfirm() : setArmed(true))} onBlur={() => setArmed(false)}>
      {armed ? '确认' + label : label}
    </button>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty muted">{children}</div>;
}

// ---------- 附件 ----------
export function AttachmentLink({ a }: { a: Attachment }) {
  return isUrl(a.url) ? (
    <a href={a.url} target="_blank" rel="noopener noreferrer">{a.title || a.url}</a>
  ) : (
    <span style={{ fontWeight: 600 }}>{a.title}</span>
  );
}

export function AttachmentEditor({ value, onChange }: { value: Attachment[]; onChange: (v: Attachment[]) => void }) {
  const blank = { title: '', url: '', type: 'doc' as AttachmentType };
  const [n, setN] = useState(blank);
  const add = () => {
    if (!n.title.trim() && !n.url.trim()) return;
    onChange([...value, { title: n.title.trim() || n.url.trim(), url: n.url.trim(), type: n.type }]);
    setN(blank);
  };
  return (
    <div className="attbox">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600 }}>附件</span>
        <span className="muted">{value.length} 个</span>
      </div>
      {value.length === 0 && <div className="muted" style={{ lineHeight: 1.6 }}>还没有附件。可以把评审记录、测试报告、PRD 等文档链接挂在这里。</div>}
      {value.map((a, i) => (
        <div className="att" key={i}>
          <span className="st" style={{ background: '#EEF2FF', color: '#1F3BA6' }}>{ATTACHMENT_TYPE[a.type || 'doc'] || '链接'}</span>
          <span className="att-t"><AttachmentLink a={a} /></span>
          <button type="button" className="ib sm" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={'移除附件 ' + a.title}>
            <Icon name="close" size={14} />
          </button>
        </div>
      ))}
      <div className="attnew">
        <label className="fl">
          类型
          <select value={n.type} onChange={(e) => setN({ ...n, type: e.target.value as AttachmentType })}>
            {Object.entries(ATTACHMENT_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="fl">
          标题
          <input type="text" placeholder="例如：灰度复盘报告" value={n.title} onChange={(e) => setN({ ...n, title: e.target.value })} />
        </label>
        <label className="fl" style={{ gridColumn: '1 / -1' }}>
          链接
          <input type="url" placeholder="https://" value={n.url} onChange={(e) => setN({ ...n, url: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} />
        </label>
        <button type="button" className="b" style={{ gridColumn: '1 / -1', justifySelf: 'start' }} onClick={add}>+ 添加附件</button>
      </div>
    </div>
  );
}

/** 下载一段文本为文件 */
export function downloadText(name: string, text: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
