# 家庭账本 (kids-ledger)

家庭简易账本系统：固定口令登录（小孩只读 / 家长读写），账簿卡片页 + 明细账页，移动端/平板友好。

## 技术栈

- 后端：Node.js (≥22.5，需内置 `node:sqlite`) + Fastify 5，数据库 SQLite 单文件（`data/ledger.db`），零外部依赖服务
- 前端：Vue 3 + Vite + vue-router（构建产物由 Fastify 静态托管，单进程）
- 部署：`start.sh` 启动服务到 `127.0.0.1:3050`，nginx 反代 `kl.nefandfriends.com`

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
pnpm start                           # http://127.0.0.1:3050
```

前端热更新开发：`pnpm start` 起后端，另开终端 `pnpm dev`（Vite 5173 端口，`/api` 自动代理到 3050）。

## 服务器部署

### 方式一：一键部署脚本（Windows PowerShell）

```powershell
.\deploy.ps1                      # 交互输入 SSH 别名（~/.ssh/config 里的 Host）
.\deploy.ps1 -SshAlias myserver   # 或直接指定
.\deploy.ps1 -SshAlias myserver -RemoteDir /srv/kids-ledger  # 远端目录默认 /opt/kids-ledger
```

脚本会：本地 vite 构建 → 打包 `dist + server + shared + nginx + package.json + pnpm-lock.yaml + config.example.json + start.sh` → scp 上传 → 远端解压、`pnpm install --prod` 装生产依赖、缺失时从 example 生成 config.json、复制 nginx 配置并 `nginx -t` 校验。

脚本**不会**执行的操作（手动完成）：编辑服务器上的 `config.json` 改口令、`sudo nginx -s reload`、安装/启动 systemd 服务（unit 模板见下）。

### 方式二：手动部署

```bash
# 1. 安装 Node.js >= 22.5（例如通过 nodesource 或 nvm），并准备 pnpm（corepack enable pnpm 或 npm i -g pnpm）
# 2. 上传代码到服务器，例如 /opt/kids-ledger
cd /opt/kids-ledger
cp config.example.json config.json   # 编辑 tokens，设好自己的口令
pnpm install --prod                  # 生产依赖（服务器不需要前端构建工具链）

# 3. 启动（dist/ 需本地构建后一起上传，或保留 devDependencies 在服务器上 pnpm build）
chmod +x start.sh
./start.sh
```

生产环境建议用 systemd 托管（`exec` 前台运行，天然兼容）。可直接使用模板 `deploy/kids-ledger.service.template`，替换 `{{INSTALL_DIR}}`、`{{RUN_USER}}`、`{{BACKEND_PORT}}` 后安装；或用下面的最小示例：

```ini
# /etc/systemd/system/kids-ledger.service
[Unit]
Description=kids-ledger
After=network.target

[Service]
WorkingDirectory=/opt/kids-ledger
ExecStart=/opt/kids-ledger/start.sh
Restart=on-failure
User=www-data

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable --now kids-ledger
```

## nginx

```bash
cp nginx/kl.nefandfriends.com.conf /etc/nginx/sites-available/kl.conf
ln -s /etc/nginx/sites-available/kl.conf /etc/nginx/sites-enabled/
nginx -t && nginx -s reload
```

HTTPS：`sudo certbot --nginx -d kl.nefandfriends.com`（配置文件里也有手动模板）。

nginx 直接托管 SPA 静态文件（性能更好，仅 `/api` 反代后端）的模板见 `deploy/nginx-spa.conf.template`：替换 `{{SERVER_NAME}}`、`{{SSL_CERTIFICATE}}`、`{{SSL_CERTIFICATE_KEY}}`、`{{SPA_ROOT}}`、`{{BACKEND_HOST}}`、`{{BACKEND_PORT}}`、`{{LOG_PREFIX}}` 后按同样方式启用。

## 口令与角色

`config.json` 中 `tokens` 数组配置固定口令，改完重启服务生效：

```json
{
  "tokens": [
    { "token": "Parent2026", "role": "parent", "label": "爸爸妈妈" },
    { "token": "Kids2026", "role": "child", "label": "小朋友" }
  ]
}
```

- `parent`：读/增/改/删（账簿、记录、核算）
- `child`：只读

## 交互说明

- 账簿页：点卡片进明细；家长点卡片右上角 ✎ 编辑账簿，弹窗内可删除整本账（二次确认）
- 明细页：家长点击任意一条记录即可编辑（弹窗内可删除该条）；"记一笔"添加记录；小孩点击无效
- 核算（badge）：添加/编辑记录时点选（必选）；badge 列表末尾"＋"新增核算（名称全账簿唯一、所有账簿共享）；"✎ 编辑"按钮编辑当前所选核算的名称与颜色
- 金额：收入/支出二选一 + 两位小数（第三位无法输入）；表内显式显示 +/- 与逐行余额
- 配色：账簿 12 套浅色渐变色系（卡片与对应明细页背景/文字同族协调），核算 12 款深色 badge（白字）；明细页添加核算时优先展示与当前账簿色系推荐的搭配

## 数据备份

账本数据全部在 `data/ledger.db`（含 WAL 副本）。定期停服或直接拷贝该目录即可备份。
