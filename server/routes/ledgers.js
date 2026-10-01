import { db, ledgerBalance } from '../db.js';
import { FAMILY_IDS, DEFAULT_FAMILY } from '../../shared/palettes.js';
import { pathId } from '../validate.js';

const NAME_MAX = 30; // 与前端输入框 maxlength 对齐

export default async function (app) {
  app.get('/ledgers', { preHandler: [app.authenticate] }, async () => {
    const rows = db.prepare('SELECT id, name, color FROM ledgers ORDER BY created_at, id').all();
    return rows.map((r) => ({ ...r, balance: ledgerBalance(r.id) }));
  });

  app.get('/ledgers/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const id = pathId(request);
    if (id === null) return reply.code(404).send({ error: '账簿不存在' });
    const row = db.prepare('SELECT id, name, color FROM ledgers WHERE id = ?').get(id);
    if (!row) return reply.code(404).send({ error: '账簿不存在' });
    return { ...row, balance: ledgerBalance(row.id) };
  });

  app.post('/ledgers', { preHandler: [app.authenticate, app.requireParent] }, async (request, reply) => {
    const { name, color } = request.body ?? {};
    if (typeof name !== 'string' || !name.trim()) {
      return reply.code(400).send({ error: '请填写账簿名称' });
    }
    if (name.trim().length > NAME_MAX) {
      return reply.code(400).send({ error: `账簿名称不能超过 ${NAME_MAX} 字` });
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
    const id = pathId(request);
    if (id === null) return reply.code(404).send({ error: '账簿不存在' });
    const existing = db.prepare('SELECT id FROM ledgers WHERE id = ?').get(id);
    if (!existing) return reply.code(404).send({ error: '账簿不存在' });
    const { name, color } = request.body ?? {};
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return reply.code(400).send({ error: '账簿名称不能为空' });
    }
    if (name !== undefined && name.trim().length > NAME_MAX) {
      return reply.code(400).send({ error: `账簿名称不能超过 ${NAME_MAX} 字` });
    }
    if (color !== undefined && !FAMILY_IDS.includes(color)) {
      return reply.code(400).send({ error: '无效的配色主题' });
    }
    db.prepare('UPDATE ledgers SET name = COALESCE(?, name), color = COALESCE(?, color) WHERE id = ?').run(
      name !== undefined ? name.trim() : null,
      color ?? null,
      id
    );
    const row = db.prepare('SELECT id, name, color FROM ledgers WHERE id = ?').get(id);
    return { ...row, balance: ledgerBalance(row.id) };
  });

  app.delete('/ledgers/:id', { preHandler: [app.authenticate, app.requireParent] }, async (request, reply) => {
    const id = pathId(request);
    if (id === null) return reply.code(404).send({ error: '账簿不存在' });
    const res = db.prepare('DELETE FROM ledgers WHERE id = ?').run(id);
    if (res.changes === 0) return reply.code(404).send({ error: '账簿不存在' });
    return { ok: true };
  });
}
