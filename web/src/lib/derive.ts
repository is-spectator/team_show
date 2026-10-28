// 从鱼骨图数据推导出列表、工作台需要的统计。所有展示用的数字都在这里算，页面只负责画。
import type { Fishbone, Milestone, ProjectStatus, Update, UpdateStatus, Member, AttachmentType } from '../types';
import { DATE_RE, diffDays, todayIso, weekRange } from './date';

export const PROJECT_STATUS: Record<ProjectStatus, { label: string; bg: string; fg: string; dot: string }> = {
  on_track: { label: '正常', bg: '#E7F6EE', fg: '#0F6A3B', dot: '#16A34A' },
  at_risk: { label: '有风险', bg: '#FFF3E5', fg: '#8A4504', dot: '#E07B10' },
  delayed: { label: '已延期', bg: '#FDECEC', fg: '#A1201A', dot: '#D92D20' },
  done: { label: '已完成', bg: '#F2F3F5', fg: '#4E5969', dot: '#86909C' }
};

export const UPDATE_STATUS: Record<UpdateStatus, { label: string; color: string; bg: string; fg: string }> = {
  normal: { label: '正常', color: '#2B5CE6', bg: '#EEF2FF', fg: '#1F3BA6' },
  risk: { label: '有风险', color: '#E07B10', bg: '#FFF3E5', fg: '#8A4504' },
  blocked: { label: '受阻', color: '#D92D20', bg: '#FDECEC', fg: '#A1201A' }
};

export const MILESTONE_STATUS = {
  planned: '计划中',
  in_progress: '进行中',
  done: '已完成',
  delayed: '已延期'
} as const;

export const ATTACHMENT_TYPE: Record<AttachmentType, string> = {
  doc: '文档', sheet: '表格', slide: '演示', design: '设计稿', link: '链接', file: '文件'
};

export const LINES = ['客服', '数据', '知识', '公共'];
export const GROUPS = ['管理', '产品', '研发', '算法', '设计'];
export const DOC_CATEGORIES = ['入职指南', '项目文档', '技术规范', '会议纪要', '流程制度'];

const GROUP_COLOR: Record<string, { background: string; color: string }> = {
  管理: { background: '#E8EEFF', color: '#1F3BA6' },
  产品: { background: '#FCEBDD', color: '#8A3B0A' },
  研发: { background: '#E7F6EE', color: '#0F6A3B' },
  算法: { background: '#F1E8F7', color: '#5E2A7E' },
  设计: { background: '#FBE7EE', color: '#8A1F45' }
};
const PALETTE = Object.values(GROUP_COLOR);

export function avatarColor(group?: string, name = '') {
  if (group && GROUP_COLOR[group]) return GROUP_COLOR[group];
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export const byDate = <T>(key: (x: T) => string, desc = false) => (a: T, b: T) => {
  const r = key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0;
  return desc ? -r : r;
};

export const projectStatus = (f: Fishbone): ProjectStatus => f.project.status || 'on_track';

/** 进度 = 已完成里程碑占比；没有里程碑时用时间进度；已完成项目恒为 100。 */
export function progress(f: Fishbone, today = todayIso()): number {
  if (projectStatus(f) === 'done') return 100;
  const ms = f.milestones;
  if (ms.length) return Math.round((ms.filter((m) => m.status === 'done').length / ms.length) * 100);
  return timeProgress(f, today);
}

export function timeProgress(f: Fishbone, today = todayIso()): number {
  const total = Math.max(1, diffDays(f.project.start, f.project.end));
  return Math.round((Math.max(0, Math.min(total, diffDays(f.project.start, today))) / total) * 100);
}

export function nextMilestone(f: Fishbone): Milestone | undefined {
  return f.milestones.filter((m) => m.status !== 'done' && DATE_RE.test(m.planned_date)).sort(byDate((m) => m.planned_date))[0];
}

export function lastUpdate(f: Fishbone): Update | undefined {
  return [...f.updates].sort(byDate((u) => u.date, true))[0];
}

/** 最近一次动态（进展或里程碑完成）的日期 */
export function lastActivity(f: Fishbone): string {
  const dates = [...f.updates.map((u) => u.date), ...f.milestones.map((m) => m.done_date || '')].filter(Boolean).sort();
  return dates[dates.length - 1] || '';
}

export function updatedThisWeek(f: Fishbone, today = todayIso()): boolean {
  const [mon, sun] = weekRange(today);
  return f.updates.some((u) => u.date >= mon && u.date <= sun);
}

export interface FlatUpdate extends Update {
  projectId: string;
  projectName: string;
}

export function allUpdates(projects: Fishbone[]): FlatUpdate[] {
  return projects
    .flatMap((f) => f.updates.map((u) => ({ ...u, projectId: f.project.id, projectName: f.project.name })))
    .sort(byDate((u) => u.date, true));
}

export interface FlatMilestone extends Milestone {
  projectId: string;
  projectName: string;
}

export function allMilestones(projects: Fishbone[]): FlatMilestone[] {
  return projects.flatMap((f) => f.milestones.map((m) => ({ ...m, projectId: f.project.id, projectName: f.project.name })));
}

/** 成员负责或参与的项目 */
export function memberProjects(m: Member, projects: Fishbone[]): Fishbone[] {
  return projects.filter((f) => f.project.owner === m.name || (f.project.members || []).includes(m.name));
}

export function memberWeekUpdates(m: Member, projects: Fishbone[], today = todayIso()): FlatUpdate[] {
  const [mon, sun] = weekRange(today);
  return allUpdates(projects).filter((u) => u.author === m.name && u.date >= mon && u.date <= sun);
}

export const isUrl = (s?: string) => !!s && /^https?:\/\//i.test(s);
