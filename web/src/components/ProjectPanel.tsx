import { useState } from 'react';
import { ErrorText } from './ui';
import { FISH_NAMES, RIDER_NAMES, STATUS } from '../lib/fish';
import type { Project, ProjectInfo, Status } from '../types';

interface Props {
  draft: Project;
  onDraft: (p: Project) => void;
  onSave: (info: Partial<ProjectInfo>) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}

export function ProjectPanel({ draft, onDraft, onSave, onDelete, onClose }: Props) {
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [delArm, setDelArm] = useState(false);
  const [members, setMembers] = useState(draft.members.join('、'));
  const set = (patch: Partial<Project>) => {
    setErr('');
    onDraft({ ...draft, ...patch });
  };

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
    if (!draft.name.trim()) return setErr('请填写项目名称');
    if (!draft.start || !draft.end) return setErr('请选择开始和交付日期');
    if (draft.end <= draft.start) return setErr('交付日期需要晚于开始日期');
    const { id: _id, items: _items, ...info } = draft;
    run(() => onSave({ ...info, members: members.split(/[,，、\s]+/).map((s) => s.trim()).filter(Boolean) }));
  };

  return (
    <section className="panel" aria-label="编辑项目">
      <div className="panel-hd">
        <h3>编辑项目</h3>
        <div className="row8">
          <button type="button" className={'btn ' + (delArm ? 'danger-on' : 'danger')} disabled={busy} onClick={() => (delArm ? run(onDelete) : setDelArm(true))}>
            {delArm ? '确认删除整个项目' : '删除项目'}
          </button>
          <button type="button" className="btn" disabled={busy} onClick={onClose}>取消</button>
          <button type="button" className="btn dark" disabled={busy} onClick={done}>{busy ? '保存中…' : '完成'}</button>
        </div>
      </div>
      <div className="grid-fields">
        <label className="fld wide">项目名称
          <input type="text" value={draft.name} onChange={(e) => set({ name: e.target.value })} maxLength={40} />
        </label>
        <label className="fld">开始（鱼尾）
          <input type="date" value={draft.start} onChange={(e) => set({ start: e.target.value })} />
        </label>
        <label className="fld">交付（鱼头）
          <input type="date" value={draft.end} onChange={(e) => set({ end: e.target.value })} />
        </label>
        <label className="fld">负责人
          <input type="text" value={draft.owner} onChange={(e) => set({ owner: e.target.value })} />
        </label>
        <label className="fld">成员（用顿号或逗号隔开）
          <input type="text" value={members} onChange={(e) => setMembers(e.target.value)} />
        </label>
        <label className="fld">状态
          <select value={draft.status} onChange={(e) => set({ status: e.target.value as Status })}>
            {(Object.keys(STATUS) as Status[]).map((k) => <option key={k} value={k}>{STATUS[k].label}</option>)}
          </select>
        </label>
        <label className="fld">鱼的样子
          <select value={draft.fish} onChange={(e) => set({ fish: e.target.value })}>
            {FISH_NAMES.map((n) => <option key={n}>{n}</option>)}
          </select>
        </label>
        <label className="fld">进度上的小人
          <select value={draft.rider} onChange={(e) => set({ rider: e.target.value })}>
            {RIDER_NAMES.map((n) => <option key={n}>{n}</option>)}
          </select>
        </label>
        <label className="fld">目标（写在鱼头下）
          <input type="text" value={draft.goal} onChange={(e) => set({ goal: e.target.value })} maxLength={20} />
        </label>
        <label className="fld wide">目标说明
          <textarea rows={2} value={draft.goal_detail} onChange={(e) => set({ goal_detail: e.target.value })} />
        </label>
      </div>
      {draft.status === 'done' && <p className="muted">已交付的项目，小人会换成举旗冲线的样子。</p>}
      <ErrorText>{err}</ErrorText>
    </section>
  );
}
