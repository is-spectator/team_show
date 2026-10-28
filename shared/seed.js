// 初始数据：团队的真实项目 + 一组示例项目（sample: true，首页切到「示例项目」才看得到）。
// 数据库为空时写入；设置环境变量 SEED=false 可以从空库开始。鱼和小人没有写，按顺序自动轮换。
import { normalizeProject } from './project.js';

const L = (title, url) => ({ title: title, url: url });
const IT = (type, date, title, author, text, links) => ({ type: type, date: date, title: title, author: author, text: text || '', links: links || [] });
const SAMPLE = [
  { id: 'cs-platform-2', name: '智能客服平台 2.0', owner: '陈思', members: ['刘洋', '赵敏', '郑雨', '周航'], status: 'on_track', start: '2026-08-01', end: '2026-12-20', goal: '全量发布', goal_detail: '覆盖 80% 常见咨询，人工转接率下降 30%。', items: [
    IT('milestone', '2026-08-15', '需求评审通过', '陈思', 'PRD 评审通过，确定覆盖 80% 常见咨询的目标与验收口径。', [L('智能客服 2.0 · PRD', 'https://example.com/docs/prd')]),
    IT('update', '2026-08-28', '技术选型调研', '刘洋', '完成三套检索方案对比，倾向向量 + 关键词混合检索。'),
    IT('milestone', '2026-09-05', '技术方案定稿', '刘洋', '检索增强架构评审通过，拆分为检索、生成、评测三个模块。', [L('技术方案：检索增强架构', 'https://example.com/docs/arch'), L('架构评审记录', 'https://example.com/docs/arch-review')]),
    IT('update', '2026-09-18', '评测集搭建', '赵敏', '整理 1,200 条真实咨询作为评测集，完成首轮基线测试。'),
    IT('update', '2026-09-29', '工作台交互稿', '郑雨', '客服工作台交互稿评审通过。', [L('工作台交互稿', 'https://example.com/design/workbench')]),
    IT('update', '2026-10-09', '检索模块联调', '刘洋', '检索服务与客服工作台打通，可以在测试环境体验。'),
    IT('milestone', '2026-10-20', '召回率达标 91%', '赵敏', '检索召回率从 84% 提升到 91%，比计划提前 5 天超过 90% 的阶段目标。', [L('召回率评测报告', 'https://example.com/sheets/recall')]),
    IT('update', '2026-10-24', '压测完成', '刘洋', '问答服务压测完成，P99 延迟 1.2 秒，下一步做缓存优化。'),
    IT('milestone', '2026-11-02', '核心开发完成', '刘洋', '检索、生成、评测三个模块完成开发并合入主干。'),
    IT('milestone', '2026-11-15', '灰度上线', '陈思', '在 2 个客服组灰度，观察自助解决率与转人工率。', [L('灰度发布 Checklist', 'https://example.com/docs/gray-checklist')]),
    IT('milestone', '2026-12-05', '效果复盘', '陈思', '灰度数据复盘，确定全量发布方案。')
  ] },
  { id: 'data-platform', name: '数据中台建设', owner: '孙悦', members: ['刘洋'], status: 'at_risk', start: '2026-05-10', end: '2026-12-31', goal: '全量切换', goal_detail: '所有业务报表切换到统一的中台口径。', items: [
    IT('milestone', '2026-06-01', '需求调研完成', '孙悦'), IT('milestone', '2026-07-20', '数据接入一期', '刘洋'),
    IT('update', '2026-08-30', '接入 12 个业务库', '刘洋', '一期 12 个业务库全部接入，日更延迟小于 30 分钟。'),
    IT('milestone', '2026-09-15', '指标体系上线', '孙悦', '', [L('数据中台指标字典', 'https://example.com/docs/metrics')]),
    IT('update', '2026-10-27', '财务口径对齐', '孙悦', '财务口径存在分歧，需要业务方在 11 月 1 日前确认指标定义。'),
    IT('milestone', '2026-11-05', '财务指标接入', '孙悦'), IT('milestone', '2026-12-15', '全量切换', '孙悦')
  ] },
  { id: 'qa-model', name: '客服质检模型', owner: '赵敏', members: [], status: 'on_track', start: '2026-07-15', end: '2026-11-30', goal: '质检上线', goal_detail: '自动质检覆盖全部客服会话。', items: [
    IT('milestone', '2026-08-10', '数据标注完成', '赵敏'), IT('milestone', '2026-09-20', '模型 v1', '赵敏'),
    IT('milestone', '2026-10-25', '第二轮人工评测', '赵敏'), IT('update', '2026-10-28', '准确率达到验收线', '赵敏', '完成第二轮人工评测，准确率达到验收线。'),
    IT('milestone', '2026-11-08', '效果验收', '赵敏'), IT('milestone', '2026-11-25', '质检上线', '赵敏')
  ] },
  { id: 'mobile-kb', name: '移动端知识库', owner: '周航', members: ['郑雨'], status: 'delayed', start: '2026-08-20', end: '2026-11-30', goal: '正式上线', goal_detail: '一线客服可以在手机上随时查知识。', items: [
    IT('milestone', '2026-09-05', '交互稿评审', '郑雨'), IT('milestone', '2026-10-15', '接口联调', '周航'),
    IT('update', '2026-10-27', '提测延期', '周航', '前端人力被抽调，申请增派 1 名研发，提测从 10/28 延至 11/3。'),
    IT('milestone', '2026-11-03', '提测', '周航'), IT('milestone', '2026-11-25', '正式上线', '周航')
  ] },
  { id: 'industry-kg', name: '行业知识图谱', owner: '吴桐', members: [], status: 'on_track', start: '2026-10-01', end: '2027-03-31', goal: '图谱上线', goal_detail: '覆盖三个重点行业的知识图谱。', items: [
    IT('update', '2026-10-20', '实体抽取方案调研', '吴桐', '完成实体抽取方案调研。'),
    IT('milestone', '2026-11-20', '方案评审', '吴桐'), IT('milestone', '2027-01-15', '原型验证', '吴桐')
  ] },
  { id: 'metric-alert', name: '指标告警服务', owner: '刘洋', members: [], status: 'on_track', start: '2026-09-01', end: '2026-12-15', goal: '告警上线', goal_detail: '核心指标异常 5 分钟内告警到人。', items: [
    IT('milestone', '2026-09-15', '方案评审', '刘洋'), IT('update', '2026-10-27', '规则引擎完成', '刘洋', '告警规则引擎开发完成，支持阈值和同比两类规则。'),
    IT('milestone', '2026-11-12', '联调', '刘洋'), IT('milestone', '2026-12-10', '告警上线', '刘洋')
  ] },
  { id: 'design-spec', name: '设计规范 1.0', owner: '郑雨', members: [], status: 'done', start: '2026-06-01', end: '2026-10-18', goal: '规范发布', goal_detail: '统一各产品的组件和交互规范。', items: [
    IT('milestone', '2026-07-01', '组件盘点', '郑雨'), IT('milestone', '2026-09-20', '规范评审', '郑雨'),
    IT('milestone', '2026-10-18', '规范发布', '郑雨', '设计规范 1.0 正式发布。', [L('设计规范 1.0', 'https://example.com/design/spec')])
  ] }
];

