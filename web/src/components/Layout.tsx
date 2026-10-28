import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { useData } from '../store';
import { api } from '../api';
import { Avatar, Icon, Modal } from './ui';

const NAV = [
  { group: '概览', items: [{ to: '/', icon: 'dashboard', label: '工作台' }] },
  { group: '项目', items: [{ to: '/projects', icon: 'folder', label: '项目列表' }, { to: '/sync', icon: 'sync', label: '进展同步' }] },
  { group: '团队', items: [{ to: '/members', icon: 'people', label: '成员' }, { to: '/wiki', icon: 'book', label: 'Wiki 文档' }] }
];

export function Layout({ crumb, children }: { crumb: ReactNode; children: ReactNode }) {
  const { data, me, setMe, unlocked, lock, requestUnlock } = useData();
  const [showSettings, setShowSettings] = useState(false);
  const [pickMe, setPickMe] = useState(false);
  const meMember = data.members.find((m) => m.name === me);

  return (
    <div className="app">
      <aside className="sb" aria-label="主菜单">
        <div className="sbh">
          <span className="lg">{(data.settings.teamName.replace(/[[\]]/g, '') || 'T').slice(0, 1)}</span>
          <span className="sbname">{data.settings.teamName}</span>
          <button type="button" className="sbset" onClick={() => setShowSettings(true)} aria-label="团队设置" title="团队设置"><Icon name="gear" size={15} /></button>
        </div>
        <nav className="sbnav">
          {NAV.map((g) => (
            <div key={g.group} className="sbg">
              <div className="grp">{g.group}</div>
              {g.items.map((it) => (
                <NavLink key={it.to} to={it.to} end={it.to === '/'} className={({ isActive }) => (isActive ? 'on' : '')}>
                  <Icon name={it.icon} />
                  {it.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="cnt">
        <header className="hd">
          <div className="crumb">{crumb}</div>
          <GlobalSearch />
          {data.authRequired && (
            <button
              type="button"
              className="ib"
              onClick={() => (unlocked ? lock() : requestUnlock())}
              aria-label={unlocked ? '退出编辑模式' : '输入密码进入编辑模式'}
              title={unlocked ? '编辑模式已开启，点击退出' : '只读模式，点击输入编辑密码'}
              style={unlocked ? { color: '#0F6A3B' } : undefined}
            >
              <Icon name={unlocked ? 'unlock' : 'lock'} size={18} />
            </button>
          )}
          <button type="button" className="me" onClick={() => setPickMe(true)} title="切换「我是谁」，写进展时会作为填写人">
            {me ? <Avatar name={me} group={meMember?.group} /> : <span className="av" style={{ width: 28, height: 28, background: '#F2F3F5', color: '#6B7280' }}>?</span>}
            {me || '我是谁？'}
          </button>
        </header>
        <main className="bd">{children}</main>
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {pickMe && (
        <Modal title="我是谁" sub="选择你自己，写进展时会自动填为填写人。只保存在这台电脑上。" onClose={() => setPickMe(false)} width={460}>
          <div className="mbody pickme">
            {data.members.map((m) => (
              <button
                key={m.id}
                type="button"
                className={'pickme-i' + (m.name === me ? ' on' : '')}
                onClick={() => {
                  setMe(m.name);
                  setPickMe(false);
                }}
              >
                <Avatar name={m.name} group={m.group} />
                <span>
                  <span style={{ display: 'block', fontWeight: 600 }}>{m.name}</span>
                  <span className="muted">{m.role}</span>
                </span>
              </button>
            ))}
            {data.members.length === 0 && <div className="muted">还没有成员，先去「成员」页添加。</div>}
          </div>
        </Modal>
      )}
    </div>
  );
}

function GlobalSearch() {
  const { data } = useData();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const box = useRef<HTMLLabelElement>(null);

  const results = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return [];
    const hit = (s: string) => s.toLowerCase().includes(k);
    return [
      ...data.projects.filter((f) => hit(f.project.name + (f.project.owner || ''))).map((f) => ({ kind: '项目', label: f.project.name, sub: f.project.owner || '', go: () => nav('/projects/' + encodeURIComponent(f.project.id)) })),
      ...data.members.filter((m) => hit(m.name + m.role + m.skills.join(''))).map((m) => ({ kind: '成员', label: m.name, sub: m.role, go: () => nav('/members?m=' + encodeURIComponent(m.id)) })),
      ...data.docs.filter((d) => hit(d.title + d.owner)).map((d) => ({ kind: '文档', label: d.title, sub: d.owner, go: () => (d.url ? window.open(d.url, '_blank', 'noopener') : nav('/wiki')) }))
    ].slice(0, 12);
  }, [q, data, nav]);

  return (
    <div className="srchwrap">
      <label className="srch" ref={box}>
        <Icon name="search" size={15} />
        <input
          type="search"
          placeholder="搜索项目、成员、文档"
          aria-label="全局搜索"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results[0]) {
              results[0].go();
              setQ('');
              setOpen(false);
            }
          }}
        />
      </label>
      {open && q.trim() && (
        <div className="srchpop" role="listbox">
          {results.length === 0 && <div className="muted" style={{ padding: '12px 14px' }}>没有找到「{q.trim()}」</div>}
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              role="option"
              aria-selected={false}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                r.go();
                setQ('');
                setOpen(false);
              }}
            >
              <span className="chip">{r.kind}</span>
              <span style={{ fontWeight: 600 }}>{r.label}</span>
              <span className="muted">{r.sub}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const { data, mutate } = useData();
  const [s, setS] = useState(data.settings);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((await mutate(() => api.saveSettings(s), '已保存')) !== false) onClose();
  };
  return (
    <Modal title="团队设置" onClose={onClose} width={460}>
      <form onSubmit={save}>
        <div className="mbody">
          <label className="fl">
            团队名称（显示在左上角和浏览器标题）
            <input type="text" value={s.teamName} onChange={(e) => setS({ ...s, teamName: e.target.value })} />
          </label>
          <label className="fl">
            文档存放在哪里（显示在 Wiki 页说明里）
            <input type="text" value={s.wikiSource} onChange={(e) => setS({ ...s, wikiSource: e.target.value })} />
          </label>
        </div>
        <div className="mfoot">
          <button type="button" className="b" onClick={onClose}>取消</button>
          <button type="submit" className="b p">保存</button>
        </div>
      </form>
    </Modal>
  );
}

export function Crumb({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <>
      {items.map((it, i) => (
        <span key={i}>
          {i > 0 && <span className="crumb-sep">/</span>}
          {it.to ? <Link to={it.to}>{it.label}</Link> : <b>{it.label}</b>}
        </span>
      ))}
    </>
  );
}
