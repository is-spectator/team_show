// 示例数据：数据库为空时写入，方便第一次打开就能看到完整效果。
// 设置环境变量 SEED=false 可以从空库开始。
import { readFileSync } from 'node:fs';

const example = JSON.parse(readFileSync(new URL('../docs/fishbone.example.json', import.meta.url), 'utf8'));

const ms = (id, title, planned_date, status, owner, extra = {}) => ({
  id, title, planned_date, status, owner, summary: '', side: 'auto', attachments: [],
  ...(status === 'done' ? { done_date: planned_date } : {}),
  ...extra
});
const up = (id, date, author, title, content, extra = {}) => ({
  id, date, author, title, content, status: 'normal', risk: '', attachments: [], ...extra
});
const project = (p, milestones, updates) => ({
  version: 1,
  project: { members: [], status: 'on_track', ...p },
  milestones,
  updates
});

export const seedProjects = [
  {
    ...example,
    project: { ...example.project, line: '客服', phase: '研发' }
  },
  project(
    { id: 'data-platform', name: '数据中台建设', owner: '孙悦', members: ['刘洋'], line: '数据', phase: '内测', start: '2026-05-10', end: '2026-12-31', status: 'at_risk', goal: { title: '全量切换', description: '所有业务报表切到中台口径' } },
    [
      ms('m1', '需求调研完成', '2026-06-01', 'done', '孙悦'),
      ms('m2', '数据接入一期', '2026-07-20', 'done', '刘洋'),
      ms('m3', '指标体系上线', '2026-09-15', 'done', '孙悦', { attachments: [{ title: '数据中台指标字典', url: 'https://example.com/docs/metrics', type: 'doc' }] }),
      ms('m4', '财务指标接入', '2026-11-05', 'in_progress', '孙悦'),
      ms('m5', '全量切换', '2026-12-15', 'planned', '孙悦')
    ],
    [
      up('u1', '2026-08-30', '刘洋', '接入 12 个业务库', '一期 12 个业务库全部接入，日更延迟小于 30 分钟。'),
      up('u2', '2026-10-27', '孙悦', '财务口径对齐', '财务口径存在分歧，已约业务方周四对齐。', { status: 'risk', risk: '财务口径对齐延后，需业务方在 11 月 1 日前确认指标定义。' })
    ]
  ),
  project(
    { id: 'qa-model', name: '客服质检模型', owner: '赵敏', line: '客服', phase: '评测', start: '2026-07-15', end: '2026-11-30', goal: { title: '质检上线', description: '自动质检覆盖全部会话' } },
    [
      ms('m1', '数据标注完成', '2026-08-10', 'done', '赵敏'),
      ms('m2', '模型 v1', '2026-09-20', 'done', '赵敏'),
      ms('m3', '第二轮人工评测', '2026-10-25', 'done', '赵敏'),
      ms('m4', '效果验收', '2026-11-08', 'planned', '赵敏'),
      ms('m5', '质检上线', '2026-11-25', 'planned', '赵敏')
    ],
    [up('u1', '2026-10-28', '赵敏', '第二轮人工评测', '完成第二轮人工评测，准确率达到验收线。')]
  ),
  project(
    { id: 'mobile-kb', name: '移动端知识库', owner: '周航', line: '知识', phase: '研发', start: '2026-08-20', end: '2026-11-30', status: 'delayed', goal: { title: '正式上线', description: '一线客服可在手机上查知识' } },
    [
      ms('m1', '交互稿评审', '2026-09-05', 'done', '郑雨'),
      ms('m2', '接口联调', '2026-10-15', 'done', '周航'),
      ms('m3', '提测', '2026-11-03', 'delayed', '周航', { summary: '原定 10/28，前端人力被抽调后延期。' }),
      ms('m4', '正式上线', '2026-11-25', 'planned', '周航')
    ],
    [up('u1', '2026-10-27', '周航', '提测延期', '提测延后至 11/03，原因见风险说明。', { status: 'blocked', risk: '前端人力被抽调，申请增派 1 名研发，提测延至 11 月 3 日。' })]
  ),
  project(
    { id: 'industry-kg', name: '行业知识图谱', owner: '吴桐', line: '知识', phase: '方案设计', start: '2026-10-01', end: '2027-03-31', goal: { title: '图谱上线', description: '覆盖三个重点行业' } },
    [
      ms('m1', '实体抽取方案调研', '2026-10-20', 'done', '吴桐'),
      ms('m2', '方案评审', '2026-11-20', 'planned', '吴桐'),
      ms('m3', '原型验证', '2027-01-15', 'planned', '吴桐')
    ],
    [up('u1', '2026-10-20', '吴桐', '实体抽取方案调研', '完成实体抽取方案调研。')]
  ),
  project(
    { id: 'metric-alert', name: '指标告警服务', owner: '刘洋', line: '数据', phase: '研发', start: '2026-09-01', end: '2026-12-15', goal: { title: '告警上线', description: '核心指标异常 5 分钟内告警' } },
    [
      ms('m1', '方案评审', '2026-09-15', 'done', '刘洋'),
      ms('m2', '联调', '2026-11-12', 'planned', '刘洋'),
      ms('m3', '告警上线', '2026-12-10', 'planned', '刘洋')
    ],
    [up('u1', '2026-10-27', '刘洋', '规则引擎完成', '告警规则引擎开发完成，支持阈值和同比两类规则。')]
  ),
  project(
    { id: 'design-spec', name: '设计规范 1.0', owner: '郑雨', line: '公共', phase: '已交付', start: '2026-06-01', end: '2026-10-18', status: 'done', goal: { title: '规范发布', description: '' } },
    [
      ms('m1', '组件盘点', '2026-07-01', 'done', '郑雨'),
      ms('m2', '规范评审', '2026-09-20', 'done', '郑雨'),
      ms('m3', '规范发布', '2026-10-18', 'done', '郑雨', { attachments: [{ title: '设计规范 1.0', url: 'https://example.com/design/spec', type: 'design' }] })
    ],
    [up('u1', '2026-10-18', '郑雨', '设计规范 1.0 发布', '设计规范 1.0 发布。')]
  )
];

