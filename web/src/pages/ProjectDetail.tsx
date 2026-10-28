import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api } from '../api';
import { useData } from '../store';
import { Crumb, Layout } from '../components/Layout';
import { FishboneChart, fishboneGeometry, milestoneVisual, type Selection } from '../components/Fishbone';
import { WriteForm } from '../components/WriteForm';
import { AttachmentEditor, DeleteButton, Drawer, Icon, Modal, StatusTag } from '../components/ui';
import { DATE_RE, addDays, md, slash, todayIso } from '../lib/date';
import { LINES, UPDATE_STATUS, byDate, projectStatus } from '../lib/derive';
import type { Attachment, Fishbone, Milestone, ProjectInfo, Update } from '../types';

export function ProjectDetail() {
  const { id = '' } = useParams();
  const { data } = useData();
  const doc = data.projects.find((p) => p.project.id === id);
  if (!doc) {
    return (
      <Layout crumb={<Crumb items={[{ label: '项目列表', to: '/projects' }, { label: '未找到' }]} />}>
        <div className="pn empty">这个项目不存在或已被删除。<Link to="/projects">回到项目列表</Link></div>
      </Layout>
    );
  }
  return <ProjectView key={id} doc={doc} />;
}

type Edit =
  | { kind: 'milestone'; draft: Milestone }
  | { kind: 'update'; draft: Update }
  | { kind: 'project'; draft: ProjectInfo & { membersText: string; goalTitle: string; goalDesc: string } };

