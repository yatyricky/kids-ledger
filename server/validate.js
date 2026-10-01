// 路由间共享的输入校验辅助

// 单笔金额上限：±100 万元（分）。Number.isInteger 挡不住 1e20 这类超大值，
// 入库后会导致 SQLite SUM 整数溢出（GET /ledgers 直接 500）或金额列混入 REAL
export const MAX_AMOUNT_CENTS = 100_000_000;

// 路径参数 :id → 正整数，非法返回 null（调用方按 404 处理）
export function pathId(request) {
  const id = Number(request.params.id);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
