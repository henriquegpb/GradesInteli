import { fmtAttendanceUnits } from "@/lib/format";
import type { PresencaStatus, AttendanceRow, AttendanceData } from "@/types/grades";

export type { PresencaStatus, AttendanceRow };

function classifyIcon(iconId: string): PresencaStatus {
  if (iconId.includes("x-solido")) return "falta";
  if (iconId.includes("ban-solido")) return "futuro";
  if (iconId.includes("circle-exclamation-check")) return "justificado";
  if (iconId.includes("check-solido")) return "presente";
  return "futuro";
}

// Peso de uma chamada. Quando a linha veio da API, ela traz as horas de aula de
// cada chamada (`pesos`) e usamos isso — é exatamente a conta que o Adalove faz.
// Sem essa informação (import de HTML), cai no toggle manual do 3º ano.
function slotWeight(
  row: AttendanceRow,
  index: number,
  ultimaPeso2: boolean
): number {
  const peso = row.pesos?.[index];
  if (typeof peso === "number" && peso > 0) return peso;
  const length = row.presencas.length;
  if (!ultimaPeso2 || length === 0) return 1;
  return index === length - 1 ? 2 : 1;
}

export function extractAttendanceRows(html: string): AttendanceRow[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const trs = doc.querySelectorAll("tbody tr.styled-tr");
  const rows: AttendanceRow[] = [];

  trs.forEach((tr) => {
    const nomeEl = tr.querySelector(".caption-activity");
    const atividade = nomeEl?.textContent?.trim() ?? "";
    if (!atividade) return;

    const semanaEl = tr.querySelector('td[data-label="Semana"]');
    const semana = semanaEl?.textContent?.trim() ?? "";

    const diaEl = tr.querySelector('td[data-label="Dia"]');
    const dia = diaEl?.textContent?.trim() ?? "";

    const presencas: PresencaStatus[] = [];
    for (let i = 1; i <= 3; i++) {
      const cell = tr.querySelector(`td[data-label="Presença ${i}"]`);
      if (!cell) continue;

      const iconDiv = cell.querySelector("div[id]");
      if (iconDiv) {
        presencas.push(classifyIcon(iconDiv.id));
      }
    }

    rows.push({ atividade, semana, dia, presencas });
  });

  return rows;
}

export function summarizeAttendanceRows(
  rows: AttendanceRow[],
  ultimaPresencaPeso2: boolean
): AttendanceData {
  let presentes = 0;
  let faltas = 0;
  let justificados = 0;
  let futuros = 0;

  // Pesos distintos em jogo — no 3º ano, 2 (aula) e 1 (dev/AE).
  const pesosEmUso = new Set<number>();

  for (const row of rows) {
    row.presencas.forEach((p, i) => {
      const w = slotWeight(row, i, ultimaPresencaPeso2);
      pesosEmUso.add(w);
      switch (p) {
        case "presente": presentes += w; break;
        case "falta": faltas += w; break;
        case "justificado": justificados += w; break;
        case "futuro": futuros += w; break;
      }
    });
  }

  const pesosAutomaticos = rows.some((r) => (r.pesos?.length ?? 0) > 0);
  // Peso único da turma, quando toda chamada pesa igual (GRAD SI, 2º ano:
  // 2/2/2). É o que permite mostrar CHAMADAS em vez de horas-aula — sem isso,
  // uma turma de 2h por chamada vê todo número dobrado.
  const pesoUniforme = pesosEmUso.size === 1 ? [...pesosEmUso][0]! : null;
  const totalUnits = presentes + faltas + justificados + futuros;
  const maxFaltasAllowed = Math.floor(totalUnits * 0.2);
  const faltasRestantes = Math.max(0, maxFaltasAllowed - faltas);
  const percentFaltas = totalUnits > 0 ? (faltas / totalUnits) * 100 : 0;

  // Com pesos diferentes, "X faltas restantes" é ambíguo: o saldo é em horas e
  // cada tipo de chamada consome um tanto. Traduzimos o saldo em quantas
  // chamadas de cada peso ainda cabem (são alternativas, não uma soma).
  const faltasRestantesPorPeso =
    pesosEmUso.size > 1
      ? [...pesosEmUso]
          .sort((a, b) => b - a)
          .map((peso) => ({ peso, slots: Math.floor(faltasRestantes / peso) }))
      : undefined;

  return {
    totalUnits,
    presentes,
    faltas,
    justificados,
    futuros,
    maxFaltasAllowed,
    faltasRestantes,
    percentFaltas,
    pesosAutomaticos,
    pesoUniforme,
    faltasRestantesPorPeso,
  };
}

/** Como apresentar os totais de presença.
 *
 *  O cálculo é todo em HORAS-AULA, porque é a conta que o Adalove faz: o
 *  `absencesCount` que ele devolve é a soma das horas de todas as chamadas do
 *  módulo (188 numa turma 1/1/2 com 47 encontros, 282 numa 2/2/2), e a % de
 *  faltas sai dessa razão. Mas ninguém conta falta em hora — se cada chamada
 *  vale 2h, "56 faltas permitidas" são 28 chamadas, e era esse o número
 *  dobrado que aparecia nas turmas de 2º ano.
 *
 *  Com peso uniforme, converte para chamadas. Com pesos diferentes (3º ano,
 *  1/1/2) não existe conversão única: aí fica em horas e quem explica o saldo é
 *  `faltasRestantesPorPeso`. */
export interface AttendanceUnits {
  unidade: "chamadas" | "horas";
  /** Horas-aula de cada chamada, quando dá para converter. */
  peso: number | null;
  valor: (hours: number) => number;
  fmt: (hours: number) => string;
}

export function attendanceUnits(a: AttendanceData): AttendanceUnits {
  const peso = a.pesoUniforme ?? null;
  if (!peso || peso <= 0) {
    return { unidade: "horas", peso: null, valor: (h) => h, fmt: fmtAttendanceUnits };
  }
  return {
    unidade: "chamadas",
    peso,
    valor: (h) => h / peso,
    fmt: (h) => fmtAttendanceUnits(h / peso),
  };
}
