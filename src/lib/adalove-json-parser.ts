import type {
  TipoAtividade,
  AtividadeImportada,
  AttendanceRow,
  ParsedAdalovePayload,
  PresencaStatus,
} from "@/types/grades";

// ---------------------------------------------------------------------------
// Parser do JSON da API do Adalove (endpoint /sections/{uuid}/userdata).
// Produz o MESMO ParsedAdalovePayload que o parser de HTML, então o resto do
// app não muda. Esta é a base da integração direta (extensão Opção B).
// ---------------------------------------------------------------------------

interface AdaloveApiActivity {
  caption: string;
  type: number;
  gradeWeight: number;
  gradeResult: string; // "-1.0" quando não avaliada
  evaluated: number;
  folderCaption: string; // ex.: "Semana 06"
  studentUuid: string;
  sort?: number; // ordem da atividade dentro da semana
  exam?: number;
  date?: string | null;
  attendance1?: number | string | null;
  attendance2?: number | string | null;
  attendance3?: number | string | null;
  absenceAllowanceType?: number | string | null;
  absenceAllowanceTypeName?: string | null;
  absenceAllowanceReason?: string | null;
  absenceAllowanceUuid?: string | null;
  absencePeriod?: number | string | null;
  ticketNumber?: number | string | null;
}

interface AdaloveApiStudent {
  uuid: string;
  name: string;
  avatar_filename: string | null;
}

interface AdaloveApiSection {
  sectionCaption?: string;
  // Horas de aula de cada chamada do dia. No 3º ano vem 1 / 1 / 2.
  sectionHoursOne?: number | string | null;
  sectionHoursTwo?: number | string | null;
  sectionHoursThree?: number | string | null;
}

interface AdaloveApiResponse {
  section?: AdaloveApiSection;
  students?: AdaloveApiStudent[];
  activities?: AdaloveApiActivity[];
}

// Só encontros têm chamada: type 1 (Sprint Review/Planning, prova, workshop) e
// type 2 (aulas/autoestudos). Os demais (11 = material, 21 = artefato, 31 =
// avaliação geral) carregam attendance -1 mas não entram no cálculo de faltas.
const ENCONTRO_TYPES = new Set([1, 2]);

// Classificação. O `type` numérico manda, porque é o campo em que o Adalove
// guarda a natureza da atividade: 21 "Desenvolvimento de Projetos" e 92
// "Projeto" são os artefatos do módulo, quaisquer que sejam os títulos.
//
// Isso é o que faz turmas fora do CC funcionarem. Em GRAD CC os artefatos vêm
// batizados "Artefato 01: …" e o nome bastava; em GRAD SI os MESMOS `type: 21`
// se chamam "Entendimento do Negócio", "Testes Unitários", "Estratégia de Cut
// Over" — sem a palavra artefato em nenhum. Pelo nome, os 40% de artefatos do
// módulo caíam inteiros em Ponderada.
//
// O nome fica como desempate para o que o `type` não separa: `type: 11`
// (Autoestudo) cobre tanto material sem peso quanto ponderada avaliada, então
// atividade com peso e sem outro sinal é Ponderada, não Aula.
const ARTEFATO_TYPES = new Set([21, 92]);

// `type: 31` ("Avaliação e Pesquisa") é a Autoavaliação do módulo: "Autoavaliação"
// e "Avaliação em pares" valem nota em GRAD SI (3% + 2%) e são a categoria que o
// Adalove pinta de verde. Não existia aqui, então esses pontos entravam como
// ponderada e sujavam a média de ponderadas.
const AUTOAVALIACAO_TYPES = new Set([31]);

function inferTipo(activity: AdaloveApiActivity): TipoAtividade {
  const c = (activity.caption || "").toLowerCase();
  if (activity.exam === 1 || /\bprova\b|prova do m[oó]dulo/.test(c)) return "Prova";
  if (typeof activity.type === "number" && ARTEFATO_TYPES.has(activity.type)) return "Artefato";
  if (typeof activity.type === "number" && AUTOAVALIACAO_TYPES.has(activity.type)) {
    return "Autoavaliação";
  }
  if (/autoavalia|avalia[cç][aã]o em pares/.test(c)) return "Autoavaliação";
  // "Artefato 1", "Art. 1", "Art.1", "Art 1 [WAD]"
  if (/artefato|\bart\.?\s*\d/.test(c)) return "Artefato";
  if (/em grupo|trabalho em grupo/.test(c)) return "Grupo";
  if (/ponderad/.test(c)) return "Ponderada";
  if (typeof activity.gradeWeight === "number" && activity.gradeWeight > 0) return "Ponderada";
  return "Aula";
}

function parseSemana(folderCaption: string): string {
  const m = (folderCaption || "").match(/(\d+)/);
  if (!m) return "";
  const n = parseInt(m[1], 10);
  return n ? "S" + n : "";
}

