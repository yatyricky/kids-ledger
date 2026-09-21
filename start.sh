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
  echo "[kids-ledger] 安装依赖..."
  npm install
fi

if [ ! -d dist ]; then
  echo "[kids-ledger] 未找到 dist/，构建前端..."
  npm run build
fi

exec node server/index.js
