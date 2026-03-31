import type { PresencaStatus, AttendanceRow, AttendanceData } from "@/types/grades";

export type { PresencaStatus, AttendanceRow };

function classifyIcon(iconId: string): PresencaStatus {
  if (iconId.includes("x-solido")) return "falta";
  if (iconId.includes("ban-solido")) return "futuro";
  if (iconId.includes("circle-exclamation-check")) return "justificado";
  if (iconId.includes("check-solido")) return "presente";
  return "futuro";
}

function slotWeight(index: number, length: number, ultimaPeso2: boolean): number {
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

  for (const row of rows) {
    const len = row.presencas.length;
    row.presencas.forEach((p, i) => {
      const w = slotWeight(i, len, ultimaPresencaPeso2);
      switch (p) {
        case "presente": presentes += w; break;
        case "falta": faltas += w; break;
        case "justificado": justificados += w; break;
        case "futuro": futuros += w; break;
      }
    });
  }

  const totalUnits = presentes + faltas + justificados + futuros;
  const maxFaltasAllowed = Math.floor(totalUnits * 0.2);
  const faltasRestantes = Math.max(0, maxFaltasAllowed - faltas);
  const percentFaltas = totalUnits > 0 ? (faltas / totalUnits) * 100 : 0;

  return {
    totalUnits,
    presentes,
    faltas,
    justificados,
    futuros,
    maxFaltasAllowed,
    faltasRestantes,
    percentFaltas,
  };
}
