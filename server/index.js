import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { authenticate, requireParent } from './auth.js';
import authRoutes from './routes/auth.js';
import ledgerRoutes from './routes/ledgers.js';
import entryRoutes from './routes/entries.js';
import categoryRoutes from './routes/categories.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');

const app = Fastify({ logger: true });

// 4xx 透传业务文案；5xx 只记日志，不向客户端泄漏内部错误信息
app.setErrorHandler((err, request, reply) => {
  const code = err.statusCode ?? 500;
  if (code < 500) {
    return reply.code(code).send({ error: err.message });
  }
  request.log.error(err);
  return reply.code(500).send({ error: '服务器内部错误' });
});

app.decorate('authenticate', authenticate);
app.decorate('requireParent', requireParent);

await app.register(authRoutes, { prefix: '/api' });
await app.register(ledgerRoutes, { prefix: '/api' });
await app.register(entryRoutes, { prefix: '/api' });
await app.register(categoryRoutes, { prefix: '/api' });

if (existsSync(distDir)) {
  await app.register(fastifyStatic, { root: distDir });
}

// API 未命中 → 404 JSON；其余路径回退到 SPA 入口
app.setNotFoundHandler((request, reply) => {
  if (request.raw.url.startsWith('/api')) {
    return reply.code(404).send({ error: '接口不存在' });
  }
  if (existsSync(distDir)) {
    return reply.sendFile('index.html');
  }
  return reply
    .code(503)
    .send({ error: '前端未构建：请先运行 npm run build' });
});

const PORT = Number(process.env.PORT || 3050);

app
  .listen({ host: '127.0.0.1', port: PORT })
  .then(() => console.log(`kids-ledger 已启动: http://127.0.0.1:${PORT}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
