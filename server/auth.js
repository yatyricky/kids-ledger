import { createHash, timingSafeEqual } from 'node:crypto';
import { config } from './config.js';

// 先做 sha256 再比对：摘要定长，满足 timingSafeEqual 的等长要求，
// 同时消除普通字符串 === 的时序侧信道
function tokenEquals(expected, actual) {
  const hExpected = createHash('sha256').update(expected).digest();
  const hActual = createHash('sha256').update(actual).digest();
  return timingSafeEqual(hExpected, hActual);
}

export function findUserByToken(token) {
  return config.tokens.find((t) => tokenEquals(t.token, token)) ?? null;
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
