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

export function fmtAttendanceUnits(value: number): string {
  const r = Math.round(value * 100) / 100;
  return r % 1 === 0 ? String(r) : r.toFixed(1);
}
