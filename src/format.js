// '2026-02-17' → '2026.2.17'（brief 要求 yyyy.M.d，去前导零）
export function fmtDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${y}.${m}.${d}`;
}

// 明细表金额：显式正负号 + 两位小数；0 记为 "0.00"
export function fmtAmount(cents) {
  const s = (Math.abs(cents) / 100).toFixed(2);
  if (cents > 0) return `+${s}`;
  if (cents < 0) return `-${s}`;
  return '0.00';
}

// 余额列/卡片余额：不带正负号
export function fmtBalance(cents) {
  return (cents / 100).toFixed(2);
}

export function todayISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
