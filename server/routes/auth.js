import { findUserByToken } from '../auth.js';

export default async function (app) {
  app.post('/login', async (request, reply) => {
    const { token } = request.body ?? {};
    const user = findUserByToken(String(token ?? '').trim());
    if (!user) {
      return reply.code(401).send({ error: '口令不正确' });
    }
    return { role: user.role, label: user.label || '' };
  });
}
