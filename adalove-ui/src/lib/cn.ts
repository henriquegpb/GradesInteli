/** Junta classes condicionais. Sem merge — ordem importa: base, variante, className do caller. */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
