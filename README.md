# 团队主页

这是给团队用的项目进展站点。老板可以在这里看整体进展，成员可以同步进展，项目和成员可以对外展示，Wiki 文档也统一在这里索引。按 2026-10-28 定稿的 v1 原型实现。

## 页面

| 页面 | 路径 | 说明 |
| --- | --- | --- |
| 工作台 | `/` | 项目状态统计、项目进度表、待决策 / 风险、近期里程碑、本周进展提交情况，可导出 Markdown 周报 |
| 项目列表 | `/projects` | 按名称 / 状态 / 产品线筛选，新建项目，从 JSON / YAML 导入，导出 CSV |
| 项目详情 | `/projects/:id` | 鱼骨图：鱼尾到鱼头是项目周期，进度点随日期前进；进展是主干上的亮点，里程碑是骨头，点开可编辑、挂附件、标记完成；可拖动查看时间推进；可导入导出 JSON / YAML |
| 进展同步 | `/sync` | 所有项目的进展流，在这里选项目写进展，可按项目、成员筛选 |
| 成员 | `/members` | 按职能分组，右侧显示详情；负责项目、本周是否提交、最近一次进展都按项目数据自动计算 |
| Wiki 文档 | `/wiki` | 分类、搜索、常用入口，点击跳转原文 |

所有改动都写入服务端的 SQLite 数据库，刷新页面或换电脑后都还在。

## 本地运行

需要 Node.js 22.13 或更高版本。项目用的是 Node 内置的 `node:sqlite`，不需要编译原生依赖。

```bash
npm install
npm run build
npm start            # http://localhost:3000
```

开发时运行 `npm run dev`，会同时启动接口服务（3000 端口）和前端（5173 端口，自动代理 `/api`）。运行 `npm test` 跑接口测试。

第一次启动时数据库是空的，会自动写入原型里的示例数据。如果想从空库开始，设置 `SEED=false`。

## 配置

| 环境变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3000` | 端口 |
| `DB_FILE` | `data/team.db` | 数据库文件位置，备份时只需要备份这一个文件 |
| `EDIT_PASSWORD` | 空 | 设置后，浏览不需要密码，修改数据需要输入这个密码。对外展示时建议设置 |
| `SEED` | `true` | 空库时是否写入示例数据 |

团队名称和文档来源说明，点页面左上角的齿轮修改。在右上角「我是谁」里选择自己后，写进展时会自动带上填写人。

## 不带服务器的预览版

`npm run build:demo` 会生成 `dist-demo/team-show-preview.html`。这是一个独立的 HTML 文件，接口在浏览器里模拟，数据只存在打开它的那个浏览器里，适合先给别人看看效果。多人共享数据需要用下面的正式部署。

## 部署

```bash
docker build -t team-show .
docker run -d -p 3000:3000 -v team-show-data:/data -e EDIT_PASSWORD=换成你的密码 team-show
```

## 数据结构

每个项目对应一份鱼骨图数据。结构见 [`docs/fishbone.example.yaml`](docs/fishbone.example.yaml)（带逐字段注释）和 [`shared/fishbone.schema.json`](shared/fishbone.schema.json)，服务端用这份 Schema 校验所有写入。项目上额外用了两个自定义字段：`line`（产品线）和 `phase`（阶段）。进展上的 `resolved: true` 表示风险已经处理。

项目进度按已完成里程碑的占比计算。没有里程碑时用时间进度，已完成的项目算 100%。

## 代码结构

```
server/   Express 接口 + SQLite 存储 + Schema 校验 + 示例数据
shared/   鱼骨图 JSON Schema
web/      React 前端（Vite 构建到 dist/，由服务端一起提供）
docs/     数据示例
test/     接口测试
```
