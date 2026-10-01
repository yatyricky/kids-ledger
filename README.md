# 家庭账本 (kids-ledger)

家庭简易账本系统：固定口令登录（小孩只读 / 家长读写），账簿卡片页 + 明细账页，移动端/平板友好。

## 技术栈

- 后端：Node.js (≥22.5，需内置 `node:sqlite`) + Fastify 5，数据库 SQLite 单文件（路径由 config.json 的 `dbPath` 配置，默认 `data/ledger.db`），零外部依赖服务
- 前端：Vue 3 + Vite + vue-router（构建产物由 Fastify 静态托管，单进程）
- 部署：通过 DevOpsUI 发布；服务监听 `127.0.0.1`，端口由环境变量 `PORT` 配置，对外经 nginx 反代提供访问（域名见 nginx 配置）

## 目录结构

```
server/        Fastify 后端（auth / ledgers / entries / categories 路由）
shared/        前后端共享的色系家族与 badge 预设（palettes.js）
src/           Vue 3 前端
nginx/         nginx 站点配置（全量反代）
deploy/        部署模板：SPA nginx 配置 + systemd 服务（{{占位符}} 替换后使用）
data/          SQLite 数据库（运行时生成，注意备份）
config.json    口令配置（不入库，gitignore）
```

## 本地开发

```bash
pnpm install
cp config.example.json config.json   # 修改口令
pnpm build                           # 构建前端到 dist/
pnpm start                           # 启动后端（监听 127.0.0.1，端口由 PORT 环境变量决定）
```

前端热更新开发：`pnpm start` 起后端，另开终端 `pnpm dev`（Vite 默认端口，`/api` 自动代理到后端）。

## 服务器部署（DevOpsUI）

生产部署统一通过 **DevOpsUI** 完成：构建、发布、进程托管与重启均在平台上操作，服务器上无需手动上传代码或维护启动脚本。服务侧约定如下，在 DevOpsUI 配置时对应填写即可。

- **启动命令**：`node server/index.js`，工作目录为项目根；Node ≥ 22.5（需内置 `node:sqlite`），生产依赖用 `pnpm install --prod` 安装
- **监听**：`127.0.0.1`，端口由环境变量 `PORT` 配置；对外由 nginx 反代提供访问
- **前端**：SPA 构建产物 `dist/` 由后端直接托管，发布前需执行 `pnpm build`
- **配置文件**：运行目录下需有 `config.json`（口令与数据库路径，见下文「配置文件」）；它不随代码发布，需在服务器或平台上单独准备，改完重启服务生效
- **数据**：SQLite 单文件由 `dbPath` 决定，首次启动自动生成，重新发布不影响已有数据；备份见「数据备份」

> 数据持久化提示：默认 `dbPath` 指向部署目录内的 `./data/ledger.db`；若重新部署会清空部署目录，应在 `config.json` 中把 `dbPath` 指向部署目录之外的持久化路径，并保证运行用户对该目录可写。

配套模板（占位符替换后使用）：

- `deploy/kids-ledger.service.template`：systemd 服务单元
- `deploy/nginx-kids-ledger.conf.template`：nginx 站点配置（nginx 直接托管 `dist/` 静态文件，仅 `/api` 反代后端，含 HTTPS 与缓存策略）

## 配置文件（config.json）

运行目录下的 `config.json` 不入 git，包含口令与数据库路径两类配置，改完重启服务生效：

```json
{
  "dbPath": "./data/ledger.db",
  "tokens": [
    { "token": "<家长口令>", "role": "parent", "label": "爸爸妈妈" },
    { "token": "<孩子口令>", "role": "child", "label": "小朋友" }
  ]
}
```

### tokens：口令与角色

- `parent`：读/增/改/删（账簿、记录、核算）
- `child`：只读

### dbPath：数据库文件路径

- 默认 `./data/ledger.db`；相对路径相对项目根目录解析，也可以写绝对路径
- 重新部署若会清空部署目录，请把 `dbPath` 指向部署目录之外的持久化路径（需保证运行用户对该目录可写）
- 更换路径后想保留旧数据：停服，把旧 db 文件（连同 WAL/SHM 副本）拷到新路径，再启动

## 交互说明

- 账簿页：点卡片进明细；家长点卡片右上角 ✎ 编辑账簿，弹窗内可删除整本账（二次确认）
- 明细页：家长点击任意一条记录即可编辑（弹窗内可删除该条）；"记一笔"添加记录；小孩点击无效
- 核算（badge）：添加/编辑记录时点选（必选）；badge 列表末尾"＋"新增核算（名称全账簿唯一、所有账簿共享）；"✎ 编辑"按钮编辑当前所选核算的名称与颜色
- 金额：收入/支出二选一 + 两位小数（第三位无法输入）；表内显式显示 +/- 与逐行余额
- 配色：账簿 12 套浅色渐变色系（卡片与对应明细页背景/文字同族协调），核算 12 款深色 badge（白字）；明细页添加核算时优先展示与当前账簿色系推荐的搭配

## 数据备份

账本数据全部在 `dbPath` 指向的 SQLite 单文件（默认 `data/ledger.db`，含 WAL 副本）。定期停服或直接拷贝该文件即可备份。
