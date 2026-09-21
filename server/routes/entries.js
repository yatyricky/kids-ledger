import { db } from '../db.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(s) {
  if (!DATE_RE.test(s)) return false;
  // 用本地时区分量校验真实日历日期（如拒绝 2026-02-30），不受 toISOString 的 UTC 转换影响
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function entryFields(body) {
  const { date, description, categoryId, amount } = body ?? {};
  return { date, description, categoryId, amount };
}

function validateFields({ date, description, categoryId, amount }, { partial = false } = {}) {
  const out = {};
  if (!partial || date !== undefined) {
    if (typeof date !== 'string' || !isValidDate(date)) return { error: '日期无效' };
    out.date = date;
  }
  if (!partial || description !== undefined) {
    if (typeof description !== 'string' || !description.trim()) return { error: '请填写事情摘要' };
    out.description = description.trim();
  }
  if (!partial || categoryId !== undefined) {
    // 核算必选：不允许为空（PATCH 时也不允许清空为 null）
    if (categoryId === null || categoryId === undefined) return { error: '请选择核算' };
    const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(categoryId);
    if (!cat) return { error: '核算不存在' };
    out.categoryId = categoryId;
  }
  if (!partial || amount !== undefined) {
    if (!Number.isInteger(amount)) return { error: '金额无效（最多两位小数）' };
    if (amount === 0) return { error: '金额不能为 0' };
    out.amount = amount;
  }
  return { out };
}

// 按 日期 → 创建顺序 排序，逐行累加出 running balance
function listEntries(ledgerId) {
  const rows = db
    .prepare(
      `SELECT e.id, e.date, e.description, e.amount, e.category_id,
              c.name AS category_name, c.color AS category_color
         FROM entries e
         LEFT JOIN categories c ON c.id = e.category_id
        WHERE e.ledger_id = ?
        ORDER BY e.date ASC, e.created_at ASC, e.id ASC`
    )
    .all(ledgerId);
  let bal = 0;
  return rows.map((r) => {
    bal += r.amount;
    return {
      id: r.id,
      date: r.date,
      description: r.description,
      amount: r.amount,
      balance: bal,
      category: r.category_id
        ? { id: r.category_id, name: r.category_name, color: r.category_color }
        : null,
    };
  });
}

export default async function (app) {
  app.get('/ledgers/:id/entries', { preHandler: [app.authenticate] }, async (request, reply) => {
    const ledger = db.prepare('SELECT id FROM ledgers WHERE id = ?').get(request.params.id);
    if (!ledger) return reply.code(404).send({ error: '账簿不存在' });
    return listEntries(request.params.id);
  });

  app.post(
    '/ledgers/:id/entries',
    { preHandler: [app.authenticate, app.requireParent] },
    async (request, reply) => {
      const ledger = db.prepare('SELECT id FROM ledgers WHERE id = ?').get(request.params.id);
      if (!ledger) return reply.code(404).send({ error: '账簿不存在' });
      const { error, out } = validateFields(entryFields(request.body));
      if (error) return reply.code(400).send({ error });
      const res = db
        .prepare('INSERT INTO entries (ledger_id, date, description, category_id, amount) VALUES (?, ?, ?, ?, ?)')
        .run(request.params.id, out.date, out.description, out.categoryId, out.amount);
      return { id: res.lastInsertRowid };
    }
  );

  app.patch('/entries/:id', { preHandler: [app.authenticate, app.requireParent] }, async (request, reply) => {
    const existing = db.prepare('SELECT id, ledger_id FROM entries WHERE id = ?').get(request.params.id);
    if (!existing) return reply.code(404).send({ error: '记录不存在' });
    const { error, out } = validateFields(entryFields(request.body), { partial: true });
    if (error) return reply.code(400).send({ error });
    // 动态拼 SET：category 可被显式清空（null），COALESCE 做不到
    const sets = [];
    const params = [];
    if (out.date !== undefined) { sets.push('date = ?'); params.push(out.date); }
    if (out.description !== undefined) { sets.push('description = ?'); params.push(out.description); }
    if (out.categoryId !== undefined) { sets.push('category_id = ?'); params.push(out.categoryId); }
    if (out.amount !== undefined) { sets.push('amount = ?'); params.push(out.amount); }
    if (sets.length > 0) {
      sets.push("updated_at = datetime('now')");
      params.push(request.params.id);
      db.prepare(`UPDATE entries SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    }
    return { ok: true };
  });

  app.delete('/entries/:id', { preHandler: [app.authenticate, app.requireParent] }, async (request, reply) => {
    const res = db.prepare('DELETE FROM entries WHERE id = ?').run(request.params.id);
    if (res.changes === 0) return reply.code(404).send({ error: '记录不存在' });
    return { ok: true };
  });
}
