import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api } from '../api';
import { useData } from '../store';
import { Crumb, Layout } from '../components/Layout';
import { Avatar, Bar, Empty, Modal, StatusTag, downloadText } from '../components/ui';
import { addDays, md, period, relDay, todayIso } from '../lib/date';
import { LINES, PROJECT_STATUS, lastActivity, nextMilestone, progress, projectStatus } from '../lib/derive';
import type { ProjectStatus } from '../types';

export function Projects() {
  const { data } = useData();
  const [q, setQ] = useState('');
  const [fs, setFs] = useState<'' | ProjectStatus>('');
  const [fl, setFl] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const today = todayIso();

  useEffect(() => {
    document.title = data.settings.teamName + ' · 项目列表';
  }, [data.settings.teamName]);

  const lines = [...new Set([...LINES, ...data.projects.map((p) => p.project.line || '').filter(Boolean)])];
  const k = q.trim().toLowerCase();
  const rows = data.projects.filter(
    (p) =>
      (!fs || projectStatus(p) === fs) &&
      (!fl || p.project.line === fl) &&
      (!k || (p.project.name + (p.project.owner || '')).toLowerCase().includes(k))
  );
  const memberGroup = (name?: string) => data.members.find((m) => m.name === name)?.group;

  const exportCsv = () => {
    const head = ['项目名称', '产品线', '负责人', '阶段', '进度', '状态', '开始', '结束', '下一里程碑', '计划日期', '最近更新'];
    const esc = (s: string | number) => '"' + String(s).replace(/"/g, '""') + '"';
    const body = rows.map((p) => {
      const n = nextMilestone(p);
      return [p.project.name, p.project.line || '', p.project.owner || '', p.project.phase || '', progress(p, today) + '%', PROJECT_STATUS[projectStatus(p)].label, p.project.start, p.project.end, n?.title || '', n?.planned_date || '', lastActivity(p)];
    });
    downloadText('项目列表-' + today + '.csv', '﻿' + [head, ...body].map((r) => r.map(esc).join(',')).join('\r\n'), 'text/csv');
  };

  return (
    <Layout crumb={<Crumb items={[{ label: '项目列表' }]} />}>
      <div className="ph">
        <h1>项目列表</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="b" onClick={exportCsv}>导出 Excel（CSV）</button>
          <button type="button" className="b" onClick={() => setShowImport(true)}>从数据导入</button>
          <button type="button" className="b p" onClick={() => setShowNew(true)}>+ 新建项目</button>
        </div>
      </div>

      <div className="pn filters">
        <label className="fl" style={{ flex: '2 1 220px' }}>项目名称 / 负责人<input type="search" placeholder="输入关键词" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <label className="fl" style={{ flex: '1 1 140px' }}>状态
          <select value={fs} onChange={(e) => setFs(e.target.value as ProjectStatus | '')}>
            <option value="">全部</option>
            {Object.entries(PROJECT_STATUS).map(([k2, v]) => <option key={k2} value={k2}>{v.label}</option>)}
          </select>
        </label>
        <label className="fl" style={{ flex: '1 1 140px' }}>产品线
          <select value={fl} onChange={(e) => setFl(e.target.value)}>
            <option value="">全部</option>
            {lines.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <button type="button" className="b" onClick={() => { setQ(''); setFs(''); setFl(''); }}>重置</button>
      </div>

      <section className="pn">
        <div className="tw">
          <table>
            <thead><tr><th>项目名称</th><th>产品线</th><th>负责人</th><th>阶段</th><th>进度</th><th>状态</th><th>周期</th><th>下一里程碑</th><th>最近更新</th><th>操作</th></tr></thead>
            <tbody>
              {rows.map((p) => {
                const st = projectStatus(p);
                const n = nextMilestone(p);
                const link = '/projects/' + encodeURIComponent(p.project.id);
                return (
                  <tr key={p.project.id} className="nwrow">
                    <td><Link to={link} style={{ fontWeight: 600 }}>{p.project.name}</Link></td>
                    <td>{p.project.line || '—'}</td>
                    <td>{p.project.owner ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Avatar name={p.project.owner} group={memberGroup(p.project.owner)} />{p.project.owner}</span> : '—'}</td>
                    <td>{p.project.phase || '—'}</td>
                    <td><Bar pct={progress(p, today)} color={PROJECT_STATUS[st].dot} /></td>
                    <td><StatusTag status={st} /></td>
                    <td className="muted num">{period(p.project.start, p.project.end, today)}</td>
                    <td>{n ? n.title + ' ' + md(n.planned_date) : '—'}</td>
                    <td className="muted">{relDay(lastActivity(p), today)}</td>
                    <td><Link to={link}>查看</Link> <span style={{ color: '#C9CDD4' }}>|</span> <Link to={'/sync?p=' + encodeURIComponent(p.project.id)}>更新进展</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <Empty>没有符合条件的项目</Empty>}
        <div style={{ padding: '12px 18px' }} className="muted">共 {rows.length} 个项目</div>
      </section>

      {showNew && <NewProject lines={lines} onClose={() => setShowNew(false)} />}
      {showImport && <ImportProject onClose={() => setShowImport(false)} />}
    </Layout>
  );
}

function NewProject({ lines, onClose }: { lines: string[]; onClose: () => void }) {
  const { data, mutate, me } = useData();
  const nav = useNavigate();
  const today = todayIso();
  const [f, setF] = useState({ name: '', line: lines[0] || '', owner: me || data.members[0]?.name || '', start: today, end: addDays(today, 60), goalTitle: '', goal: '' });
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => { setErr(''); setF({ ...f, [k]: e.target.value }); };
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) return setErr('请填写项目名称');
    if (f.end <= f.start) return setErr('计划结束需要晚于开始日期');
    const r = await mutate(() => api.createProject(f), '项目已创建');
    if (r) nav('/projects/' + encodeURIComponent(r.project.id));
  };
  return (
    <Modal title="新建项目" onClose={onClose}>
      <form onSubmit={create}>
        <div className="mbody g2">
          <label className="fl" style={{ gridColumn: '1 / -1' }}>项目名称<input type="text" autoFocus placeholder="例如：客服知识运营后台" value={f.name} onChange={set('name')} /></label>
          <label className="fl">产品线
            <input type="text" list="new-lines" value={f.line} onChange={set('line')} />
            <datalist id="new-lines">{lines.map((l) => <option key={l} value={l} />)}</datalist>
          </label>
          <label className="fl">负责人
            <input type="text" list="new-owners" value={f.owner} onChange={set('owner')} />
            <datalist id="new-owners">{data.members.map((m) => <option key={m.id} value={m.name} />)}</datalist>
          </label>
          <label className="fl">开始日期（鱼尾）<input type="date" value={f.start} onChange={set('start')} /></label>
          <label className="fl">计划结束（鱼头）<input type="date" value={f.end} onChange={set('end')} /></label>
          <label className="fl" style={{ gridColumn: '1 / -1' }}>最终目标（写在鱼头下，几个字）<input type="text" placeholder="例如：全量发布" value={f.goalTitle} onChange={set('goalTitle')} /></label>
          <label className="fl" style={{ gridColumn: '1 / -1' }}>目标说明<textarea rows={3} placeholder="一句话说明要达成的结果，最好可衡量" value={f.goal} onChange={set('goal')} /></label>
          {err && <div className="alert" style={{ gridColumn: '1 / -1' }}>{err}</div>}
        </div>
        <div className="mfoot">
          <button type="button" className="b" onClick={onClose}>取消</button>
          <button type="submit" className="b p">创建</button>
        </div>
      </form>
    </Modal>
  );
}

function ImportProject({ onClose }: { onClose: () => void }) {
  const { mutate } = useData();
  const nav = useNavigate();
  const [text, setText] = useState('');
  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setText(await file.text());
  };
  const go = async () => {
    const r = await mutate(() => api.importNewProject(text), '已导入');
    if (r) nav('/projects/' + encodeURIComponent(r.project.id));
  };
  return (
    <Modal title="从数据导入项目" width={720} onClose={onClose} sub="粘贴一份鱼骨图 JSON 或 YAML（格式见仓库 docs/fishbone.example.yaml），或选择文件，会新建一个项目。">
      <div className="mbody">
        <input type="file" accept=".json,.yaml,.yml,application/json,text/yaml" onChange={pickFile} />
        <textarea className="code" aria-label="鱼骨图数据" spellCheck={false} value={text} onChange={(e) => setText(e.target.value)} placeholder={'version: 1\nproject:\n  name: 新项目\n  start: "2026-11-01"\n  end: "2027-01-31"\nmilestones: []\nupdates: []'} />
      </div>
      <div className="mfoot">
        <button type="button" className="b" onClick={onClose}>取消</button>
        <button type="button" className="b p" disabled={!text.trim()} onClick={go}>导入</button>
      </div>
    </Modal>
  );
}