function parseDia(date?: string | null): string {
  const m = (date || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}` : "";
}

function hasAllowance(activity: AdaloveApiActivity, slot: number): boolean {
  const period = activity.absencePeriod;
  const periodMatches =
    period == null ||
    period === "" ||
    Number(period) === slot;

  return Boolean(
    periodMatches &&
      (activity.absenceAllowanceUuid ||
        activity.absenceAllowanceType ||
        activity.absenceAllowanceTypeName ||
        activity.absenceAllowanceReason ||
        activity.ticketNumber)
  );
}

function parseAttendanceValue(
  value: number | string | null | undefined,
  activity: AdaloveApiActivity,
  slot: number
): PresencaStatus {
  const n = Number(value);
  if (Number.isNaN(n) || n < 0) return "futuro";
  if (n > 0) return "presente";
  return hasAllowance(activity, slot) ? "justificado" : "falta";
}

function hasAttendanceSlots(activity: AdaloveApiActivity): boolean {
  return [activity.attendance1, activity.attendance2, activity.attendance3].some(
    (value) => value !== undefined && value !== null
  );
}

// Todos os encontros do módulo entram, inclusive os que ainda não aconteceram —
// o denominador da % de faltas do Adalove é o módulo inteiro, não só o que já
// passou. Encontros futuros entram como "futuro" e não contam como falta.
function shouldImportAttendance(activity: AdaloveApiActivity): boolean {
  return ENCONTRO_TYPES.has(activity.type) && hasAttendanceSlots(activity);
}

// Horas de cada chamada, vindas da section. Ausentes ou inválidas => sem pesos,
// e o resumo cai no comportamento antigo (1 por chamada / toggle manual).
function parseSectionHours(section?: AdaloveApiSection): number[] | null {
  const raw = [
    section?.sectionHoursOne,
    section?.sectionHoursTwo,
    section?.sectionHoursThree,
  ];
  const hours = raw.map((v) => Number(v));
  if (hours.some((h) => !Number.isFinite(h) || h <= 0)) return null;
  return hours;
}

function parseAttendanceRows(
  activities: AdaloveApiActivity[],
  sectionHours: number[] | null
): AttendanceRow[] {
  return activities
    .filter(shouldImportAttendance)
    .sort(
      (a, b) =>
        weekNum(a.folderCaption) - weekNum(b.folderCaption) ||
        (a.sort ?? 0) - (b.sort ?? 0)
    )
    .map((a) => {
      const slots = [a.attendance1, a.attendance2, a.attendance3]
        .map((value, i) => ({ value, i }))
        .filter(({ value }) => value !== undefined && value !== null);

      return {
        atividade: (a.caption || "").trim(),
        semana: parseSemana(a.folderCaption),
        dia: parseDia(a.date),
        presencas: slots.map(({ value, i }) => parseAttendanceValue(value, a, i + 1)),
        // Alinhado 1:1 com `presencas` — chamadas ausentes não geram peso.
        ...(sectionHours ? { pesos: slots.map(({ i }) => sectionHours[i]) } : {}),
      };
    })
    .filter((row) => row.atividade && row.presencas.length > 0);
}

// Número da semana para ordenação (sem semana vai para o fim).
function weekNum(folderCaption: string): number {
  const m = (folderCaption || "").match(/(\d+)/);
  return m ? parseInt(m[1], 10) : Number.POSITIVE_INFINITY;
}

function parseNota(gradeResult: string): number | null {
  if (gradeResult == null) return null;
  const v = parseFloat(String(gradeResult).replace(",", "."));
  // "-1.0" (e qualquer valor negativo) significa "ainda não avaliada".
  if (isNaN(v) || v < 0) return null;
  return v;
}

export function parseAdaloveJson(jsonText: string): ParsedAdalovePayload {
  let data: AdaloveApiResponse;
  try {
    const parsed = typeof jsonText === "string" ? JSON.parse(jsonText) : jsonText;
    // Aceita tanto o objeto userdata cru quanto um wrapper { ..., body } eventual.
    data = (parsed && parsed.activities ? parsed : parsed?.section ? parsed : parsed) as AdaloveApiResponse;
  } catch {
    throw new Error("JSON inválido. Cole a resposta do endpoint /userdata do Adalove.");
  }

  const activities = data.activities;
  if (!Array.isArray(activities) || activities.length === 0) {
    throw new Error("Nenhuma atividade encontrada no JSON do Adalove.");
  }

  // As atividades retornadas são do próprio aluno logado: todas compartilham o
  // mesmo studentUuid. Usamos ele para descobrir o nome na lista de students.
  const studentUuid = activities[0]?.studentUuid;
  const studentName =
    data.students?.find((s) => s.uuid === studentUuid)?.name?.trim() || null;

  const mapped: AtividadeImportada[] = activities
    // Considera apenas atividades com peso atrelado (avaliadas). Aulas e
    // autoestudos têm gradeWeight 0 e não entram no cálculo — igual ao HTML.
    .filter((a) => typeof a.gradeWeight === "number" && a.gradeWeight > 0)
    // Ordena por semana (S1, S2, S3…) e, dentro da semana, pelo campo `sort`
    // da API — para ficar igual à ordem do HTML, que já vinha ordenado.
    .sort(
      (a, b) =>
        weekNum(a.folderCaption) - weekNum(b.folderCaption) ||
        (a.sort ?? 0) - (b.sort ?? 0)
    )
    .map((a) => ({
      semana: parseSemana(a.folderCaption),
      tipo: inferTipo(a),
      nome: (a.caption || "").trim(),
      // O HTML guarda o peso em centésimos (peso/100); a API entrega o valor
      // cheio (Artefato = 4). Dividimos por 100 para que API e HTML produzam
      // exatamente os mesmos acumulados e percentuais.
      pontos: a.gradeWeight / 100,
      nota: parseNota(a.gradeResult),
    }));

  const attendanceRows = parseAttendanceRows(activities, parseSectionHours(data.section));

  return { studentName, activities: mapped, attendanceRows };
}
