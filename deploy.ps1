# 家庭账本部署脚本
# 流程：本地 vite 构建 -> 打包 dist + 后端 -> scp 到服务器 -> 远端解压/安装生产依赖/复制 nginx 配置
# 手动运维（编辑口令、systemd 启动、nginx reload）由脚本结尾提示，脚本本身不执行
#
# 用法：
#   .\deploy.ps1                      # 交互输入 SSH 别名
#   .\deploy.ps1 -SshAlias myserver   # 指定别名
#   .\deploy.ps1 -SshAlias myserver -RemoteDir /srv/kids-ledger
param(
  [string]$SshAlias,
  [string]$RemoteDir = "/opt/kids-ledger"
)

$ErrorActionPreference = "Stop"

# ── 0. 参数 ──────────────────────────────────────────────
if (-not $SshAlias) {
  $SshAlias = Read-Host "请输入 SSH 别名（~/.ssh/config 里配置的 Host）"
}
if ([string]::IsNullOrWhiteSpace($SshAlias)) {
  Write-Host "错误：未输入 SSH 别名" -ForegroundColor Red
  exit 1
}

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot
$DeployDir = Join-Path $ProjectRoot "deploy"
New-Item -ItemType Directory -Force -Path $DeployDir | Out-Null

function Fail($msg) {
  Write-Host "错误：$msg" -ForegroundColor Red
  exit 1
}

# ── 1. 服务器连通性 ─────────────────────────────────────
Write-Host "==> 检查服务器连通性：$SshAlias"
ssh $SshAlias "echo ok" | Out-Null
if ($LASTEXITCODE -ne 0) {
  Fail "无法连接 $SshAlias，请检查 ~/.ssh/config 里的别名与网络"
}

# ── 2. 本地构建 ─────────────────────────────────────────
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  Fail "本机未安装 pnpm（corepack enable pnpm 或 npm i -g pnpm）"
}
if (-not (Test-Path (Join-Path $ProjectRoot "node_modules"))) {
  Write-Host "==> 本地安装依赖 (pnpm install)"
  pnpm install
  if ($LASTEXITCODE -ne 0) { Fail "pnpm install 失败" }
}
Write-Host "==> 本地构建前端 (pnpm build)"
pnpm build
if ($LASTEXITCODE -ne 0) { Fail "vite 构建失败" }
if (-not (Test-Path (Join-Path $ProjectRoot "dist\index.html"))) {
  Fail "dist/index.html 不存在，构建疑似失败"
}

# ── 3. 打包（dist + 后端 + 运维文件）────────────────────
# 白名单枚举，天然排除 src/、node_modules、data/、config.json、日志
$Tarball = "deploy/kids-ledger-deploy.tar.gz"
Write-Host "==> 打包 $Tarball"
tar -czf $Tarball -C . dist server shared nginx package.json pnpm-lock.yaml pnpm-workspace.yaml config.example.json start.sh README.md
if ($LASTEXITCODE -ne 0) { Fail "tar 打包失败（需要 Windows 10+ 自带 tar 或 Git Bash）" }

# ── 4. 生成远端安装脚本（ASCII + LF）────────────────────
$RemoteScript = @'
#!/usr/bin/env bash
set -e
TARGET="__TARGET_DIR__"
TARBALL=/tmp/kids-ledger-deploy.tar.gz

echo "==> Extract to $TARGET"
# If the target dir is missing or not writable by the deploy user,
# create it with sudo and hand ownership over, so later deploys
# (extract/install/upgrade) need no sudo at all.
if [ ! -w "$TARGET" ]; then
  sudo mkdir -p "$TARGET"
  sudo chown "$(id -un):" "$TARGET"
fi
mkdir -p "$TARGET"
tar -xzf "$TARBALL" -C "$TARGET"
rm -f "$TARBALL"
cd "$TARGET"

if ! command -v node >/dev/null 2>&1; then
  echo "!! Node.js not found. Please install Node.js >= 22.5 first."
  exit 1
fi
NODE_V=$(node -v | sed 's/^v//')
echo "==> Node version: $NODE_V"
if [ "$(printf '22.5.0\n%s\n' "$NODE_V" | sort -V | head -n1)" != "22.5.0" ]; then
  echo "!! Node >= 22.5 required (node:sqlite), current: $NODE_V"
  exit 1
fi

echo "==> Install production deps (pnpm --prod)"
if command -v pnpm >/dev/null 2>&1; then
  PNPM="pnpm"
elif command -v corepack >/dev/null 2>&1; then
  # corepack reads the pinned version from package.json "packageManager"
  PNPM="corepack pnpm"
else
  echo "!! Neither pnpm nor corepack found. Install pnpm first: npm i -g pnpm"
  exit 1
fi
$PNPM install --prod --frozen-lockfile || $PNPM install --prod --no-frozen-lockfile

if [ ! -f config.json ]; then
  cp config.example.json config.json
  echo "!! config.json created from example. EDIT YOUR TOKENS: vi $TARGET/config.json"
fi

CONF_SRC="$TARGET/nginx/kl.nefandfriends.com.conf"
if [ -d /etc/nginx/sites-enabled ]; then
  echo "==> Copy nginx config (sites-available layout)"
  sudo cp "$CONF_SRC" /etc/nginx/sites-available/kl.conf
  sudo ln -sf /etc/nginx/sites-available/kl.conf /etc/nginx/sites-enabled/kl.conf
else
  echo "==> Copy nginx config (conf.d layout)"
  sudo cp "$CONF_SRC" /etc/nginx/conf.d/kl.conf
fi

if sudo nginx -t; then
  echo "==> nginx config test OK"
else
  echo "!! nginx -t FAILED. Fix the config before reloading nginx!"
fi

echo ""
echo "Deploy finished. Manual steps:"
echo "  vi $TARGET/config.json            # edit tokens (first deploy)"
echo "  sudo nginx -s reload              # reload nginx"
echo "  first deploy: install systemd unit (see README), then: sudo systemctl enable --now kids-ledger"
echo "  upgrade:      sudo systemctl restart kids-ledger"
'@
$RemoteScript = $RemoteScript.Replace("__TARGET_DIR__", $RemoteDir)
$RemoteScript = $RemoteScript.Replace("`r`n", "`n")  # bash 不吃 CRLF
$RemoteSh = Join-Path $DeployDir "remote-setup.sh"
[System.IO.File]::WriteAllText($RemoteSh, $RemoteScript, (New-Object System.Text.ASCIIEncoding))

# ── 5. 上传并执行 ───────────────────────────────────────
Write-Host "==> 上传压缩包与安装脚本"
scp $Tarball "${SshAlias}:/tmp/kids-ledger-deploy.tar.gz"
if ($LASTEXITCODE -ne 0) { Fail "scp 上传失败" }
scp $RemoteSh "${SshAlias}:/tmp/kids-ledger-remote-setup.sh"
if ($LASTEXITCODE -ne 0) { Fail "scp 上传失败" }

Write-Host "==> 远端安装（sudo 需要输密码时请输入）"
ssh -t $SshAlias "bash /tmp/kids-ledger-remote-setup.sh"
if ($LASTEXITCODE -ne 0) {
  Write-Host "警告：远端脚本报错，请根据上方输出排查" -ForegroundColor Yellow
  exit 1
}

Write-Host ""
Write-Host "部署完成。别忘了结尾提示的手动运维步骤（编辑口令 / reload nginx / systemd 服务）。" -ForegroundColor Green