function ProjectView({ doc }: { doc: Fishbone }) {
  const { data } = useData();
  const P = doc.project;
  const today = todayIso();
  const [simIso, setSimIso] = useState(today);
  const [edit, setEdit] = useState<Edit | null>(null);
  const [io, setIo] = useState(false);
  const [newId, setNewId] = useState<string | null>(null);
  const { total, simDay, simC } = fishboneGeometry(doc, simIso);

  useEffect(() => {
    document.title = P.name + ' · ' + data.settings.teamName;
  }, [P.name, data.settings.teamName]);

  const openM = (m: Milestone) => setEdit({ kind: 'milestone', draft: { owner: '', summary: '', side: 'auto', ...m, attachments: [...(m.attachments || [])] } });
  const openU = (u: Update) => setEdit({ kind: 'update', draft: { author: '', content: '', risk: '', status: 'normal', ...u, attachments: [...(u.attachments || [])] } });
  const openP = () =>
    setEdit({ kind: 'project', draft: { ...P, membersText: (P.members || []).join('、'), goalTitle: P.goal?.title || '', goalDesc: P.goal?.description || '' } });

  const selected: Selection | null = edit ? { kind: edit.kind, id: edit.kind === 'project' ? null : edit.draft.id } : null;

  const msVis = doc.milestones.map((m) => ({ m, ...milestoneVisual(m, simC) }));
  const msDone = msVis.filter((v) => v.vs === 'done').length;
  const visU = doc.updates.filter((u) => u.date <= simC);
  const recs = [
    ...visU.map((u) => ({ key: 'u' + u.id, kind: 'update' as const, id: u.id, date: u.date, title: u.title, sub: md(u.date) + ' · 进展 · ' + (u.author || '—') + ((u.attachments || []).length ? ' · ' + u.attachments!.length + ' 个附件' : ''), color: (UPDATE_STATUS[u.status || 'normal'] || UPDATE_STATUS.normal).color, open: () => openU(u) })),
    ...msVis.filter((v) => v.vs === 'done').map((v) => ({ key: 'm' + v.m.id, kind: 'milestone' as const, id: v.m.id, date: v.date, title: v.m.title, sub: md(v.date) + ' · 里程碑完成 · ' + (v.m.owner || '—') + ((v.m.attachments || []).length ? ' · ' + v.m.attachments!.length + ' 个附件' : ''), color: '', open: () => openM(v.m) }))
  ].sort(byDate((r) => r.date, true));

  const st = projectStatus(doc);
  const meta = ['负责人 ' + (P.owner || '—'), (P.members || []).length ? '成员 ' + P.members!.join('、') : '', P.line ? '产品线 ' + P.line : '', P.phase ? '阶段 ' + P.phase : '', slash(P.start) + ' – ' + slash(P.end)].filter(Boolean).join(' · ');

  return (
    <Layout crumb={<Crumb items={[{ label: '项目列表', to: '/projects' }, { label: P.name }]} />}>
      <section className="pn" style={{ padding: '18px 22px', display: 'flex', flexWrap: 'wrap', gap: '16px 32px', alignItems: 'center' }}>
        <div style={{ flex: '999 1 280px', minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 20, margin: 0 }}>{P.name}</h1>
            <StatusTag status={st} />
          </div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.6 }}>{meta}</div>
          {P.goal?.description && <div style={{ marginTop: 4, color: '#4E5969' }}>目标：{P.goal.description}</div>}
        </div>
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="kv"><span className="muted">时间进度</span><span className="big">{Math.round((simDay / total) * 100)}%</span></div>
          <div className="kv"><span className="muted">里程碑</span><span className="big">{msDone}<span className="muted" style={{ fontSize: 14, fontWeight: 400 }}> / {doc.milestones.length}</span></span></div>
          <div className="kv"><span className="muted">进展记录</span><span className="big">{visU.length}</span></div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="b" onClick={() => setIo(true)}><Icon name="io" />导入 / 导出数据</button>
            <button type="button" className="b" onClick={openP}>编辑项目</button>
          </div>
        </div>
      </section>

      <section className="pn">
        <div className="pnh">
          <div>
            <h2>项目鱼骨图</h2>
            <div className="muted" style={{ marginTop: 4 }}>点骨头上的卡片或主干上的亮点，可以查看和修改；里程碑可以挂附件</div>
          </div>
          <div className="legend">
            <span className="lgd"><span className="lg-spark" style={{ background: '#2B5CE6' }} />进展</span>
            <span className="lgd"><span className="lg-spark" style={{ background: '#E07B10' }} />有风险</span>
            <span className="lgd"><span className="lg-spark" style={{ background: '#D92D20' }} />受阻</span>
            <span className="lgd"><span className="lg-bone" style={{ borderLeft: '3px solid #3B4A66' }} />已完成</span>
            <span className="lgd"><span className="lg-bone" style={{ borderLeft: '2px dashed #2B5CE6' }} />进行中</span>
            <span className="lgd"><span className="lg-bone" style={{ borderLeft: '2px dashed #B4BCCB' }} />计划</span>
            <span className="lgd"><span className="lg-bone" style={{ borderLeft: '2px dashed #D92D20' }} />延期</span>
          </div>
        </div>
        <div style={{ overflowX: 'auto', padding: '12px 16px 4px' }}>
          <FishboneChart doc={doc} simIso={simIso} selected={selected} newId={newId} onMilestone={openM} onUpdate={openU} onGoal={openP} />
        </div>
        <div className="simrow">
          <label htmlFor="sim" className="muted" style={{ whiteSpace: 'nowrap' }}>拖动查看时间推进</label>
          <input id="sim" type="range" min={0} max={total} value={simDay} onChange={(e) => setSimIso(addDays(P.start, +e.target.value))} />
          <span className="num" style={{ minWidth: 92 }}>{slash(simC)}</span>
          <button type="button" className="b" onClick={() => setSimIso(today)}>回到今天</button>
        </div>
      </section>

      <div className="row">
        <WriteForm
          projects={data.projects}
          fixedProjectId={P.id}
          defaultDate={simC}
          onPosted={(r) => {
            setNewId(r.id);
            if (r.date > simC) setSimIso(r.date);
          }}
        />
        <section className="pn" style={{ flex: '1 1 320px', minWidth: 0 }}>
          <div className="pnh"><h2>进展记录</h2><span className="muted">点击打开详情</span></div>
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {recs.length === 0 && <div className="empty muted">还没有进展，写下第一条吧。</div>}
            {recs.map((r) => (
              <button key={r.key} type="button" className={'rec' + (selected?.kind === r.kind && selected.id === r.id ? ' sel' : '')} onClick={r.open}>
                {r.kind === 'update' ? <span className="rec-dot" style={{ background: r.color }} /> : <span className="rec-bone" />}
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: 'block', fontWeight: 600 }}>{r.title}</span>
                  <span className="muted">{r.sub}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {edit && <EditDrawer doc={doc} edit={edit} setEdit={setEdit} />}
      {io && <IoModal doc={doc} onClose={() => setIo(false)} onApplied={() => { setIo(false); setSimIso(today); setNewId(null); }} />}
    </Layout>
  );
}

