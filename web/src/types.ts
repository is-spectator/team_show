export type Status = 'on_track' | 'at_risk' | 'delayed' | 'done';
export type ItemType = 'milestone' | 'update';

export interface DocLink {
  title: string;
  url: string;
}

/** 一根鱼骨：里程碑是实线骨，进展是虚线骨 */
export interface Item {
  id: string;
  type: ItemType;
  date: string;
  title: string;
  author: string;
  text: string;
  links: DocLink[];
}

export interface Project {
  id: string;
  name: string;
  owner: string;
  members: string[];
  start: string;
  end: string;
  status: Status;
  fish: string;
  rider: string;
  goal: string;
  goal_detail: string;
  /** 示例项目：首页切到「示例项目」才显示 */
  sample: boolean;
  items: Item[];
}

export type ProjectInfo = Omit<Project, 'id' | 'items'>;

export interface Settings {
  teamName: string;
}

export interface Bootstrap {
  settings: Settings;
  authRequired: boolean;
  projects: Project[];
}
