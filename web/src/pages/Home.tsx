import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Layout } from '../components/Layout';
import { MiniFish } from '../components/MiniFish';
import { ImportDialog } from '../components/DataDialog';
import { StatusTag } from '../components/ui';
import { useData } from '../store';
import { byDate, md, today, ym } from '../lib/date';
import type { Project } from '../types';

type Filter = 'all' | 'active' | 'attention' | 'done';
const FILTERS: [Filter, string][] = [['all', '全部'], ['active', '进行中'], ['attention', '需要关注'], ['done', '已交付']];
const attention = (p: Project) => p.status === 'at_risk' || p.status === 'delayed';
const VIEW_KEY = 'team-show:view';
const loadView = () => {
  try {
    return localStorage.getItem(VIEW_KEY) === 'sample';
  } catch {
    return false;
  }
};
const match = (p: Project, f: Filter) => (f === 'all' ? true : f === 'active' ? p.status !== 'done' : f === 'attention' ? attention(p) : p.status === 'done');

export function Home() {
  const { projects: all, canEdit, importProject } = useData();
  const [f, setF] = useState<Filter>('all');
  // 示例项目单独放，切换后记在浏览器里，从项目页返回时还在同一边
  const [sample, setSample] = useState(loadView);
  const hasSample = all.some((p) => p.sample);
  const showSample = sample && hasSample;
  const projects = all.filter((p) => !!p.sample === showSample);
  const pickView = (v: boolean) => {
    setSample(v);
    setF('all');
    try {
      localStorage.setItem(VIEW_KEY, v ? 'sample' : 'real');
    } catch {
      /* 隐私模式下忽略 */
    }
  };
  const [importing, setImporting] = useState(false);
  const nav = useNavigate();
  const now = today();
  const n = (k: Filter) => projects.filter((p) => match(p, k)).length;
  // 已交付的排在后面，其余保持原来的顺序
  const shown = projects.filter((p) => match(p, f)).sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done'));

  const summary = projects.length
    ? `目前有 ${n('active')} 个项目在推进，其中 ${n('active') - n('attention')} 个按计划进行，${n('attention')} 个需要关注；另有 ${n('done')} 个已经交付。`
    : '还没有项目。导入一份项目文件，就会多一条鱼。';

  return (
    <Layout>
      <section className="hero">
        <div className="hero-text">
          <h1>项目进展</h1>
          <p className="lead">{summary}</p>
        </div>
        {canEdit && (
          <button type="button" className="btn pill" onClick={() => setImporting(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5" /><path d="M4 19h16" /></svg>
            导入项目
          </button>
        )}
      </section>

      <div className="stack20">
        <div className="filter-bar">
          <div className="chips" role="group" aria-label="按状态筛选">
            {FILTERS.map(([k, label]) => (
              <button key={k} type="button" className="chip" aria-pressed={f === k} onClick={() => setF(k)}>
                {label}<span className="mono n">{n(k)}</span>
              </button>
            ))}
          </div>
          {hasSample && (
            <div className="seg" role="group" aria-label="切换真实项目和示例项目">
              <button type="button" aria-pressed={!showSample} onClick={() => pickView(false)}>真实项目</button>
              <button type="button" aria-pressed={showSample} onClick={() => pickView(true)}>示例项目</button>
            </div>
          )}
        </div>
        {showSample && <p className="muted">示例项目用来演示鱼骨图的各种状态，不是团队的真实项目。</p>}
        {shown.length ? (
          <div className="cards">
            {shown.map((p) => <Card key={p.id} p={p} now={now} />)}
          </div>
        ) : (
          <p className="empty">{projects.length ? '这个分类下没有项目。' : canEdit ? '点右上方的「导入项目」，粘贴模板内容就能创建第一个项目。' : '还没有项目。'}</p>
        )}
      </div>

      <footer className="foot">
        <span>每个项目一条鱼：鱼尾是开始，鱼头是交付，主干上跑着的小家伙就是今天。实线骨是里程碑，虚线骨是进展。</span>
        <span>点卡片进入项目</span>
      </footer>

      {importing && (
        <ImportDialog
          onClose={() => setImporting(false)}
          onImport={async (texts) => {
            const created: Project[] = [];
            for (const [k, t] of texts.entries()) {
              try {
                created.push(await importProject(t));
              } catch (e) {
                throw texts.length > 1 ? new Error('第 ' + (k + 1) + ' 个项目：' + (e as Error).message) : e;
              }
            }
            pickView(created.every((p) => p.sample));
            if (created.length === 1) nav('/p/' + encodeURIComponent(created[0].id));
            else setImporting(false);
          }}
        />
      )}
    </Layout>
  );
}

function Card({ p, now }: { p: Project; now: string }) {
  const items = p.items.slice().sort(byDate);
  const ms = items.filter((it) => it.type === 'milestone');
  const next = ms.find((it) => it.date > now);
  const past = items.filter((it) => it.date <= now);
  const last = past[past.length - 1];
  return (
    <Link to={'/p/' + encodeURIComponent(p.id)} className="card">
      <span className="card-top">
        <StatusTag status={p.status} />
        <span className="muted">{p.owner && '负责人 ' + p.owner}</span>
      </span>
      <span className="stack6">
        <span className="card-name">{p.name}</span>
        <span className="card-goal">{p.goal_detail || p.goal}</span>
      </span>
      <MiniFish p={p} today={now} />
      <span className="card-axis">
        <span className="mono">{ym(p.start)}</span>
        <span>里程碑 {ms.filter((it) => it.date <= now).length} / {ms.length} · 进展 {items.length - ms.length}</span>
        <span className="mono">{ym(p.end)}</span>
      </span>
      <span className="card-foot">
        <span className="kv"><span className="k">下一步</span><span><b>{next ? next.title : p.status === 'done' ? '已全部完成' : '暂无计划中的里程碑'}</b>{next && <span className="mono muted ml8">{md(next.date)}</span>}</span></span>
        <span className="kv"><span className="k">最近</span><span className="soft">{last ? md(last.date) + ' ' + last.title : '还没有记录'}</span></span>
      </span>
    </Link>
  );
}
