import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api } from '../api';
import { useData } from '../store';
import { Crumb, Layout } from '../components/Layout';
import { Avatar, DeleteButton, Empty, Modal } from '../components/ui';
import { md, slash, todayIso } from '../lib/date';
import { GROUPS, allUpdates, memberProjects, memberWeekUpdates } from '../lib/derive';
import type { Member } from '../types';

export function Members() {
  const { data } = useData();
  const [params, setParams] = useSearchParams();
  const [group, setGroup] = useState('全部');
  const [editing, setEditing] = useState<Partial<Member> | null>(null);
  const today = todayIso();
  const members = data.members;

  useEffect(() => {
    document.title = data.settings.teamName + ' · 成员';
  }, [data.settings.teamName]);

  const groups = ['全部', ...new Set([...GROUPS, ...members.map((m) => m.group).filter(Boolean)])];
  const rows = members.filter((m) => group === '全部' || m.group === group);
  const cur = members.find((m) => m.id === params.get('m')) || rows[0] || members[0];
  const pick = (m: Member) => setParams({ m: m.id }, { replace: true });

  return (
    <Layout crumb={<Crumb items={[{ label: '成员' }]} />}>
      <div className="ph">
        <div>
          <h1>成员</h1>
          <div className="muted" style={{ marginTop: 4 }}>共 {members.length} 人 · 点击姓名查看详情</div>
        </div>
        <button type="button" className="b p" onClick={() => setEditing({ group: group === '全部' ? '' : group, skills: [] })}>+ 添加成员</button>
      </div>

      <div className="row">
        <section className="pn" style={{ flex: '999 1 560px', minWidth: 0 }}>
          <div className="tabs" role="tablist">
            {groups.map((g) => (
              <button key={g} type="button" role="tab" aria-selected={group === g} className={group === g ? 'on' : ''} onClick={() => setGroup(g)}>
                {g} {g === '全部' ? members.length : members.filter((m) => m.group === g).length}
              </button>
            ))}
          </div>
          <div className="tw">
            <table>
              <thead><tr><th>成员</th><th>职能组</th><th>负责项目</th><th>本周进展</th><th>入职时间</th></tr></thead>
              <tbody>
                {rows.map((m) => {
                  const n = memberWeekUpdates(m, data.projects, today).length;
                  return (
                    <tr key={m.id} className={'nwrow' + (cur?.id === m.id ? ' selrow' : '')}>
                      <td>
                        <button type="button" className="rowbtn" onClick={() => pick(m)}>
                          <Avatar name={m.name} group={m.group} size={32} />
                          <span><span className="nm">{m.name}</span><span className="muted">{m.role}</span></span>
                        </button>
                      </td>
                      <td>{m.group || '—'}</td>
                      <td><span className="chiprow">{memberProjects(m, data.projects).map((p) => <span key={p.project.id} className="chip">{p.project.name}</span>)}</span></td>
                      <td><span className="st" style={n ? { background: '#E7F6EE', color: '#0F6A3B' } : { background: '#FDECEC', color: '#A1201A' }}>{n ? '已提交 ' + n + ' 条' : '未提交'}</span></td>
                      <td className="muted">{slash(m.since) || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length === 0 && <Empty>这个分组还没有成员</Empty>}
          </div>
        </section>

        {cur && <MemberCard m={cur} onEdit={() => setEditing(cur)} />}
      </div>

      {editing && <MemberForm init={editing} onClose={() => setEditing(null)} onSaved={(m) => { setEditing(null); pick(m); }} />}
    </Layout>
  );
}

function MemberCard({ m, onEdit }: { m: Member; onEdit: () => void }) {
  const { data } = useData();
  const projects = memberProjects(m, data.projects);
  const last = allUpdates(data.projects).find((u) => u.author === m.name);
  return (
    <aside className="pn" style={{ flex: '1 1 300px', minWidth: 0 }} aria-live="polite">
      <div style={{ padding: 20, display: 'flex', gap: 14, alignItems: 'center', borderBottom: '1px solid #F0F1F3' }}>
        <Avatar name={m.name} group={m.group} size={56} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{m.name}</div>
          <div className="muted" style={{ marginTop: 2 }}>{[m.role, m.group].filter(Boolean).join(' · ')}</div>
        </div>
        <button type="button" className="b sm" onClick={onEdit}>编辑</button>
      </div>
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div><div className="muted b6">个人简介</div><p style={{ margin: '6px 0 0', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{m.bio || '—'}</p></div>
        {m.skills.length > 0 && (
          <div><div className="muted b6">擅长</div><div className="chiprow" style={{ marginTop: 6 }}>{m.skills.map((s) => <span key={s} className="chip">{s}</span>)}</div></div>
        )}
        <div>
          <div className="muted b6">负责 / 参与项目</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
            {projects.length === 0 && <span className="muted">—</span>}
            {projects.map((p) => (
              <Link key={p.project.id} to={'/projects/' + encodeURIComponent(p.project.id)}>
                {p.project.name}{p.project.owner === m.name ? '（负责人）' : ''}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <div className="muted b6">最近一次进展</div>
          <p style={{ margin: '6px 0 0', lineHeight: 1.7, color: '#4E5969' }}>
            {last ? <>{md(last.date)} · {last.projectName}：{last.content || last.title}</> : '还没有提交过进展'}
          </p>
        </div>
        <div className="g2">
          <div><div className="muted">邮箱</div><div style={{ marginTop: 2, wordBreak: 'break-all' }}>{m.email ? <a href={'mailto:' + m.email}>{m.email}</a> : '—'}</div></div>
          <div><div className="muted">所在地</div><div style={{ marginTop: 2 }}>{m.city || '—'}</div></div>
        </div>
      </div>
    </aside>
  );
}

function MemberForm({ init, onClose, onSaved }: { init: Partial<Member>; onClose: () => void; onSaved: (m: Member) => void }) {
  const { mutate } = useData();
  const [f, setF] = useState({ name: '', role: '', group: '', since: '', city: '', email: '', bio: '', ...init, skillsText: (init.skills || []).join('、') });
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => { setErr(''); setF({ ...f, [k]: e.target.value }); };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) return setErr('请填写姓名');
    const { skillsText, ...rest } = f;
    const r = await mutate(() => api.saveMember({ ...rest, skills: skillsText.split(/[,，、]+/).map((s) => s.trim()).filter(Boolean) }), '已保存');
    if (r) onSaved(r);
  };
  const del = async () => {
    if (init.id && (await mutate(() => api.deleteMember(init.id!), '已删除')) !== false) onClose();
  };
  return (
    <Modal title={init.id ? '编辑成员' : '添加成员'} onClose={onClose}>
      <form onSubmit={save}>
        <div className="mbody g2">
          <label className="fl">姓名<input type="text" autoFocus value={f.name} onChange={set('name')} /></label>
          <label className="fl">职位<input type="text" placeholder="例如：后端研发" value={f.role} onChange={set('role')} /></label>
          <label className="fl">职能组
            <input type="text" list="groups" value={f.group} onChange={set('group')} />
            <datalist id="groups">{GROUPS.map((g) => <option key={g} value={g} />)}</datalist>
          </label>
          <label className="fl">入职时间<input type="month" value={f.since} onChange={set('since')} /></label>
          <label className="fl">邮箱<input type="email" value={f.email} onChange={set('email')} /></label>
          <label className="fl">所在地<input type="text" value={f.city} onChange={set('city')} /></label>
          <label className="fl" style={{ gridColumn: '1 / -1' }}>擅长（用顿号或逗号分隔）<input type="text" placeholder="例如：Go、分布式系统" value={f.skillsText} onChange={set('skillsText')} /></label>
          <label className="fl" style={{ gridColumn: '1 / -1' }}>个人简介<textarea rows={4} placeholder="一两句话说明背景与目前负责的方向，对外展示时会看到" value={f.bio} onChange={set('bio')} /></label>
          <div className="muted" style={{ gridColumn: '1 / -1', lineHeight: 1.6 }}>负责的项目会按项目的「负责人 / 成员」自动关联，不用在这里填。</div>
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
