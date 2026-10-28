// 「写进展」表单：普通进展会在主干上多一个亮点，里程碑会长出一根骨头。项目页和进展同步页共用。
import { useState } from 'react';
import { api } from '../api';
import { useData } from '../store';
import { DATE_RE, todayIso } from '../lib/date';
import type { Fishbone, MilestoneStatus, UpdateStatus } from '../types';

const BLANK = { title: '', date: '', content: '', status: 'normal' as UpdateStatus, risk: '', mstatus: 'done' as MilestoneStatus, attTitle: '', attUrl: '' };

export function WriteForm({
  projects, fixedProjectId, defaultProjectId, defaultDate, onPosted
}: {
  projects: Fishbone[];
  fixedProjectId?: string;
  defaultProjectId?: string;
  defaultDate?: string;
  onPosted?: (r: { kind: 'update' | 'milestone'; id: string; date: string; projectId: string }) => void;
}) {
  const { mutate, me } = useData();
  const [type, setType] = useState<'update' | 'milestone'>('update');
  const [f, setF] = useState(BLANK);
  const [pid, setPid] = useState(fixedProjectId || defaultProjectId || '');
  const [err, setErr] = useState('');
  const isM = type === 'milestone';
  const date = f.date || defaultDate || todayIso();
  const set = (k: keyof typeof BLANK) => (e: { target: { value: string } }) => {
    setErr('');
    setF({ ...f, [k]: e.target.value });
  };
  const projectId = fixedProjectId || pid;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return setErr('请选择项目');
    if (!DATE_RE.test(date)) return setErr('请填写日期');
    if (isM) {
      if (!f.title.trim()) return setErr('请填写里程碑名称');
      const atts = f.attTitle.trim() || f.attUrl.trim() ? [{ title: f.attTitle.trim() || f.attUrl.trim(), url: f.attUrl.trim(), type: 'doc' as const }] : [];
      const r = await mutate(
        () => api.addMilestone(projectId, {
          title: f.title.trim(), planned_date: date, status: f.mstatus, owner: me, summary: f.content.trim(), side: 'auto', attachments: atts,
          ...(f.mstatus === 'done' ? { done_date: date } : {})
        }),
        '已添加里程碑'
      );
      if (r) {
        setF({ ...BLANK, mstatus: f.mstatus });
        onPosted?.({ kind: 'milestone', id: r.id, date, projectId });
      }
    } else {
      if (!f.title.trim() && !f.content.trim()) return setErr('请填写进展内容');
      const r = await mutate(
        () => api.addUpdate(projectId, {
          date, author: me, title: f.title.trim() || f.content.trim().slice(0, 16), content: f.content.trim(), status: f.status, risk: f.risk.trim(), attachments: []
        }),
        '已提交进展'
      );
      if (r) {
        setF({ ...BLANK, status: f.status });
        onPosted?.({ kind: 'update', id: r.id, date, projectId });
      }
    }
  };

  return (
    <form className="pn" onSubmit={submit} style={{ flex: '999 1 480px', minWidth: 0 }}>
      <div className="pnh">
        <h2>写进展</h2>
        <div className="seg" role="group" aria-label="记录类型">
          <button type="button" className={isM ? '' : 'on'} aria-pressed={!isM} onClick={() => setType('update')}>普通进展</button>
          <button type="button" className={isM ? 'on' : ''} aria-pressed={isM} onClick={() => setType('milestone')}>里程碑</button>
        </div>
      </div>
      <div className="grid-auto" style={{ padding: '16px 18px' }}>
        {!fixedProjectId && (
          <label className="fl" style={{ gridColumn: '1 / -1' }}>
            项目
            <select value={pid} onChange={(e) => { setPid(e.target.value); setErr(''); }}>
              <option value="">请选择项目</option>
              {projects.filter((p) => p.project.status !== 'done').map((p) => <option key={p.project.id} value={p.project.id}>{p.project.name}</option>)}
            </select>
          </label>
        )}
        <label className="fl">
          {isM ? '里程碑名称（会写在骨头卡片上）' : '标题（可选）'}
          <input type="text" placeholder={isM ? '例如：灰度上线' : '例如：缓存优化完成'} value={f.title} onChange={set('title')} />
        </label>
        <label className="fl">
          日期
          <input type="date" value={date} onChange={set('date')} />
        </label>
        <label className="fl" style={{ gridColumn: '1 / -1' }}>
          {isM ? '说明 / 完成情况' : '进展内容'}
          <textarea rows={3} placeholder="这次做了什么、结果如何、下一步是什么" value={f.content} onChange={set('content')} />
        </label>
        {isM ? (
          <>
            <label className="fl">
              里程碑状态
              <select value={f.mstatus} onChange={set('mstatus')}>
                <option value="done">已完成（实线骨头）</option>
                <option value="in_progress">进行中</option>
                <option value="planned">计划中（虚线骨头）</option>
              </select>
            </label>
            <label className="fl">
              附件标题（可选）
              <input type="text" placeholder="例如：灰度复盘报告" value={f.attTitle} onChange={set('attTitle')} />
            </label>
            <label className="fl" style={{ gridColumn: '1 / -1' }}>
              附件链接（可选）
              <input type="url" placeholder="https://" value={f.attUrl} onChange={set('attUrl')} />
            </label>
          </>
        ) : (
          <>
            <label className="fl">
              状态
              <select value={f.status} onChange={set('status')}>
                <option value="normal">正常</option>
                <option value="risk">有风险</option>
                <option value="blocked">受阻</option>
              </select>
            </label>
            <label className="fl">
              风险 / 需要支持（可选）
              <input type="text" placeholder="需要谁、在什么时间前做什么" value={f.risk} onChange={set('risk')} />
            </label>
          </>
        )}
        {err && <div className="alert" style={{ gridColumn: '1 / -1' }}>{err}</div>}
        <div style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="muted">
            {isM ? '提交后在对应日期长出一根骨头，附件可以之后点开骨头继续添加。' : '提交后主干上多一个亮点，点开可看详情和修改。'}
            {me ? ' 填写人：' + me : ' 右上角选择「我是谁」后会自动带上填写人。'}
          </span>
          <button type="submit" className="b p">{isM ? '添加里程碑' : '提交进展'}</button>
        </div>
      </div>
    </form>
  );
}
