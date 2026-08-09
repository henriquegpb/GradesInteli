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
    faltasRestantesPorPeso,
  };
}
