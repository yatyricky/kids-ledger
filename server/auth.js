import { config } from './config.js';

export function findUserByToken(token) {
  return config.tokens.find((t) => t.token === token) ?? null;
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
