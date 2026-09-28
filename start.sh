#!/usr/bin/env bash
# 启动家庭账本 web 服务（127.0.0.1:3050，由 nginx 反代对外）
set -euo pipefail
cd "$(dirname "$0")"

mkdir -p data

if ! command -v node >/dev/null 2>&1; then
  echo "[kids-ledger] 未找到 node，请先安装 Node.js >= 22.5"
  exit 1
fi

if [ ! -f config.json ]; then
  echo "[kids-ledger] 缺少 config.json：请复制 config.example.json 为 config.json 并配置 token"
  exit 1
fi

if [ ! -d node_modules ]; then
  if ! command -v pnpm >/dev/null 2>&1; then
    echo "[kids-ledger] 未找到 pnpm：请先安装（corepack enable pnpm 或 npm i -g pnpm），"
    echo "[kids-ledger] 或直接运行 pnpm install --prod 后再启动"
    exit 1
  fi
  echo "[kids-ledger] 安装依赖..."
  pnpm install --prod --no-frozen-lockfile
fi

if [ ! -d dist ]; then
  if pnpm exec vite --version >/dev/null 2>&1; then
    echo "[kids-ledger] 未找到 dist/，构建前端..."
    pnpm build
  else
    echo "[kids-ledger] 未找到 dist/ 且未安装前端工具链（生产依赖安装）。"
    echo "[kids-ledger] 请在本地 pnpm build 后上传 dist/（或使用 deploy.ps1 一键部署）"
    exit 1
  fi
fi

exec node server/index.js
