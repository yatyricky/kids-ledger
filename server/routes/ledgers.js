import { db, ledgerBalance } from '../db.js';
import { FAMILY_IDS, DEFAULT_FAMILY } from '../../shared/palettes.js';

export default async function (app) {
  app.get('/ledgers', { preHandler: [app.authenticate] }, async () => {
    const rows = db.prepare('SELECT id, name, color FROM ledgers ORDER BY created_at, id').all();
    return rows.map((r) => ({ ...r, balance: ledgerBalance(r.id) }));
  });

  app.get('/ledgers/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const row = db.prepare('SELECT id, name, color FROM ledgers WHERE id = ?').get(request.params.id);
    if (!row) return reply.code(404).send({ error: '账簿不存在' });
    return { ...row, balance: ledgerBalance(row.id) };
  });

  app.post('/ledgers', { preHandler: [app.authenticate, app.requireParent] }, async (request, reply) => {
    const { name, color } = request.body ?? {};
    if (typeof name !== 'string' || !name.trim()) {
      return reply.code(400).send({ error: '请填写账簿名称' });
    }
    if (color !== undefined && !FAMILY_IDS.includes(color)) {
      return reply.code(400).send({ error: '无效的配色主题' });
    }
    const res = db
      .prepare('INSERT INTO ledgers (name, color) VALUES (?, ?)')
      .run(name.trim(), color ?? DEFAULT_FAMILY);
    const row = db.prepare('SELECT id, name, color FROM ledgers WHERE id = ?').get(res.lastInsertRowid);
    return { ...row, balance: 0 };
  });

  app.patch('/ledgers/:id', { preHandler: [app.authenticate, app.requireParent] }, async (request, reply) => {
    const existing = db.prepare('SELECT id FROM ledgers WHERE id = ?').get(request.params.id);
    if (!existing) return reply.code(404).send({ error: '账簿不存在' });
    const { name, color } = request.body ?? {};
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return reply.code(400).send({ error: '账簿名称不能为空' });
    }
    if (color !== undefined && !FAMILY_IDS.includes(color)) {
      return reply.code(400).send({ error: '无效的配色主题' });
    }
    db.prepare('UPDATE ledgers SET name = COALESCE(?, name), color = COALESCE(?, color) WHERE id = ?').run(
      name !== undefined ? name.trim() : null,
      color ?? null,
      request.params.id
    );
    const row = db.prepare('SELECT id, name, color FROM ledgers WHERE id = ?').get(request.params.id);
    return { ...row, balance: ledgerBalance(row.id) };
  });

  app.delete('/ledgers/:id', { preHandler: [app.authenticate, app.requireParent] }, async (request, reply) => {
    const res = db.prepare('DELETE FROM ledgers WHERE id = ?').run(request.params.id);
    if (res.changes === 0) return reply.code(404).send({ error: '账簿不存在' });
    return { ok: true };
  });
}
