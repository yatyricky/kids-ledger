import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

let tokenMap = [];

export function loadConfig() {
  const cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  if (!Array.isArray(cfg.tokens) || cfg.tokens.length === 0) {
    throw new Error('config.json 需要一个非空的 tokens 数组');
  }
  for (const t of cfg.tokens) {
    if (!t.token || !['parent', 'child'].includes(t.role)) {
      throw new Error(`token 配置无效（需要 token 与 role: parent|child）：${JSON.stringify(t)}`);
    }
  }
  tokenMap = cfg.tokens;
}

export function findUserByToken(token) {
  return tokenMap.find((t) => t.token === token) ?? null;
}

// 从 Authorization: Bearer <token> 解析用户，挂到 request.user
export async function authenticate(request, reply) {
  const m = /^Bearer\s+(.+)$/.exec(request.headers.authorization || '');
  const user = m ? findUserByToken(m[1].trim()) : null;
  if (!user) {
    reply.code(401).send({ error: '登录无效，请重新输入口令' });
    return;
  }
  request.user = { role: user.role, label: user.label || '' };
}

// 必须跟在 authenticate 之后使用
export async function requireParent(request, reply) {
  if (request.user?.role !== 'parent') {
    reply.code(403).send({ error: '只有家长可以执行此操作' });
  }
}
