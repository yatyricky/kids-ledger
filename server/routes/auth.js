import { findUserByToken } from '../auth.js';

// 登录防爆破：滑动窗口内失败满 MAX_FAILS 次临时锁定。
// 用全局计数而非按 IP——服务只绑 127.0.0.1 且经 nginx 反代，request.ip 恒为
// 127.0.0.1，按 IP 区分无意义；家庭应用全局锁定可接受，重启服务即清零。
const WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILS = 10;
let failTimes = [];

export default async function (app) {
  app.post('/login', async (request, reply) => {
    const now = Date.now();
    failTimes = failTimes.filter((t) => now - t < WINDOW_MS);
    if (failTimes.length >= MAX_FAILS) {
      return reply.code(429).send({ error: '尝试次数过多，请稍后再试' });
    }
    const { token } = request.body ?? {};
    const user = findUserByToken(String(token ?? '').trim());
    if (!user) {
      failTimes.push(now);
      return reply.code(401).send({ error: '口令不正确' });
    }
    failTimes = [];
    return { role: user.role, label: user.label || '' };
  });
}