function EditDrawer({ doc, edit, setEdit }: { doc: Fishbone; edit: Edit; setEdit: (e: Edit | null) => void }) {
  const { mutate } = useData();
  const nav = useNavigate();
  const [err, setErr] = useState('');
  const pid = doc.project.id;
  const close = () => setEdit(null);
  const d = edit.draft as unknown as Record<string, unknown>;
  const val = (k: string) => (d[k] == null ? '' : String(d[k]));
  const on = (k: string) => (e: { target: { value: string } }) => {
    setErr('');
    setEdit({ ...edit, draft: { ...edit.draft, [k]: e.target.value } } as Edit);
  };
  const setAtts = (a: Attachment[]) => setEdit({ ...edit, draft: { ...edit.draft, attachments: a } } as Edit);

  const save = async () => {
    let ok: unknown = false;
    if (edit.kind === 'milestone') {
      const m = edit.draft;
      if (!m.title.trim()) return setErr('请填写里程碑名称');
      const done = m.status === 'done' ? m.done_date || todayIso() : '';
      const planned = DATE_RE.test(m.planned_date || '') ? m.planned_date : done;
      if (!planned) return setErr('请填写计划日期');
      const out: Milestone = { ...m, title: m.title.trim(), planned_date: planned };
      if (done) out.done_date = done;
      else delete out.done_date;
      ok = await mutate(() => api.saveMilestone(pid, out), '已保存');
    } else if (edit.kind === 'update') {
      const u = edit.draft;
      if (!u.title.trim()) return setErr('请填写标题');
      if (!DATE_RE.test(u.date || '')) return setErr('请填写日期');
      ok = await mutate(() => api.saveUpdate(pid, { ...u, title: u.title.trim() }), '已保存');
    } else {
      const { membersText, goalTitle, goalDesc, ...rest } = edit.draft;
      if (!rest.name.trim()) return setErr('请填写项目名称');
      if (!DATE_RE.test(rest.start || '') || !DATE_RE.test(rest.end || '')) return setErr('请填写开始和结束日期');
      if (rest.end <= rest.start) return setErr('结束日期需要晚于开始日期');
      const info: ProjectInfo = {
        ...rest,
        name: rest.name.trim(),
        members: membersText.split(/[,，、\s]+/).filter(Boolean),
        goal: { ...(doc.project.goal || {}), title: goalTitle.trim() || '项目目标', description: goalDesc }
      };
      ok = await mutate(() => api.patchProject(pid, info), '已保存');
    }
    if (ok !== false) close();
  };

  const del = async () => {
    if (edit.kind === 'milestone') {
      if ((await mutate(() => api.deleteMilestone(pid, edit.draft.id), '已删除')) !== false) close();
    } else if (edit.kind === 'update') {
      if ((await mutate(() => api.deleteUpdate(pid, edit.draft.id), '已删除')) !== false) close();
    } else if ((await mutate(() => api.deleteProject(pid), '项目已删除')) !== false) {
      nav('/projects');
    }
  };

  const kindLabel = edit.kind === 'milestone' ? '里程碑' : edit.kind === 'update' ? '进展' : '项目';
  const kindStyle = edit.kind === 'milestone' ? { background: '#3B4A66', color: '#FFFFFF' } : edit.kind === 'update' ? { background: '#EEF2FF', color: '#1F3BA6' } : { background: '#F2F3F5', color: '#4E5969' };
  const title = edit.kind === 'project' ? '编辑项目' : val('title') || '未命名';

  return (
    <Drawer
      title={title}
      onClose={close}
      head={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="st" style={kindStyle}>{kindLabel}</span><span className="muted">{edit.kind === 'project' ? '鱼尾、鱼头和目标' : val('id')}</span></div>}
      foot={
        <>
          <DeleteButton onConfirm={del} label={edit.kind === 'project' ? '删除项目' : '删除'} />
          <span style={{ flex: 1 }} />
          <button type="button" className="b" onClick={close}>取消</button>
          <button type="button" className="b p" onClick={save}>保存</button>
        </>
      }
    >
      {edit.kind === 'milestone' && (
        <>
          <label className="fl">里程碑名称<input type="text" value={val('title')} onChange={on('title')} /></label>
          <div className="g2">
            <label className="fl">计划日期<input type="date" value={val('planned_date')} onChange={on('planned_date')} /></label>
            <label className="fl">完成日期<input type="date" value={val('done_date')} onChange={on('done_date')} /></label>
            <label className="fl">状态
              <select value={val('status')} onChange={on('status')}>
                <option value="planned">计划中</option><option value="in_progress">进行中</option><option value="done">已完成</option><option value="delayed">已延期</option>
              </select>
            </label>
            <label className="fl">负责人<input type="text" value={val('owner')} onChange={on('owner')} /></label>
          </div>
          <label className="fl">骨头朝向
            <select value={val('side') || 'auto'} onChange={on('side')}>
              <option value="auto">自动（上下交替）</option><option value="up">朝上</option><option value="down">朝下</option>
            </select>
          </label>
          <label className="fl">说明 / 完成情况<textarea rows={4} value={val('summary')} onChange={on('summary')} /></label>
          {edit.draft.status !== 'done' && (
            <button type="button" className="b ok" style={{ alignSelf: 'flex-start' }} onClick={() => setEdit({ ...edit, draft: { ...edit.draft, status: 'done', done_date: edit.draft.done_date || todayIso() } })}>
              <Icon name="check" />标记为已完成
            </button>
          )}
          <AttachmentEditor value={edit.draft.attachments || []} onChange={setAtts} />
        </>
      )}
      {edit.kind === 'update' && (
        <>
          <label className="fl">标题<input type="text" value={val('title')} onChange={on('title')} /></label>
          <div className="g2">
            <label className="fl">日期<input type="date" value={val('date')} onChange={on('date')} /></label>
            <label className="fl">填写人<input type="text" value={val('author')} onChange={on('author')} /></label>
          </div>
          <label className="fl">状态
            <select value={val('status') || 'normal'} onChange={on('status')}>
              <option value="normal">正常</option><option value="risk">有风险</option><option value="blocked">受阻</option>
            </select>
          </label>
          <label className="fl">进展内容<textarea rows={4} value={val('content')} onChange={on('content')} /></label>
          <label className="fl">风险 / 需要支持<input type="text" value={val('risk')} onChange={on('risk')} /></label>
          {(edit.draft.status === 'risk' || edit.draft.status === 'blocked') && (
            <label className="check">
              <input type="checkbox" checked={!!edit.draft.resolved} onChange={(e) => setEdit({ ...edit, draft: { ...edit.draft, resolved: e.target.checked } })} />
              风险已处理（不再出现在工作台的「待决策 / 风险」里）
            </label>
          )}
          <AttachmentEditor value={edit.draft.attachments || []} onChange={setAtts} />
        </>
      )}
      {edit.kind === 'project' && (
        <>
          <label className="fl">项目名称<input type="text" value={val('name')} onChange={on('name')} /></label>
          <div className="g2">
            <label className="fl">负责人<input type="text" value={val('owner')} onChange={on('owner')} /></label>
            <label className="fl">项目状态
              <select value={val('status') || 'on_track'} onChange={on('status')}>
                <option value="on_track">正常</option><option value="at_risk">有风险</option><option value="delayed">已延期</option><option value="done">已完成</option>
              </select>
            </label>
            <label className="fl">开始日期（鱼尾）<input type="date" value={val('start')} onChange={on('start')} /></label>
            <label className="fl">结束日期（鱼头）<input type="date" value={val('end')} onChange={on('end')} /></label>
            <label className="fl">产品线
              <input type="text" list="lines" value={val('line')} onChange={on('line')} />
              <datalist id="lines">{LINES.map((l) => <option key={l} value={l} />)}</datalist>
            </label>
            <label className="fl">阶段<input type="text" placeholder="例如：研发" value={val('phase')} onChange={on('phase')} /></label>
          </div>
          <label className="fl">成员（用顿号或逗号分隔）<input type="text" value={val('membersText')} onChange={on('membersText')} /></label>
          <label className="fl">最终目标（写在鱼头下）<input type="text" value={val('goalTitle')} onChange={on('goalTitle')} /></label>
          <label className="fl">目标说明<textarea rows={3} value={val('goalDesc')} onChange={on('goalDesc')} /></label>
        </>
      )}
      {err && <div className="alert">{err}</div>}
    </Drawer>
  );
}

