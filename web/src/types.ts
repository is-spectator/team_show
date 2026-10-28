// 与 shared/fishbone.schema.json 对应的类型。允许自定义字段，所以都带索引签名。

export type AttachmentType = 'doc' | 'sheet' | 'slide' | 'design' | 'link' | 'file';
export type ProjectStatus = 'on_track' | 'at_risk' | 'delayed' | 'done';
export type MilestoneStatus = 'planned' | 'in_progress' | 'done' | 'delayed';
export type UpdateStatus = 'normal' | 'risk' | 'blocked';

export interface Attachment {
  title: string;
  url?: string;
  type?: AttachmentType;
}

export interface ProjectInfo {
  id: string;
  name: string;
  owner?: string;
  members?: string[];
  start: string;
  end: string;
  status?: ProjectStatus;
  goal?: { title: string; description?: string };
  line?: string;
  phase?: string;
  [k: string]: unknown;
}

export interface Milestone {
  id: string;
  title: string;
  planned_date: string;
  done_date?: string;
  status: MilestoneStatus;
  owner?: string;
  summary?: string;
  side?: 'auto' | 'up' | 'down';
  attachments?: Attachment[];
  [k: string]: unknown;
}

export interface Update {
  id: string;
  date: string;
  author?: string;
  title: string;
  content?: string;
  status?: UpdateStatus;
  risk?: string;
  resolved?: boolean;
  attachments?: Attachment[];
  [k: string]: unknown;
}

export interface Fishbone {
  version: 1;
  project: ProjectInfo;
  milestones: Milestone[];
  updates: Update[];
  [k: string]: unknown;
}

export interface Member {
  id: string;
  name: string;
  role: string;
  group: string;
  since: string;
  city: string;
  email: string;
  skills: string[];
  bio: string;
}

export interface Doc {
  id: string;
  title: string;
  url: string;
  category: string;
  project: string;
  owner: string;
  source: string;
  updated: string;
  pinned: boolean;
  note: string;
}

export interface Settings {
  teamName: string;
  wikiSource: string;
}

export interface Bootstrap {
  settings: Settings;
  authRequired: boolean;
  projects: Fishbone[];
  members: Member[];
  docs: Doc[];
}
