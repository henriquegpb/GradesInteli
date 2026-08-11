import type { ActivityView, SectionView } from "~/data/viewmodel";

// "Matéria" não existe como campo no /userdata. O que existe é professor, eixo
// e o prefixo do título — e cada professor leciona uma disciplina. Então
// agrupamos por professor e derivamos o nome da matéria do prefixo mais comum
// dos títulos dele ("(NLP Aula 3) …" → NLP), caindo para o eixo quando não há
// prefixo (é o caso de NEG e LID) e para o primeiro nome em último caso.

export interface Subject {
  id: string;
  label: string;
  professor: string | null;
  axis: string | null;
  activities: ActivityView[];
}

function derivedLabel(activities: ActivityView[], professor: string): string {
  const prefixes = new Map<string, number>();
  for (const a of activities) {
    const m = /^\(([A-Za-zÀ-ú]{2,12})[\s-]/.exec(a.caption);
    if (m?.[1]) prefixes.set(m[1], (prefixes.get(m[1]) ?? 0) + 1);
  }
  const top = [...prefixes.entries()].sort((a, b) => b[1] - a[1])[0];
  if (top) return top[0];

  const axes = [...new Set(activities.map((a) => a.axis).filter(Boolean))];
  if (axes.length === 1 && axes[0]) return axes[0];

  return professor.trim().split(/\s+/)[0] ?? professor;
}

export function buildSubjects(view: SectionView): Subject[] {
  const byProfessor = new Map<string, ActivityView[]>();
  for (const a of view.activities) {
    if (!a.professor) continue;
    const list = byProfessor.get(a.professor);
    if (list) list.push(a);
    else byProfessor.set(a.professor, [a]);
  }

  return [...byProfessor.entries()]
    .map(([professor, activities]) => ({
      id: professor,
      label: derivedLabel(activities, professor),
      professor,
      axis: [...new Set(activities.map((a) => a.axis).filter(Boolean))].join("/") || null,
      activities,
    }))
    .filter((s) => s.activities.length >= 3)
    .sort((a, b) => b.activities.length - a.activities.length);
}

/** Só títulos, agrupados por semana: com descrições o prompt passaria de 100k. */
const MAX_ACTIVITIES = 160;

export function buildSummaryPrompt(view: SectionView, subject: Subject | null): string {
  const activities = (subject?.activities ?? view.activities)
    .filter((a) => a.caption)
    .slice(0, MAX_ACTIVITIES);

  const byWeek = new Map<string, ActivityView[]>();
  for (const a of activities) {
    const list = byWeek.get(a.week);
    if (list) list.push(a);
    else byWeek.set(a.week, [a]);
  }

  const roteiro = [...byWeek.entries()]
    .sort((a, b) => (a[1][0]?.weekNum ?? 0) - (b[1][0]?.weekNum ?? 0))
    .map(([week, list]) => `${week}\n${list.map((a) => `  - ${a.caption}`).join("\n")}`)
    .join("\n\n");

  // A preposição entra aqui contraída: com `de ${escopo}` o texto saía
  // "resumo de estudos de a matéria de MAT".
  const escopo = subject
    ? `da matéria de ${subject.label}${subject.professor ? ` (prof. ${subject.professor})` : ""}`
    : "do módulo inteiro";

  return [
    `Sou estudante do Inteli e quero um resumo de estudos ${escopo}.`,
    "",
    "## Contexto",
    `Curso: ${view.section.type ?? "Graduação"}${
      view.section.academicYear ? `, ${view.section.academicYear}º ano` : ""
    }`,
    `Turma: ${view.section.caption}`,
    view.section.projectDescription ? `Projeto do módulo: ${view.section.projectDescription}` : "",
    subject?.axis ? `Eixo: ${subject.axis}` : "",
    "",
    `## Atividades (${activities.length})`,
    roteiro,
    "",
    "## O que eu preciso",
    "1. Um resumo do que esse conjunto de atividades ensina, na ordem em que faz sentido estudar.",
    "2. Os conceitos centrais, explicados de forma concisa.",
    "3. Como os temas se conectam entre si e com o projeto do módulo.",
    "4. O que costuma cair em prova e onde as pessoas erram.",
    "5. Um plano de revisão em passos, do zero até dar conta do módulo.",
    "",
    "Responda em português do Brasil.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}
