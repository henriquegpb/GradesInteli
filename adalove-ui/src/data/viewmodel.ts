import { parseAdaloveJson } from "@/lib/adalove-json-parser";
import { summarizeAttendanceRows } from "@/lib/attendance-parser";
import { calcularMetricas } from "@/lib/grade-calculator";
import { DEFAULT_SIMULACAO } from "@/lib/storage";
import { htmlToText } from "~/lib/sanitize";
import type {
  AttendanceData,
  AttendanceRow,
  ItemNota,
  MetricasModulo,
  SimulacaoConfig,
  TipoAtividade,
} from "@/types/grades";
import { kindOf, type ActivityKind } from "~/data/activityTypes";
import type { ActivityStatus, RawActivity, RawStudent, RawUserdata } from "~/data/types";

// Duas passadas sobre o MESMO payload:
//
//  • notas/métricas → delega a parseAdaloveJson + calcularMetricas, os módulos
//    que o site já usa em produção. Zero lógica de nota reescrita aqui — é onde
//    bug dói e onde duas implementações divergiriam em silêncio.
//  • kanban/tabela/modal → mapeamento próprio, sem o filtro de gradeWeight > 0,
//    porque o kanban precisa das 200 atividades e não só das 29 avaliadas.

export interface ActivityView {
  id: string;
  activityUuid: string;
  caption: string;
  descriptionHtml: string | null;
  descriptionText: string;
  status: ActivityStatus;
  sort: number;
  kind: ActivityKind;
  /** Categoria de nota (Ponderada/Artefato/Prova/…) — eixo diferente de `kind`. */
  category: TipoAtividade;
  weight: number;
  grade: number | null;
  evaluated: boolean;
  feedback: string | null;
  feedbackGroup: string | null;
  question: string | null;
  answer: string | null;
  assistant: string | null;
  notes: string | null;
  positivePoints: string | null;
  negativePoints: string | null;
  rating: number | null;
  /** "class" = em sala, "weekly" = ao longo da semana. */
  studyType: string | null;
  week: string;
  weekNum: number;
  date: string | null;
  professor: string | null;
  axis: string | null;
  tags: string[];
  favorite: boolean;
  required: boolean;
  isExam: boolean;
  url: string | null;
}

export interface WeekGroup {
  key: string;
  label: string;
  num: number;
  activities: ActivityView[];
}

export interface SectionView {
  studentName: string | null;
  section: {
    caption: string;
    academicYear: string | null;
    type: string | null;
    advisor: string | null;
    project: string | null;
    projectDescription: string | null;
    /** Pasta do Drive da turma (`sectionRepository`). */
    repository: string | null;
    allowCardMovement: boolean;
  };
  group: { caption: string | null; members: RawStudent[] };
  classmates: RawStudent[];
  activities: ActivityView[];
  weeks: WeekGroup[];
  axes: string[];
  kinds: ActivityKind[];
  items: ItemNota[];
  metrics: MetricasModulo | null;
  attendance: AttendanceData | null;
  attendanceRows: AttendanceRow[];
  summary: {
    evaluationResult: number | null;
    absencesPercentage: number | null;
    absencesCount: number | null;
  };
}

/** Mesma cascata do parser do site, aplicada a TODAS as atividades. */
function inferCategory(a: RawActivity): TipoAtividade {
  const caption = (a.caption || "").toLowerCase();
  if (a.exam === 1 || /prova|exame/.test(caption)) return "Prova";
  if (/artefato|art\.\s?\d/.test(caption)) return "Artefato";
  if (/em grupo/.test(caption)) return "Grupo";
  if (/ponderad/.test(caption)) return "Ponderada";
  if ((a.gradeWeight ?? 0) > 0) return "Ponderada";
  return "Aula";
}

function weekNumber(folderCaption: string | null): number {
  const m = /(\d+)/.exec(folderCaption ?? "");
  return m ? Number(m[1]) : 0;
}

function parseGrade(value: string | null): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isNaN(n) || n < 0 ? null : n;
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

/** O Adalove repete o título no começo da descrição, às vezes com um prefixo
 *  ("Artefato 01: Artefato 01: Pipeline…"). Procuramos o caption na abertura do
 *  texto e cortamos até o fim dele — economiza espaço no prompt e limpa o modal. */
const TITLE_SEARCH_WINDOW = 150;

function stripLeadingTitle(text: string, caption: string): string {
  const title = caption.trim();
  if (title.length < 8) return text;

  const at = text.slice(0, TITLE_SEARCH_WINDOW + title.length).toLowerCase().indexOf(title.toLowerCase());
  if (at === -1 || at > TITLE_SEARCH_WINDOW) return text;

  const rest = text.slice(at + title.length).replace(/^[\s.:;–—-]+/, "");
  // Se sobrar quase nada, a descrição ERA só o título: melhor não ter descrição.
  return rest.length < 20 ? "" : rest;
}

