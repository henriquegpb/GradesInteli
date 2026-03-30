export function fmtNota(value: number | null, decimals = 2): string {
  if (value === null) return "—";
  return value.toFixed(decimals);
}

export function fmtPeso(value: number): string {
  return (value * 100).toFixed(0) + "%";
}

export function fmtPercent(value: number): string {
  return (value * 100).toFixed(1) + "%";
}
