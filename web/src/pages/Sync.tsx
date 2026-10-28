import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useData } from '../store';
import { Crumb, Layout } from '../components/Layout';
import { WriteForm } from '../components/WriteForm';
import { Avatar, AttachmentLink, Empty } from '../components/ui';
import { md, relDay, todayIso } from '../lib/date';
import { UPDATE_STATUS, allMilestones, allUpdates, byDate } from '../lib/derive';

/** 进展同步：跨项目的进展流，成员在这里统一写进展，老板在这里一眼看完最近动态。 */
export function Sync() {
  const { data, me } = useData();
  const [params] = useSearchParams();
  const [who, setWho] = useState('');
  const [pf, setPf] = useState(params.get('p') || '');
  const today = todayIso();

  useEffect(() => {
    document.title = data.settings.teamName + ' · 进展同步';
  }, [data.settings.teamName]);

  const feed = [
    ...allUpdates(data.projects).map((u) => ({ ...u, kind: 'update' as const, person: u.author || '' })),
    ...allMilestones(data.projects)
      .filter((m) => m.status === 'done' && m.done_date)
      .map((m) => ({ ...m, kind: 'milestone' as const, date: m.done_date!, person: m.owner || '' }))
  ]
    .filter((x) => (!who || x.person === who) && (!pf || x.projectId === pf))
    .sort(byDate((x) => x.date, true))
    .slice(0, 80);

  const groupMember = (name: string) => data.members.find((m) => m.name === name)?.group;
  let lastDay = '';

  return (
    <Layout crumb={<Crumb items={[{ label: '进展同步' }]} />}>
      <div className="ph">
        <div>
          <h1>进展同步</h1>
          <div className="muted" style={{ marginTop: 4 }}>所有项目的进展都在这里，写一条会同时出现在对应项目的鱼骨图上</div>
        </div>
      </div>

      <div className="row">
        <WriteForm key={pf} projects={data.projects} defaultProjectId={pf} defaultDate={today} />
        <section className="pn" style={{ flex: '1 1 300px', minWidth: 0 }}>
          <div className="pnh"><h2>筛选</h2></div>
          <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label className="fl">项目
              <select value={pf} onChange={(e) => setPf(e.target.value)}>
                <option value="">全部项目</option>
                {data.projects.map((p) => <option key={p.project.id} value={p.project.id}>{p.project.name}</option>)}
              </select>
            </label>
            <label className="fl">成员
              <select value={who} onChange={(e) => setWho(e.target.value)}>
                <option value="">全部成员</option>
                {data.members.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            </label>
            {me && <button type="button" className="b" style={{ alignSelf: 'flex-start' }} onClick={() => setWho(who === me ? '' : me)}>{who === me ? '看全部人' : '只看我的'}</button>}
          </div>
        </section>
      </div>

      <section className="pn">
        <div className="pnh"><h2>最近动态</h2><span className="muted">最近 {feed.length} 条</span></div>
        {feed.length === 0 && <Empty>没有符合条件的进展</Empty>}
        <ul className="feed">
          {feed.map((x) => {
            const head = x.date !== lastDay ? relDay(x.date, today) + (relDay(x.date, today) === md(x.date) ? '' : ' · ' + md(x.date)) : '';
            lastDay = x.date;
            const s = x.kind === 'update' ? UPDATE_STATUS[x.status || 'normal'] || UPDATE_STATUS.normal : null;
            return (
              <li key={x.kind + x.projectId + x.id}>
                {head && <div className="feed-day">{head}</div>}
                <div className="feed-i">
                  {x.person ? <Avatar name={x.person} group={groupMember(x.person)} size={32} /> : <span className="av" style={{ width: 32, height: 32, background: '#F2F3F5' }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px', alignItems: 'center' }}>
                      <b>{x.person || '—'}</b>
                      <span className="muted">在</span>
                      <Link to={'/projects/' + encodeURIComponent(x.projectId)} style={{ fontWeight: 600 }}>{x.projectName}</Link>
                      {x.kind === 'milestone' ? (
                        <span className="st" style={{ background: '#3B4A66', color: '#FFFFFF' }}>里程碑完成</span>
                      ) : (
                        s && x.status !== 'normal' && <span className="st" style={{ background: s.bg, color: s.fg }}>{s.label}{x.resolved ? ' · 已处理' : ''}</span>
                      )}
                    </div>
                    <div style={{ marginTop: 4, fontWeight: 600 }}>{x.title}</div>
                    {x.kind === 'update' && x.content && x.content !== x.title && <div style={{ marginTop: 2, color: '#4E5969', lineHeight: 1.6 }}>{x.content}</div>}
                    {x.kind === 'milestone' && x.summary && <div style={{ marginTop: 2, color: '#4E5969', lineHeight: 1.6 }}>{x.summary}</div>}
                    {x.kind === 'update' && x.risk && <div className="feed-risk">风险 / 需要支持：{x.risk}</div>}
                    {(x.attachments || []).length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6, fontSize: 13 }}>
                        {x.attachments!.map((a, i) => <span key={i}>📎 <AttachmentLink a={a} /></span>)}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </Layout>
  );
}
