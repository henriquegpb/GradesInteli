export type PresencaStatus = "presente" | "falta" | "justificado" | "futuro";

export interface AttendanceRow {
  atividade: string;
  semana: string;
  dia: string;
  presencas: PresencaStatus[];
}

export interface AttendanceSummary {
  rows: AttendanceRow[];
  totalUnits: number;
  presentes: number;
  faltas: number;
  justificados: number;
  futuros: number;
  maxFaltasAllowed: number;
  faltasRestantes: number;
  percentFaltas: number;
}

function classifyIcon(iconId: string): PresencaStatus {
  if (iconId.includes("x-solido")) return "falta";
  if (iconId.includes("ban-solido")) return "futuro";
  if (iconId.includes("circle-exclamation-check")) return "justificado";
  if (iconId.includes("check-solido")) return "presente";
  return "futuro";
}

export function parseAttendanceHtml(html: string): AttendanceSummary {
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

  let presentes = 0;
  let faltas = 0;
  let justificados = 0;
  let futuros = 0;

  for (const row of rows) {
    for (const p of row.presencas) {
      switch (p) {
        case "presente": presentes++; break;
        case "falta": faltas++; break;
        case "justificado": justificados++; break;
        case "futuro": futuros++; break;
      }
    }
  }

  const totalUnits = presentes + faltas + justificados + futuros;
  const maxFaltasAllowed = Math.floor(totalUnits * 0.2);
  const faltasRestantes = Math.max(0, maxFaltasAllowed - faltas);
  const percentFaltas = totalUnits > 0 ? (faltas / totalUnits) * 100 : 0;

  return {
    rows,
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