// 真实项目。开始日期没有给出的，暂按 10 月 1 日；已完成的项目日期待补，先放了占位日期。
const M = (date, title, text) => IT('milestone', date, title, '', text);
const U = (date, title, text) => IT('update', date, title, '', text);
const DONE = { status: 'done', start: '2026-07-01', end: '2026-10-15', goal: '已上线', goal_detail: '已完成，进展和起止日期待补。', items: [] };
const REAL = [
  { id: 'scene-monitor', name: '用户场景监控', owner: '张彦', members: ['张彦', '罗子鸣', '胡逸菲'], status: 'on_track', start: '2026-10-01', end: '2026-12-30',
    goal: 'DAU 覆盖 9000W', goal_detail: 'Top50 场景准确率、召回率达到 90%，线上 DAU 覆盖达到 9000W。', items: [
      U('2026-10-23', 'MLP 生成式推理服务', '发布第一个支持 MLP 生成式推理服务。'),
      U('2026-10-29', '线上用户监控链路', '搭建一个线上用户监控链路。'),
      M('2026-10-30', '识别链路小时级更新', '线上识别链路小时级别更新。'),
      M('2026-11-15', '离线识别链路', '搭建可靠的离线识别链路。'),
      M('2026-11-30', '场景树 v1 上线', '完成第一个版本场景树上线。'),
      M('2026-12-15', 'Top50 准召达到 90%', 'Top50 场景准确率、召回率达到 90%。'),
      M('2026-12-30', 'DAU 覆盖 9000W', '线上 DAU 覆盖达到 9000W。')
    ] },
  { id: 'scene-ops-home', name: '场景化经营—神主页面', owner: '张彦', members: ['张彦', '罗子鸣', '胡逸菲'], status: 'on_track', start: '2026-10-01', end: '2026-11-07',
    goal: '小时级更新', goal_detail: '线上支持 5 个场景识别，链路支持 1 小时级别更新。', items: [
      U('2026-10-23', 'MLP 生成式推理服务', '发布第一个支持 MLP 生成式推理服务。'),
      U('2026-10-27', 'personal 标签注册', 'personal 标签已经注册。'),
      U('2026-10-29', '支持 5 个场景识别', '发布支持 5 个场景的识别。'),
      M('2026-10-30', '线上 5 个场景识别', '线上支持 5 个场景识别。'),
      M('2026-11-07', '链路小时级更新', '线上链路支持 1 小时级别更新。')
    ] },
  { id: 'subsidy-groupbuy-1', name: '场景化补贴-团购一期', owner: '张彦', members: ['张彦', '罗子鸣'], ...DONE },
  { id: 'subsidy-flash-1', name: '场景化补贴-闪购一期', owner: '张彦', members: ['张彦', '董晴'], ...DONE },
  { id: 'subsidy-ticket', name: '场景化补贴-门票', owner: '张彦', members: ['张彦', '黎文龙'], ...DONE },
  { id: 'scene-ops-flash', name: '场景化经营-闪购', owner: '张彦', members: ['张彦'], status: 'on_track', start: '2026-10-15', end: '2026-12-31',
    goal: '需求沟通中', goal_detail: '需求沟通中，里程碑和交付日期待定。', items: [] },
  { id: 'cs-x-agent', name: '客服 X-Agent', owner: '', members: [], ...DONE },
  { id: 'cs-dine-merchant', name: '客服-到餐商家', owner: '', members: [], ...DONE }
];

export const realProjects = REAL.map((p, i) => normalizeProject(p, i));
export const sampleProjects = SAMPLE.map((p, i) => normalizeProject({ ...p, sample: true }, i));
export const seedProjects = [...realProjects, ...sampleProjects];

// 第 1 版初始数据只有示例项目；第 2 版加了真实项目，并把示例项目标成 sample。
// 用 seedVersion 记录写到了哪一版，已经删掉的项目不会再被加回来。
const SEED_VERSION = 2;

export function seedIfNeeded(store) {
  const list = store.list();
  const version = store.getSettings().seedVersion || (list.length ? 1 : 0);
  if (version >= SEED_VERSION) return false;
  const have = new Set(list.map((p) => p.id));
  if (version === 1) {
    for (const p of sampleProjects) {
      const old = store.get(p.id);
      if (old && !old.sample) store.update(p.id, { ...old, sample: true });
    }
  }
  for (const p of version === 1 ? realProjects : seedProjects) if (!have.has(p.id)) store.insert(p.id, p);
  store.setSettings({ seedVersion: SEED_VERSION });
  return true;
}
