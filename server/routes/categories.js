import { db } from '../db.js';
import { BADGE_IDS, DEFAULT_BADGE } from '../../shared/palettes.js';

function isUniqueViolation(err) {
  const s = `${err?.code ?? ''} ${err?.message ?? ''}`;
  return s.includes('UNIQUE');
}

export default async function (app) {
  app.get('/categories', { preHandler: [app.authenticate] }, async () => {
    return db.prepare('SELECT id, name, color FROM categories ORDER BY created_at, id').all();
  });

  app.post(
    '/categories',
    { preHandler: [app.authenticate, app.requireParent] },
    async (request, reply) => {
      const { name, color } = request.body ?? {};
      if (typeof name !== 'string' || !name.trim()) {
        return reply.code(400).send({ error: '请填写核算名称' });
      }
      if (color !== undefined && !BADGE_IDS.includes(color)) {
        return reply.code(400).send({ error: '无效的 badge 主题' });
      }
      try {
        const res = db
          .prepare('INSERT INTO categories (name, color) VALUES (?, ?)')
          .run(name.trim(), color ?? DEFAULT_BADGE);
        return db.prepare('SELECT id, name, color FROM categories WHERE id = ?').get(res.lastInsertRowid);
      } catch (err) {
        if (isUniqueViolation(err)) {
          return reply.code(409).send({ error: '核算名称已存在（所有账簿共享一套核算）' });
        }
        throw err;
      }
    }
  );

  app.patch(
    '/categories/:id',
    { preHandler: [app.authenticate, app.requireParent] },
    async (request, reply) => {
      const existing = db.prepare('SELECT id FROM categories WHERE id = ?').get(request.params.id);
      if (!existing) return reply.code(404).send({ error: '核算不存在' });
      const { name, color } = request.body ?? {};
      if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
        return reply.code(400).send({ error: '核算名称不能为空' });
      }
      if (color !== undefined && !BADGE_IDS.includes(color)) {
        return reply.code(400).send({ error: '无效的 badge 主题' });
      }
      try {
        const sets = [];
        const params = [];
        if (name !== undefined) { sets.push('name = ?'); params.push(name.trim()); }
        if (color !== undefined) { sets.push('color = ?'); params.push(color); }
        if (sets.length > 0) {
          params.push(request.params.id);
          db.prepare(`UPDATE categories SET ${sets.join(', ')} WHERE id = ?`).run(...params);
        }
        return db.prepare('SELECT id, name, color FROM categories WHERE id = ?').get(request.params.id);
      } catch (err) {
        if (isUniqueViolation(err)) {
          return reply.code(409).send({ error: '核算名称已存在（所有账簿共享一套核算）' });
        }
        throw err;
      }
    }
  );
}