const bio = '[个人简介：一两句话说明背景与目前负责的方向。]';
export const seedMembers = [
  { id: 'wangli', name: '王立', role: '团队负责人', group: '管理', since: '2021-03', city: '北京', email: '', skills: ['技术管理', '平台架构'], bio: '[个人简介：从业 X 年，负责团队整体方向、资源协调与对外合作。]' },
  { id: 'chensi', name: '陈思', role: '产品经理', group: '产品', since: '2022-07', city: '北京', email: '', skills: ['B 端产品', '对话设计'], bio },
  { id: 'sunyue', name: '孙悦', role: '产品经理', group: '产品', since: '2023-02', city: '杭州', email: '', skills: ['数据产品', '指标体系'], bio },
  { id: 'liuyang', name: '刘洋', role: '后端研发', group: '研发', since: '2021-09', city: '北京', email: '', skills: ['Go', '分布式系统'], bio },
  { id: 'zhouhang', name: '周航', role: '前端研发', group: '研发', since: '2023-06', city: '杭州', email: '', skills: ['React', '数据可视化'], bio },
  { id: 'zhaomin', name: '赵敏', role: '算法工程师', group: '算法', since: '2022-03', city: '北京', email: '', skills: ['RAG', '模型评测'], bio },
  { id: 'wutong', name: '吴桐', role: '算法工程师', group: '算法', since: '2024-04', city: '北京', email: '', skills: ['NLP', '知识图谱'], bio },
  { id: 'zhengyu', name: '郑雨', role: '交互设计师', group: '设计', since: '2022-11', city: '杭州', email: '', skills: ['交互设计', '设计系统'], bio }
];

const doc = (id, title, category, project, owner, source, updated, extra = {}) => ({
  id, title, category, project, owner, source, updated, url: 'https://example.com/wiki/' + id, pinned: false, note: '', ...extra
});
export const seedDocs = [
  doc('d1', '智能客服 2.0 · PRD', '项目文档', 'cs-platform-2', '陈思', '飞书', '2026-10-27'),
  doc('d2', '灰度发布 Checklist', '项目文档', 'cs-platform-2', '陈思', '飞书', '2026-10-26'),
  doc('d3', '新人入职 30 天指南', '入职指南', '', '王立', '飞书', '2026-10-25', { pinned: true, note: '新同学先看这里' }),
  doc('d4', '周会纪要 · 10/24', '会议纪要', '', '陈思', '飞书', '2026-10-24'),
  doc('d5', '数据中台指标字典', '项目文档', 'data-platform', '孙悦', '语雀', '2026-10-23'),
  doc('d6', '技术方案：检索增强架构', '项目文档', 'cs-platform-2', '刘洋', '语雀', '2026-10-20'),
  doc('d7', '设计规范 1.0', '技术规范', 'design-spec', '郑雨', 'Figma', '2026-10-18'),
  doc('d8', '周报填写与汇总规则', '流程制度', '', '王立', '飞书', '2026-10-15', { pinned: true, note: '每周五 18:00 前提交' }),
  doc('d9', '开发环境搭建与账号申请', '入职指南', '', '刘洋', '语雀', '2026-10-12'),
  doc('d10', '季度规划会纪要 · Q4', '会议纪要', '', '王立', '飞书', '2026-10-09'),
  doc('d11', '后端代码规范与 Code Review 约定', '技术规范', '', '刘洋', '语雀', '2026-09-30'),
  doc('d12', '对外合作流程与审批', '流程制度', '', '王立', '飞书', '2026-09-22'),
  doc('d13', '团队 OKR · 2026 Q4', '流程制度', '', '王立', '飞书', '2026-10-08', { pinned: true, note: '本季度目标' }),
  doc('d14', '值班与故障处理手册', '技术规范', '', '刘洋', '语雀', '2026-09-10', { pinned: true, note: '出故障先看这里' })
];

export const seedSettings = {
  teamName: '[团队名称]',
  wikiSource: '飞书 / 语雀 / Figma'
};

export function seedIfEmpty(store) {
  if (store.count('projects') || store.count('members') || store.count('docs')) return false;
  store.transaction(() => {
    for (const p of seedProjects) store.insert('projects', p.project.id, p);
    for (const m of seedMembers) store.insert('members', m.id, m);
    for (const d of seedDocs) store.insert('docs', d.id, d);
    store.setSettings(seedSettings);
  });
  return true;
}
