import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// config.json 与相对 dbPath 都锚定项目根，不依赖启动时的 cwd
export const PROJECT_ROOT = path.join(__dirname, '..');
const CONFIG_PATH = path.join(PROJECT_ROOT, 'config.json');

let raw;
try {
  raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
} catch (err) {
  throw new Error(`无法读取 config.json（${CONFIG_PATH}）：${err.message}`);
}

if (!Array.isArray(raw.tokens) || raw.tokens.length === 0) {
  throw new Error('config.json 需要一个非空的 tokens 数组');
}
for (const t of raw.tokens) {
  if (!t.token || !['parent', 'child'].includes(t.role)) {
    throw new Error(`token 配置无效（需要 token 与 role: parent|child）：${JSON.stringify(t)}`);
  }
}

let dbPath;
if (raw.dbPath === undefined || raw.dbPath === '') {
  dbPath = path.join(PROJECT_ROOT, 'data', 'ledger.db');
} else if (typeof raw.dbPath !== 'string') {
  throw new Error('config.json 的 dbPath 必须是字符串（相对路径相对项目根解析）');
} else {
  dbPath = path.resolve(PROJECT_ROOT, raw.dbPath);
}

export const config = Object.freeze({ tokens: raw.tokens, dbPath });