function toActivityView(a: RawActivity): ActivityView {
  const caption = (a.caption || "").trim();
  const text = a.description ? htmlToText(a.description) : "";

  return {
    id: a.studentActivityUuid,
    activityUuid: a.activityUuid,
    caption,
    descriptionHtml: a.description,
    descriptionText: stripLeadingTitle(text, caption),
    status: (a.status ?? 1) as ActivityStatus,
    sort: a.sort ?? 0,
    kind: kindOf(a.type),
    category: inferCategory(a),
    weight: a.gradeWeight ?? 0,
    grade: parseGrade(a.gradeResult),
    evaluated: a.evaluated === 1,
    feedback: a.activityFeedback,
    feedbackGroup: a.activityFeedbackGroup,
    question: a.studyQuestion,
    answer: a.studyAnswer,
    assistant: a.assistantProfessorName,
    notes: a.activityNotes,
    positivePoints: a.activityPositivePoints,
    negativePoints: a.activityNegativePoints,
    rating: a.activityRating,
    studyType: a.study_type,
    week: a.folderCaption ?? "Sem semana",
    weekNum: weekNumber(a.folderCaption),
    date: a.date,
    professor: a.professorName,
    axis: a.axisCaption,
    tags: (a.activityTags || "").split(",").map((t) => t.trim()).filter(Boolean),
    favorite: a.favorite === 1,
    required: a.required === 1,
    isExam: a.exam === 1,
    url: a.basicActivityURL,
  };
}

export function buildSectionView(
  raw: RawUserdata,
  simulacao: SimulacaoConfig = DEFAULT_SIMULACAO,
): SectionView {
  const rawActivities = Array.isArray(raw.activities) ? raw.activities : [];

  const activities = rawActivities
    .map(toActivityView)
    .sort((a, b) => a.weekNum - b.weekNum || a.sort - b.sort);

  // ---- notas e faltas: reusa a implementação do site -----------------------
  let items: ItemNota[] = [];
  let attendanceRows: AttendanceRow[] = [];
  try {
    const payload = parseAdaloveJson(JSON.stringify(raw));
    items = payload.activities.map((a, i) => ({
      id: `imp-${i}`,
      semana: a.semana,
      tipo: a.tipo,
      atividade: a.nome,
      peso: a.pontos,
      nota: a.nota,
      origem: "importado" as const,
      matchStatus: "matched" as const,
    }));
    attendanceRows = payload.attendanceRows ?? [];
  } catch {
    // Turma sem nenhuma atividade avaliada ainda: kanban e materiais seguem
    // funcionando, só as métricas ficam vazias.
  }

  const ultimaPesoDois = (raw.section?.sectionHoursThree ?? 1) > 1;
  const attendance = attendanceRows.length
    ? summarizeAttendanceRows(attendanceRows, ultimaPesoDois)
    : null;
  const metrics = items.length ? calcularMetricas(items, simulacao) : null;

  // ---- agrupamentos e filtros ---------------------------------------------
  const byWeek = new Map<string, ActivityView[]>();
  for (const a of activities) {
    const list = byWeek.get(a.week);
    if (list) list.push(a);
    else byWeek.set(a.week, [a]);
  }
  const weeks: WeekGroup[] = [...byWeek.entries()]
    .map(([label, list]) => ({
      key: label,
      label,
      num: list[0]?.weekNum ?? 0,
      activities: list,
    }))
    .sort((a, b) => a.num - b.num);

  const axes = [...new Set(activities.map((a) => a.axis).filter((x): x is string => !!x))].sort();
  const kinds = [...new Map(activities.map((a) => [a.kind.id, a.kind])).values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const studentUuid = rawActivities[0]?.studentUuid;
  const students = Array.isArray(raw.students) ? raw.students : [];
  const me = students.find((s) => s.uuid === studentUuid);
  const groupUuid = raw.group?.groupUuid ?? me?.groupUuid ?? null;

  return {
    studentName: me?.name?.trim() ?? null,
    section: {
      caption: raw.section?.sectionCaption ?? "Turma",
      academicYear: raw.section?.sectionAcademicYear ?? null,
      type: raw.section?.sectionType ?? null,
      advisor: (raw.section?.advisorName as string | null) ?? null,
      project: (raw.section?.projectCaption as string | null) ?? null,
      projectDescription: (raw.section?.projectDescription as string | null) ?? null,
      repository: (raw.section?.sectionRepository as string | null) ?? null,
      // O Adalove pode travar o kanban por turma; respeitamos a mesma regra.
      allowCardMovement: raw.section?.sectionAllowCardMovement !== 0,
    },
    group: {
      caption: raw.group?.groupCaption ?? me?.groupCaption ?? null,
      members: groupUuid ? students.filter((s) => s.groupUuid === groupUuid) : [],
    },
    classmates: students,
    activities,
    weeks,
    axes,
    kinds,
    items,
    metrics,
    attendance,
    attendanceRows,
    summary: {
      evaluationResult: toNumber(raw.studentStatus?.evaluationResult),
      absencesPercentage: toNumber(raw.studentStatus?.absencesPercentage),
      absencesCount: raw.studentStatus?.absencesCount ?? null,
    },
  };
}
