/**
 * 将 API 返回的 IV 统一为百分比数值（0–200 合理范围）。
 * 兼容：0.2（小数）= 20%；143（错误放大）= 14.3%；25（已是百分比）= 25%。
 */
export function toIvPercent(iv: number): number {
  if (iv <= 0 || Number.isNaN(iv)) return 0;
  if (iv >= 100) return iv / 10; // 14299 -> 14.3
  if (iv >= 10) return iv / 10;  // 143 -> 14.3
  if (iv > 2) return iv;         // 25 -> 25
  return iv * 100;               // 0.25 -> 25
}

export function toIvPercentFixed(iv: number, digits = 1): string {
  return toIvPercent(iv).toFixed(digits);
}
