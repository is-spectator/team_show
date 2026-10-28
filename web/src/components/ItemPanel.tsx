import { useState } from 'react';
import { ErrorText } from './ui';
import { DATE_RE, ymd } from '../lib/date';
import type { Item } from '../types';

interface Props {
  item: Item;
  canEdit: boolean;
  inkColor: string;
  /** 草稿一改，鱼骨图上就跟着变 */
  onDraft: (it: Item) => void;
  onSave: (it: Item) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}

/** 点一根鱼骨后下方出现的面板：能编辑时是表单，只读时是正文和链接 */
export function ItemPanel({ item, canEdit, inkColor, onDraft, onSave, onDelete, onClose }: Props) {
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [delArm, setDelArm] = useState(false);
  const [nl, setNl] = useState({ title: '', url: '' });
  const set = (patch: Partial<Item>) => {
    setErr('');
    onDraft({ ...item, ...patch });
  };

  if (!canEdit) {
    return (
      <section className="panel" aria-label={item.title}>
        <div className="panel-hd">
          <div className="stack6">
            <span className="panel-kind" style={{ color: item.type === 'milestone' ? '#2C3445' : inkColor }}>
              {item.type === 'milestone' ? '里程碑' : '进展'} · {ymd(item.date)}{item.author ? ' · ' + item.author : ''}
            </span>
            <h3>{item.title}</h3>
          </div>
          <button type="button" className="btn dark" onClick={onClose}>收起</button>
        </div>
        {item.text && <p className="panel-text">{item.text}</p>}
        <Links links={item.links} />
      </section>
    );
  }

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr('');
    try {
      await fn();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const done = () => {
    if (!item.title.trim()) return setErr('请写一个标题');
    if (!DATE_RE.test(item.date)) return setErr('请选择日期');
    const t = nl.title.trim(), u = nl.url.trim();
    // 填了链接还没点「添加」，一起保存
    const final = t || u ? { ...item, links: [...item.links, { title: t || u, url: u }] } : item;
    run(() => onSave(final));
  };
  const addLink = () => {
    const t = nl.title.trim(), u = nl.url.trim();
    if (!t && !u) return;
    set({ links: [...item.links, { title: t || u, url: u }] });
    setNl({ title: '', url: '' });
  };

  return (
    <section className="panel" aria-label="编辑鱼骨">
      <div className="panel-hd">
        <div className="seg" role="group" aria-label="类型">
          <button type="button" aria-pressed={item.type === 'update'} onClick={() => set({ type: 'update' })}>进展 · 虚线骨</button>
          <button type="button" aria-pressed={item.type === 'milestone'} onClick={() => set({ type: 'milestone' })}>里程碑 · 实线骨</button>
        </div>
        <div className="row8">
          <button type="button" className={'btn ' + (delArm ? 'danger-on' : 'danger')} disabled={busy} onClick={() => (delArm ? run(onDelete) : setDelArm(true))}>
            {delArm ? '确认删除' : '删除'}
          </button>
          <button type="button" className="btn" disabled={busy} onClick={onClose}>取消</button>
          <button type="button" className="btn dark" disabled={busy} onClick={done}>{busy ? '保存中…' : '完成'}</button>
        </div>
      </div>
      <div className="grid-fields">
        <label className="fld wide">标题（写在骨头的卡片上）
          <input type="text" value={item.title} onChange={(e) => set({ title: e.target.value })} placeholder="例如：灰度上线" maxLength={60} />
        </label>
        <label className="fld">日期
          <input type="date" value={item.date} onChange={(e) => DATE_RE.test(e.target.value) && set({ date: e.target.value })} />
        </label>
        <label className="fld">填写人
          <input type="text" value={item.author} onChange={(e) => set({ author: e.target.value })} />
        </label>
        <label className="fld wide">内容
          <textarea rows={4} value={item.text} onChange={(e) => set({ text: e.target.value })} placeholder="做了什么、结果如何、下一步是什么、需要谁支持" />
        </label>
      </div>
      <div className="stack10">
        <span className="lbl">文档链接</span>
        <Links links={item.links} onRemove={(k) => set({ links: item.links.filter((_, j) => j !== k) })} />
        <div className="link-add">
          <label className="fld">链接名称
            <input type="text" value={nl.title} onChange={(e) => setNl({ ...nl, title: e.target.value })} placeholder="例如：灰度复盘报告" />
          </label>
          <label className="fld">地址
            <input type="url" value={nl.url} onChange={(e) => setNl({ ...nl, url: e.target.value })} placeholder="https://" onKeyDown={(e) => e.key === 'Enter' && addLink()} />
          </label>
          <button type="button" className="btn square" onClick={addLink}>添加</button>
        </div>
      </div>
      <ErrorText>{err}</ErrorText>
    </section>
  );
}

function Links({ links, onRemove }: { links: Item['links']; onRemove?: (k: number) => void }) {
  if (!links.length) return onRemove ? null : <p className="muted">没有附带文档</p>;
  return (
    <div className="stack8">
      {links.map((l, k) => (
        <div className="link-row" key={k}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2449D8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" />
          </svg>
          {l.url ? <a href={l.url} target="_blank" rel="noopener noreferrer">{l.title}</a> : <span className="link-title">{l.title}</span>}
          {onRemove && <button type="button" className="x small" onClick={() => onRemove(k)} aria-label={'移除链接 ' + l.title}>×</button>}
        </div>
      ))}
    </div>
  );
}
