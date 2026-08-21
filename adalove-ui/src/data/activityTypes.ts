import {
  BookOpenText,
  ClipboardList,
  Code2,
  FileQuestion,
  GraduationCap,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";

// Tabela oficial de tipos do Adalove, extraída do bundle deles
// ({id, name, icon, color}). É o que decide o cabeçalho do modal e o ícone do
// card — o "Autoestudo" do print vem daqui, não do título da atividade.
export interface ActivityKind {
  id: number;
  name: string;
  icon: LucideIcon;
  /** Token de cor do nosso tema. */
  color: string;
}

const FALLBACK: ActivityKind = {
  id: -1,
  name: "Atividade",
  icon: ClipboardList,
  color: "var(--color-fg-muted)",
};

export const ACTIVITY_KINDS: Record<number, ActivityKind> = {
  1: { id: 1, name: "Encontro de Orientação", icon: Users, color: "var(--color-teal)" },
  2: { id: 2, name: "Encontro de Instrução", icon: GraduationCap, color: "var(--color-blue)" },
  11: { id: 11, name: "Autoestudo", icon: BookOpenText, color: "var(--color-orange)" },
  21: { id: 21, name: "Desenvolvimento de Projetos", icon: Code2, color: "var(--color-artefato)" },
  22: { id: 22, name: "Videoaula", icon: Video, color: "var(--color-purple)" },
  31: { id: 31, name: "Avaliação e Pesquisa", icon: FileQuestion, color: "var(--color-autoavaliacao)" },
  91: { id: 91, name: "Atividade Customizada", icon: ClipboardList, color: "var(--color-fg-muted)" },
  92: { id: 92, name: "Projeto", icon: Code2, color: "var(--color-artefato)" },
  93: { id: 93, name: "Material Complementar", icon: BookOpenText, color: "var(--color-fg-muted)" },
};

export function kindOf(type: number | null): ActivityKind {
  return (type != null && ACTIVITY_KINDS[type]) || FALLBACK;
}

/** O /userdata só traz a sigla do eixo (`axisCaption`: "COM", "MTF"…), e sigla
 *  não diz nada para quem está lendo a grade da semana. Os nomes são os cinco
 *  eixos do Inteli; sigla fora da lista cai nela mesma — melhor mostrar "XYZ"
 *  do que engolir a informação. */
export const AXIS_NAME: Record<string, string> = {
  COM: "Computação",
  MTF: "Matemática e Física",
  NEG: "Negócios",
  UEX: "User Experience",
  LID: "Liderança",
};

export function axisName(axis: string | null): string | null {
  if (!axis) return null;
  return AXIS_NAME[axis.toUpperCase()] ?? axis;
}

/** Cor da categoria de nota — a paleta theme-invariant do GradesInteli. O verde
 *  da Autoavaliação é o que o próprio Adalove usa nessas atividades. */
export const CATEGORY_COLOR: Record<string, string> = {
  Ponderada: "var(--color-ponderada)",
  Artefato: "var(--color-artefato)",
  Autoavaliação: "var(--color-autoavaliacao)",
  Prova: "var(--color-prova)",
  Aula: "var(--color-purple)",
  Grupo: "var(--color-teal)",
};
