/** Iniciais: primeiro + último nome, ignorando partículas ("de", "dos", …). */
export function initials(name: string | null | undefined): string {
  // Vazio, não "?": o anel e o miolo aparecem de imediato e as iniciais entram
  // quando o nome chega, em vez de piscar um placeholder no meio.
  if (!name?.trim()) return "";
  const parts = (name ?? "")
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 2 || /^[A-ZÀ-Ú]/.test(p));
  if (!parts.length) return "";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** Hash estável — o mesmo nome sempre gera o mesmo gradiente. */
function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) {
    h = (h << 5) - h + text.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** Gradiente derivado do nome, para quem não tem foto. Saturação e luminosidade
 *  fixas para nenhuma combinação sair ilegível sobre o fundo escuro. */
export function gradientFor(name: string | null | undefined): string {
  // Sem nome ainda: gradiente neutro no acento, para o anel já nascer com a cor
  // certa em vez de começar no vermelho do hash da string vazia.
  if (!name?.trim()) return "linear-gradient(135deg, hsl(232 82% 70%), hsl(200 70% 52%))";
  const hue = hash(name ?? "") % 360;
  const second = (hue + 48) % 360;
  return `linear-gradient(135deg, hsl(${hue} 62% 55%), hsl(${second} 58% 45%))`;
}
