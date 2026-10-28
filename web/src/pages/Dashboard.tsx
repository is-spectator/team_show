import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api';
import { useData } from '../store';
import { Crumb, Layout } from '../components/Layout';
import { Avatar, Bar, Empty, StatusTag, downloadText } from '../components/ui';
import { addDays, inDays, md, relDay, todayIso, weekNumber, weekRange } from '../lib/date';
import {
  PROJECT_STATUS, UPDATE_STATUS, allMilestones, allUpdates, byDate, lastActivity, memberWeekUpdates,
  nextMilestone, progress, projectStatus, updatedThisWeek
} from '../lib/derive';
import type { ProjectStatus } from '../types';

const projectLink = (id: string) => '/projects/' + encodeURIComponent(id);

export function Dashboard() {
  const { data, mutate } = useData();
  const [filter, setFilter] = useState<'all' | ProjectStatus>('all');
  const today = todayIso();
  const [mon, sun] = weekRange(today);
  const projects = data.projects;

  useEffect(() => {
    document.title = data.settings.teamName + ' · 工作台';
  }, [data.settings.teamName]);

  const cnt = (s: ProjectStatus) => projects.filter((p) => projectStatus(p) === s).length;
  const soon = allMilestones(projects)
    .filter((m) => m.status !== 'done' && m.planned_date >= today && m.planned_date <= addDays(today, 28))
    .sort(byDate((m) => m.planned_date));
  const overdue = allMilestones(projects).filter((m) => m.status !== 'done' && m.planned_date < today);
  const in7 = soon.filter((m) => m.planned_date <= addDays(today, 7));
  const risks = allUpdates(projects).filter((u) => (u.status === 'risk' || u.status === 'blocked') && !u.resolved);

  const kpis = [
    { l: '进行中项目', n: projects.length - cnt('done'), d: '共 ' + projects.length + ' 个项目', c: undefined },
    { l: '进展正常', n: cnt('on_track'), d: '按计划推进', c: '#0F6A3B' },
    { l: '有风险', n: cnt('at_risk'), d: '需要关注', c: '#8A4504' },
    { l: '已延期', n: cnt('delayed'), d: '需协调资源', c: '#A1201A' },
    { l: '未来 7 天里程碑', n: in7.length, d: in7.slice(0, 2).map((m) => md(m.planned_date) + ' ' + m.title).join('、') || '暂无', c: undefined }
  ];

  const opts: ('all' | ProjectStatus)[] = ['all', 'on_track', 'at_risk', 'delayed', 'done'];
  const rows = projects.filter((p) => filter === 'all' || projectStatus(p) === filter);

  const people = data.members.map((m) => ({ m, n: memberWeekUpdates(m, projects, today).length }));
  const submitted = people.filter((p) => p.n > 0).length;

  const exportWeekly = () => {
    const ups = allUpdates(projects).filter((u) => u.date >= mon && u.date <= sun);
    const lines = [`# ${data.settings.teamName} 周报 · 第 ${weekNumber(today)} 周（${md(mon)} – ${md(sun)}）`, ''];
    lines.push('## 项目概况', '', '| 项目 | 负责人 | 状态 | 进度 | 下一里程碑 |', '| --- | --- | --- | --- | --- |');
    for (const p of projects) {
      const n = nextMilestone(p);
      lines.push(`| ${p.project.name} | ${p.project.owner || '—'} | ${PROJECT_STATUS[projectStatus(p)].label} | ${progress(p, today)}% | ${n ? n.title + ' ' + md(n.planned_date) : '—'} |`);
    }
    lines.push('', '## 本周进展', '');
    for (const p of projects) {
      const mine = ups.filter((u) => u.projectId === p.project.id);
      const ms = p.milestones.filter((m) => m.status === 'done' && m.done_date && m.done_date >= mon && m.done_date <= sun);
      if (!mine.length && !ms.length) continue;
      lines.push('### ' + p.project.name, '');
      for (const m of ms) lines.push(`- 🏁 ${md(m.done_date)} 里程碑完成：${m.title}${m.summary ? '。' + m.summary : ''}`);
      for (const u of mine) lines.push(`- ${md(u.date)} ${u.author || ''}：${u.title}${u.content && u.content !== u.title ? '。' + u.content : ''}${u.risk ? `（风险：${u.risk}）` : ''}`);
      lines.push('');
    }
    if (risks.length) {
      lines.push('## 待决策 / 风险', '');
      for (const r of risks) lines.push(`- 【${r.projectName}】${r.risk || r.content || r.title}（${r.author || '—'}，${md(r.date)}）`);
      lines.push('');
    }
    const missing = people.filter((p) => p.n === 0).map((p) => p.m.name);
    if (missing.length) lines.push('## 本周未提交进展', '', missing.join('、'), '');
    downloadText(`周报-第${weekNumber(today)}周.md`, lines.join('\n'), 'text/markdown');
  };

  return (
    <Layout crumb={<Crumb items={[{ label: '工作台' }]} />}>
      <div className="ph">
        <div>
          <h1>工作台</h1>
          <div className="muted" style={{ marginTop: 4 }}>
            {today.slice(0, 4)} 年第 {weekNumber(today)} 周 · {md(mon)} – {md(sun)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="b" onClick={exportWeekly}>导出周报</button>
          <Link className="b p" to="/sync">+ 提交进展</Link>
        </div>
      </div>

      <div className="kpis">
        {kpis.map((k) => (
          <Link key={k.l} to="/projects" className="pn kpi">
            <div className="muted">{k.l}</div>
            <div className="kpi-n" style={{ color: k.c }}>{k.n}</div>
            <div className="muted ell">{k.d}</div>
          </Link>
        ))}
      </div>

      <div className="row">
        <section className="pn" style={{ flex: '999 1 560px', minWidth: 0 }}>
          <div className="pnh">
            <h2>项目进度</h2>
            <div className="chips" role="group" aria-label="按状态筛选">
              {opts.map((o) => (
                <button key={o} type="button" className={filter === o ? 'on' : ''} onClick={() => setFilter(o)}>
                  {o === 'all' ? '全部' : PROJECT_STATUS[o].label + ' ' + cnt(o)}
                </button>
              ))}
            </div>
          </div>
          <div className="tw">
            <table>
              <thead><tr><th>项目</th><th>负责人</th><th>进度</th><th>状态</th><th>下一里程碑</th><th>本周更新</th></tr></thead>
              <tbody>
                {rows.map((p) => {
                  const st = projectStatus(p);
                  const n = nextMilestone(p);
                  const fresh = updatedThisWeek(p, today);
                  const last = lastActivity(p);
                  return (
                    <tr key={p.project.id}>
                      <td><Link to={projectLink(p.project.id)} style={{ fontWeight: 600 }}>{p.project.name}</Link></td>
                      <td className="nw">{p.project.owner || '—'}</td>
                      <td><Bar pct={progress(p, today)} color={PROJECT_STATUS[st].dot} /></td>
                      <td><StatusTag status={st} /></td>
                      <td className="nw">{n ? <>{n.title} <span className={n.planned_date < today ? 'red' : 'muted'}>{md(n.planned_date)}</span></> : '—'}</td>
                      <td className="nw">{st === 'done' ? <span className="muted">—</span> : fresh ? relDay(last, today) : <span className="red b6">未更新</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length === 0 && <Empty>没有这个状态的项目</Empty>}
          </div>
        </section>

        <section className="pn" style={{ flex: '1 1 300px', minWidth: 0 }}>
          <div className="pnh">
            <h2>待决策 / 风险</h2>
            <span className="st" style={{ background: risks.length ? '#FDECEC' : '#E7F6EE', color: risks.length ? '#A1201A' : '#0F6A3B' }}>{risks.length} 项</span>
          </div>
          <div style={{ padding: '6px 18px 14px' }}>
            {risks.length === 0 && <div className="muted" style={{ padding: '18px 0' }}>暂时没有需要处理的风险。</div>}
            {risks.map((r) => {
              const s = UPDATE_STATUS[r.status || 'risk'];
              return (
                <div key={r.projectId + r.id} className="risk">
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="st" style={{ background: s.bg, color: s.fg }}>{s.label}</span>
                    <Link to={projectLink(r.projectId)} style={{ fontWeight: 600 }}>{r.projectName}</Link>
                  </div>
                  <div style={{ marginTop: 6, lineHeight: 1.6, color: '#4E5969' }}>{r.risk || r.content || r.title}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <span className="muted">{r.author || '—'} 提出 · {relDay(r.date, today)}</span>
                    <button
                      type="button"
                      className="b sm"
                      onClick={() => {
                        const { projectId, projectName, ...u } = r;
                        mutate(() => api.saveUpdate(projectId, { ...u, resolved: true }), '已标记为已处理');
                      }}
                    >
                      标记已处理
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="row">
        <section className="pn" style={{ flex: '1 1 360px', minWidth: 0 }}>
          <div className="pnh"><h2>近期里程碑</h2><span className="muted">未来 4 周{overdue.length ? ` · 另有 ${overdue.length} 个已过计划日期` : ''}</span></div>
          <ul className="miles">
            {soon.length === 0 && <li className="muted">未来 4 周没有计划中的里程碑</li>}
            {soon.map((m) => (
              <li key={m.projectId + m.id}>
                <span className="mdate">{md(m.planned_date)}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <Link to={projectLink(m.projectId)} style={{ fontWeight: 600, color: '#1D2129' }}>{m.projectName} · {m.title}</Link>
                  <span className="muted" style={{ display: 'block' }}>{m.owner || '—'}{m.status === 'delayed' ? ' · 已延期' : ''}</span>
                </span>
                <span className="muted nw">{inDays(m.planned_date, today)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="pn" style={{ flex: '1 1 360px', minWidth: 0 }}>
          <div className="pnh"><h2>本周进展提交</h2><span className="muted">{submitted} / {people.length} 人已提交</span></div>
          <div className="subs">
            {people.map(({ m, n }) => (
              <Link key={m.id} to={'/members?m=' + encodeURIComponent(m.id)} className="sub">
                <Avatar name={m.name} group={m.group} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', color: '#1D2129' }}>{m.name}</span>
                  <span style={{ fontSize: 12 }} className={n ? 'green' : 'red b6'}>{n ? '已提交 ' + n + ' 条' : '未提交'}</span>
                </span>
              </Link>
            ))}
            {people.length === 0 && <span className="muted">还没有成员</span>}
          </div>
        </section>
      </div>
    </Layout>
  );
}