function IoModal({ doc, onClose, onApplied }: { doc: Fishbone; onClose: () => void; onApplied: () => void }) {
  const { mutate } = useData();
  const current = () => JSON.stringify(doc, null, 2);
  const [text, setText] = useState(current);
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});
  const today = todayIso();
  const template = {
    version: 1,
    project: { ...doc.project, start: today, end: addDays(today, 90), status: 'on_track', goal: { title: '项目目标', description: '' } },
    milestones: [{ id: 'm1', title: '项目立项', planned_date: today, status: 'planned', owner: '', summary: '', side: 'auto', attachments: [] }],
    updates: []
  };
  const copy = () => {
    navigator.clipboard?.writeText(text).then(
      () => setMsg({ ok: '已复制到剪贴板' }),
      () => setMsg({ err: '浏览器不允许自动复制，请在文本框里全选后手动复制' })
    );
  };
  const apply = async () => {
    const r = await mutate(() => api.replaceProject(doc.project.id, text), '已按数据重新生成鱼骨图');
    if (r) onApplied();
  };
  return (
    <Modal
      title="导入 / 导出鱼骨图数据"
      width={780}
      onClose={onClose}
      sub="下面是当前鱼骨图的 JSON 数据，可以复制或下载保存。粘贴新的 JSON 或 YAML 后点「应用」，鱼骨图会按数据重新生成。数据格式见仓库 docs/fishbone.example.yaml。"
    >
      <div className="mbody">
        <textarea className="code" aria-label="鱼骨图数据" spellCheck={false} value={text} onChange={(e) => { setText(e.target.value); setMsg({}); }} />
        {msg.err && <div className="alert">{msg.err}</div>}
        {msg.ok && <div role="status" style={{ color: '#0F6A3B' }}>{msg.ok}</div>}
      </div>
      <div className="mfoot" style={{ flexWrap: 'wrap' }}>
        <button type="button" className="b" onClick={() => { setText(JSON.stringify(template, null, 2)); setMsg({ ok: '已填入空白模板，改好后点「应用到鱼骨图」' }); }}>用空白模板</button>
        <button type="button" className="b" onClick={() => { setText(current()); setMsg({}); }}>还原为当前数据</button>
        <button type="button" className="b" onClick={copy}>复制</button>
        <a className="b" href={api.exportUrl(doc.project.id, 'json')}>下载 JSON</a>
        <a className="b" href={api.exportUrl(doc.project.id, 'yaml')}>下载 YAML</a>
        <span style={{ flex: 1 }} />
        <button type="button" className="b" onClick={onClose}>取消</button>
        <button type="button" className="b p" onClick={apply}>应用到鱼骨图</button>
      </div>
    </Modal>
  );
}
