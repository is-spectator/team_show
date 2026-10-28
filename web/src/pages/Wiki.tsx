import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api';
import { useData } from '../store';
import { Crumb, Layout } from '../components/Layout';
import { DeleteButton, Empty, Icon, Modal } from '../components/ui';
import { relDay, todayIso } from '../lib/date';
import { DOC_CATEGORIES, byDate, isUrl } from '../lib/derive';
import type { Doc } from '../types';

const CAT_STYLE: Record<string, { background: string; color: string }> = {
  入职指南: { background: '#EEF2FF', color: '#1F3BA6' },
  项目文档: { background: '#E7F6EE', color: '#0F6A3B' },
  技术规范: { background: '#F1E8F7', color: '#5E2A7E' },
  会议纪要: { background: '#FCEBDD', color: '#8A3B0A' },
  流程制度: { background: '#F2F3F5', color: '#4E5969' }
};
const ALL = '全部文档';

export function Wiki() {
  const { data } = useData();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState(ALL);
  const [editing, setEditing] = useState<Partial<Doc> | null>(null);
  const today = todayIso();

  useEffect(() => {
    document.title = data.settings.teamName + ' · Wiki 文档';
  }, [data.settings.teamName]);

  const docs = [...data.docs].sort(byDate((d) => d.updated, true));
  const cats = [ALL, ...new Set([...DOC_CATEGORIES, ...docs.map((d) => d.category).filter(Boolean)])];
  const projectName = (id: string) => data.projects.find((p) => p.project.id === id)?.project.name;
  const k = q.trim().toLowerCase();
  const list = docs.filter((d) => (cat === ALL || d.category === cat) && (!k || (d.title + d.owner + (projectName(d.project) || '')).toLowerCase().includes(k)));
  const pins = docs.filter((d) => d.pinned);

  return (
    <Layout crumb={<Crumb items={[{ label: 'Wiki 文档' }]} />}>
      <div className="ph">
        <div>
          <h1>Wiki 文档</h1>
          <div className="muted" style={{ marginTop: 4 }}>文档仍存放在 {data.settings.wikiSource || '原系统'}，这里做统一索引，点击跳转原文</div>
        </div>
        <button type="button" className="b p" onClick={() => setEditing({ category: cat === ALL ? '' : cat })}>+ 收录文档</button>
      </div>

      {pins.length > 0 && (
        <div className="pins">
          {pins.map((p) => (
            <a key={p.id} href={isUrl(p.url) ? p.url : undefined} target="_blank" rel="noopener noreferrer" className="pn pin">
              <span className="pin-i"><Icon name="doc" size={18} /></span>
              <span style={{ minWidth: 0 }}>
                <span className="ell" style={{ fontWeight: 600, display: 'block', color: '#1D2129' }}>{p.title}</span>
                <span className="muted ell" style={{ display: 'block' }}>{p.note || p.category}</span>
              </span>
            </a>
          ))}
        </div>
      )}

      <div className="row">
        <nav className="pn cats" aria-label="文档分类">
          {cats.map((c) => (
            <button key={c} type="button" className={cat === c ? 'on' : ''} aria-pressed={cat === c} onClick={() => setCat(c)}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name={c === ALL ? 'book' : 'doc'} />{c}</span>
              <span className="muted">{c === ALL ? docs.length : docs.filter((d) => d.category === c).length}</span>
            </button>
          ))}
        </nav>

        <section className="pn" style={{ flex: '999 1 560px', minWidth: 0 }}>
          <div className="pnh">
            <h2>{cat} · {list.length} 篇</h2>
            <label className="fi" style={{ width: 280, maxWidth: '100%' }}>
              <Icon name="search" size={15} />
              <input type="search" placeholder="按标题、负责人、项目筛选" aria-label="筛选文档" value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
          </div>
          <div className="tw">
            <table>
              <thead><tr><th>标题</th><th>分类</th><th>关联项目</th><th>负责人</th><th>来源</th><th>更新时间</th><th></th></tr></thead>
              <tbody>
                {list.map((d) => (
                  <tr key={d.id} className="nwrow">
                    <td>{isUrl(d.url) ? <a href={d.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600 }}>{d.title}</a> : <b>{d.title}</b>}{d.pinned && <span className="chip" style={{ marginLeft: 6 }}>常用</span>}</td>
                    <td>{d.category ? <span className="st" style={CAT_STYLE[d.category] || CAT_STYLE['流程制度']}>{d.category}</span> : '—'}</td>
                    <td className="muted">{projectName(d.project) ? <Link to={'/projects/' + encodeURIComponent(d.project)}>{projectName(d.project)}</Link> : '—'}</td>
                    <td>{d.owner || '—'}</td>
                    <td className="muted">{d.source || '—'}</td>
                    <td className="muted">{relDay(d.updated, today)}</td>
                    <td><button type="button" className="link" onClick={() => setEditing(d)}>编辑</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {list.length === 0 && <Empty>没有找到相关文档，换个关键词试试，或点击「收录文档」。</Empty>}
        </section>
      </div>

      {editing && <DocForm init={editing} cats={cats.filter((c) => c !== ALL)} onClose={() => setEditing(null)} />}
    </Layout>
  );
}

function DocForm({ init, cats, onClose }: { init: Partial<Doc>; cats: string[]; onClose: () => void }) {
  const { data, mutate, me } = useData();
  const [f, setF] = useState<Partial<Doc>>({ title: '', url: '', category: '', project: '', owner: me, source: '', updated: todayIso(), pinned: false, note: '', ...init });
  const [err, setErr] = useState('');
  const set = (k: keyof Doc) => (e: { target: { value: string } }) => { setErr(''); setF({ ...f, [k]: e.target.value }); };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.title?.trim()) return setErr('请填写文档标题');
    if ((await mutate(() => api.saveDoc(f), '已保存')) !== false) onClose();
  };
  const del = async () => {
    if (init.id && (await mutate(() => api.deleteDoc(init.id!), '已删除')) !== false) onClose();
  };
  return (
    <Modal title={init.id ? '编辑文档' : '收录文档'} onClose={onClose}>
      <form onSubmit={save}>
        <div className="mbody g2">
          <label className="fl" style={{ gridColumn: '1 / -1' }}>标题<input type="text" autoFocus value={f.title} onChange={set('title')} /></label>
          <label className="fl" style={{ gridColumn: '1 / -1' }}>链接<input type="url" placeholder="https://" value={f.url} onChange={set('url')} /></label>
          <label className="fl">分类
            <input type="text" list="doc-cats" value={f.category} onChange={set('category')} />
            <datalist id="doc-cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
          </label>
          <label className="fl">关联项目
            <select value={f.project} onChange={set('project')}>
              <option value="">不关联</option>
              {data.projects.map((p) => <option key={p.project.id} value={p.project.id}>{p.project.name}</option>)}
            </select>
          </label>
          <label className="fl">负责人
            <input type="text" list="doc-owners" value={f.owner} onChange={set('owner')} />
            <datalist id="doc-owners">{data.members.map((m) => <option key={m.id} value={m.name} />)}</datalist>
          </label>
          <label className="fl">来源<input type="text" placeholder="飞书 / 语雀 / Figma" value={f.source} onChange={set('source')} /></label>
          <label className="fl">更新时间<input type="date" value={f.updated} onChange={set('updated')} /></label>
          <label className="check" style={{ alignSelf: 'end', minHeight: 36 }}>
            <input type="checkbox" checked={!!f.pinned} onChange={(e) => setF({ ...f, pinned: e.target.checked })} />
            放到「常用入口」
          </label>
          {f.pinned && <label className="fl" style={{ gridColumn: '1 / -1' }}>常用入口上的一句话说明<input type="text" placeholder="例如：新同学先看这里" value={f.note} onChange={set('note')} /></label>}
          {err && <div className="alert" style={{ gridColumn: '1 / -1' }}>{err}</div>}
        </div>
        <div className="mfoot">
          {init.id && <DeleteButton onConfirm={del} />}
          <span style={{ flex: 1 }} />
          <button type="button" className="b" onClick={onClose}>取消</button>
          <button type="submit" className="b p">保存</button>
        </div>
      </form>
    </Modal>
  );
}
