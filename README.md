# 项目展示

给老板和协作方看项目进展的站点。每个项目是一张卡片，点进去是一条鱼骨图：鱼尾是开始，鱼头是交付，主干上跑着的小人就是今天。实线骨是里程碑，虚线骨是进展，每一根都可以写文字、附文档链接。

## 怎么用

- **创建项目**：首页点「导入项目」，粘贴一份 YAML 或 JSON（或者直接选择文件），点「创建项目」。格式见 [`docs/project-template.yaml`](docs/project-template.yaml)，JSON 版本是 [`docs/project-template.json`](docs/project-template.json)。
- **新增进展 / 里程碑**：进入项目，点「+ 新增进展」长一根虚线骨，点「+ 新增里程碑」长一根实线骨。日期在今天之后的里程碑画成浅灰色，表示还在计划中。
- **编辑**：点任意一根鱼骨，下方可以改标题、日期、填写人、内容和文档链接，也可以在进展和里程碑之间切换。改动会先画在鱼骨图上，点「完成」才保存。
- **编辑项目**：项目名称、时间、负责人、成员、状态、目标，以及鱼的样子和进度上的小人。
- **导出**：「导出数据」可以复制或下载当前项目的 YAML / JSON，再导入就能得到同一个项目。
- **真实项目 / 示例项目**：首页右侧可以切换。示例项目用来演示鱼骨图的各种状态，不和真实项目混在一起；「编辑项目」里可以把项目标成示例。
- **一次导入多个项目**：文件里写成列表（每个项目以 `- name:` 开头）就会一次全部创建，见 [`docs/real-projects.yaml`](docs/real-projects.yaml)。
- 首页左上角的团队名称，在可编辑时点一下就能改。

所有改动都写入服务端的 SQLite 数据库，刷新页面或换电脑后都还在。

## 数据格式

```yaml
name: 智能客服平台 2.0       # 必填
start: "2026-08-01"         # 必填，鱼尾
end: "2026-12-20"           # 必填，鱼头
owner: 陈思
members: [刘洋, 赵敏]
status: on_track            # on_track 按计划推进 | at_risk 需要关注 | delayed 有延期 | done 已交付
fish: 胡子鲶                 # 蓝鳍鱼 | 胡子鲶 | 尖嘴鱼 | 河豚 | 长吻鱼 | 青鱼 | 灰鲫鱼，不填就按顺序轮换
rider: 自行车                # 自行车 | 小轿车 | 跑步的人 | 滑板车 | 滑板，已交付时自动换成举旗冲线
goal: 全量发布               # 写在鱼头下面
goal_detail: 覆盖 80% 常见咨询，人工转接率下降 30%
items:
  - type: milestone         # milestone 里程碑（实线骨）| update 进展（虚线骨）
    date: "2026-09-05"
    title: 技术方案定稿
    author: 刘洋
    text: 检索增强架构评审通过。
    links:
      - title: 技术方案
        url: https://example.com/docs/arch
```

鱼的表情跟着状态变：按计划微笑，需要关注冒汗，有延期皱眉，已交付眯眼笑。文档链接只接受 `http://`、`https://` 和 `mailto:`，没写协议的地址会自动补上 `https://`。校验和导入导出的逻辑在 [`shared/project.js`](shared/project.js)。

## 本地运行

需要 Node.js 22.13 或更高版本。项目用的是 Node 内置的 `node:sqlite`，不需要编译原生依赖。

```bash
npm install
npm run build
npm start            # http://localhost:3000
```

开发时运行 `npm run dev`，会同时启动接口服务（3000 端口）和前端（5173 端口，自动代理 `/api`）。运行 `npm test` 跑接口测试。

第一次启动时数据库是空的，会自动写入团队的 8 个真实项目（`shared/seed.js`，和 `docs/real-projects.yaml` 内容一致）和 7 个示例项目。如果想从空库开始，设置 `SEED=false`。

## 配置

| 环境变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3000` | 端口 |
| `DB_FILE` | `data/team.db` | 数据库文件位置，备份时只需要备份这一个文件 |
| `EDIT_PASSWORD` | 空 | 设置后，浏览不需要密码，导入和编辑要先点右上角「编辑」输入密码。给老板和协作方看时建议设置 |
| `SEED` | `true` | 空库时是否写入示例数据 |

## 不带服务器的预览版

`npm run build:demo` 会生成 `dist-demo/team-show-preview.html`。这是一个独立的 HTML 文件，接口逻辑在浏览器里跑，数据只存在打开它的那个浏览器里，适合先给别人看看效果。多人共享数据需要用下面的正式部署。

## 部署

```bash
docker build -t team-show .
docker run -d -p 3000:3000 -v team-show-data:/data -e EDIT_PASSWORD=换成你的密码 team-show
```

## 代码结构

```
server/   Express + SQLite 存储
shared/   数据校验、导入导出、接口路由（服务端和预览版共用）、示例数据
web/      React 前端（Vite 构建到 dist/，由服务端一起提供）
docs/     项目模板
test/     接口测试
```
