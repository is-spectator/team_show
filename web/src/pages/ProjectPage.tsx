import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Layout } from '../components/Layout';
import { BigFish } from '../components/BigFish';
import { ItemPanel } from '../components/ItemPanel';
import { ProjectPanel } from '../components/ProjectPanel';
import { ExportDialog } from '../components/DataDialog';
import { StatusTag, ErrorText } from '../components/ui';
import { useData } from '../store';
import { fishLook } from '../lib/fish';
import { DATE_RE, byDate, days, md, today, ym } from '../lib/date';
import type { Item, ItemType, Project } from '../types';

type Sel = { kind: 'item'; draft: Item; dirty: boolean } | { kind: 'project'; draft: Project } | null;

export function ProjectPage() {
  const { id = '' } = useParams();
  const data = useData();
  const nav = useNavigate();
  const [sel, setSel] = useState<Sel>(null);
  const [newId, setNewId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [err, setErr] = useState('');
  const saved = data.projects.find((p) => p.id === id);

  if (!saved) {
    return (
      <Layout back>
        <p className="empty">这个项目不存在，可能已经被删除了。<Link to="/">回到全部项目</Link></p>
      </Layout>
    );
  }

  // 编辑中的草稿直接画到鱼骨图上，点「完成」才保存
  let p: Project = saved;
  if (sel?.kind === 'item') {
    const has = saved.items.some((x) => x.id === sel.draft.id);
    p = { ...saved, items: has ? saved.items.map((x) => (x.id === sel.draft.id ? sel.draft : x)) : saved.items };
  } else if (sel?.kind === 'project') {
    const d = sel.draft;
    const datesOk = DATE_RE.test(d.start) && DATE_RE.test(d.end) && d.end > d.start;
    p = { ...d, start: datesOk ? d.start : saved.start, end: datesOk ? d.end : saved.end, items: saved.items };
  }

  const now = today();
  const look = fishLook(p);
  const items = p.items.slice().sort(byDate);
  const milestones = items.filter((it) => it.type === 'milestone');
  const updates = items.filter((it) => it.type === 'update');
  const total = days(p.start, p.end) || 1;
  const passed = Math.max(0, Math.min(total, days(p.start, now)));
  const selId = sel?.kind === 'item' ? sel.draft.id : null;

  const pick = async (it: Item) => {
    setErr('');
    // 切到另一根骨头前，先把没保存的改动存掉
    if (sel?.kind === 'item' && sel.dirty && sel.draft.id !== it.id) {
      try {
        await data.saveItem(saved.id, sel.draft);
      } catch (e) {
        return setErr('上一条没有保存成功：' + (e as Error).message);
      }
    }
    setNewId(null);
    setSel({ kind: 'item', draft: it, dirty: false });
  };

  const add = async (type: ItemType) => {
    setErr('');
    try {
      const it = await data.addItem(saved.id, {
        type, date: now, title: type === 'milestone' ? '新的里程碑' : '新的进展', author: saved.owner, text: '', links: []
      });
      setNewId(it.id);
      setSel({ kind: 'item', draft: it, dirty: false });
      requestAnimationFrame(() => document.getElementById('editor')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const close = () => setSel(null);
  const Row = ({ it }: { it: Item }) => (
    <button type="button" className={'row' + (selId === it.id ? ' on' : '')} onClick={() => pick(it)}>
      <span className="mono muted row-date">{md(it.date)}</span>
      <span className="row-mark" style={{ borderTop: it.type === 'milestone' ? '2.5px solid ' + (it.date > now ? '#C3C9D3' : '#2C3445') : '2.5px dashed ' + look.ink }} />
      <span className="row-body">
        <span className="row-title">{it.title}</span>
        <span className="row-sub">{[it.author, it.links.length ? it.links.length + ' 个链接' : '', it.type === 'milestone' && it.date > now ? '计划中' : ''].filter(Boolean).join(' · ') || ' '}</span>
      </span>
    </button>
  );

  return (
    <Layout back>
      <section className="detail-hd">
        <div className="hero-text">
          <div className="meta">
            <StatusTag status={p.status} />
            <span>{[p.owner && '负责人 ' + p.owner, p.members.length ? '成员 ' + p.members.join('、') : '', ym(p.start) + ' – ' + ym(p.end)].filter(Boolean).join(' · ')}</span>
          </div>
          <h1>{p.name}</h1>
          <p className="lead">{p.goal_detail || p.goal}</p>
        </div>
        <dl className="stats">
          <div><dt>时间</dt><dd className="big-num">{Math.round((passed / total) * 100)}%</dd><dd>第 {passed} / {total} 天</dd></div>
          <div><dt>里程碑</dt><dd className="big-num">{milestones.filter((it) => it.date <= now).length}<span className="of"> / {milestones.length}</span></dd><dd>已达成 / 全部</dd></div>
          <div><dt>进展</dt><dd className="big-num">{updates.length}</dd><dd>条记录</dd></div>
        </dl>
      </section>

      <section className="fish-sec">
        <div className="toolbar">
          <div className="legend">
            <span><i style={{ borderTop: '2.5px solid #2C3445' }} />里程碑</span>
            <span><i style={{ borderTop: '2.5px solid #C3C9D3' }} />计划中的里程碑</span>
            <span><i style={{ borderTop: '2.5px dashed ' + look.ink }} />进展</span>
          </div>
          <div className="row8">
            {data.canEdit && (
              <>
                <button type="button" className="btn dashed" onClick={() => add('update')}>+ 新增进展</button>
                <button type="button" className="btn dark" onClick={() => add('milestone')}>+ 新增里程碑</button>
                <button type="button" className="btn" onClick={() => setSel({ kind: 'project', draft: saved })}>编辑项目</button>
              </>
            )}
            <button type="button" className="btn" onClick={() => setExporting(true)}>导出数据</button>
          </div>
        </div>
        <BigFish p={p} today={now} selId={selId} newId={newId} onPick={pick} onGoal={() => data.canEdit && setSel({ kind: 'project', draft: saved })} />
        <p className="muted">{data.canEdit ? '点任意一根鱼骨上的卡片，下方可以直接修改文字、日期和链接。' : '点任意一根鱼骨上的卡片，可以看详细内容和附带的文档。'}</p>
        <ErrorText>{err}</ErrorText>
      </section>

      <div id="editor">
        {sel?.kind === 'item' && (
          <ItemPanel
            key={sel.draft.id}
            item={sel.draft}
            canEdit={data.canEdit}
            inkColor={look.ink}
            onDraft={(draft) => setSel({ kind: 'item', draft, dirty: true })}
            onSave={async (it) => {
              await data.saveItem(saved.id, it);
              close();
            }}
            onDelete={async () => {
              await data.deleteItem(saved.id, sel.draft.id);
              close();
            }}
            onClose={close}
          />
        )}
        {sel?.kind === 'project' && (
          <ProjectPanel
            draft={sel.draft}
            onDraft={(draft) => setSel({ kind: 'project', draft })}
            onSave={async (info) => {
              await data.patchProject(saved.id, info);
              close();
            }}
            onDelete={async () => {
              await data.deleteProject(saved.id);
              nav('/');
            }}
            onClose={close}
          />
        )}
      </div>

      <div className="lists">
        <section>
          <h2>里程碑</h2>
          {milestones.length ? milestones.slice().reverse().map((it) => <Row key={it.id} it={it} />) : <p className="muted">还没有里程碑</p>}
        </section>
        <section>
          <h2>进展</h2>
          {updates.length ? updates.slice().reverse().map((it) => <Row key={it.id} it={it} />) : <p className="muted">还没有进展</p>}
        </section>
      </div>

      {exporting && <ExportDialog p={saved} onClose={() => setExporting(false)} />}
    </Layout>
  );
}
