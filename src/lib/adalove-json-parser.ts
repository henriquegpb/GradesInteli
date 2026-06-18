import type { TipoAtividade, AtividadeImportada, ParsedAdalovePayload } from "@/types/grades";

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
  exam?: number;
}

interface AdaloveApiStudent {
  uuid: string;
  name: string;
  avatar_filename: string | null;
}

interface AdaloveApiResponse {
  section?: { sectionCaption?: string };
  students?: AdaloveApiStudent[];
  activities?: AdaloveApiActivity[];
}

// Classificação por nome — independe do código numérico `type`, que é instável
// e ainda não mapeamos por completo. O nome é o que o aluno lê na tela.
function inferTipo(caption: string): TipoAtividade {
  const c = caption.toLowerCase();
  if (/artefato/.test(c)) return "Artefato";
  if (/ponderad/.test(c)) return "Ponderada";
  if (/\bprova\b|prova do m[oó]dulo/.test(c)) return "Prova";
  if (/em grupo|trabalho em grupo/.test(c)) return "Grupo";
  return "Aula";
}

function parseSemana(folderCaption: string): string {
  const m = (folderCaption || "").match(/(\d+)/);
  if (!m) return "";
  const n = parseInt(m[1], 10);
  return n ? "S" + n : "";
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

  const mapped: AtividadeImportada[] = activities.map((a) => ({
    semana: parseSemana(a.folderCaption),
    tipo: inferTipo(a.caption || ""),
    nome: (a.caption || "").trim(),
    // gradeWeight já vem na escala correta (ex.: Artefato = 4), confirmado via API.
    // Diferente do HTML, que vinha em centésimos e exigia /100.
    pontos: typeof a.gradeWeight === "number" ? a.gradeWeight : 0,
    nota: parseNota(a.gradeResult),
  }));

  return { studentName, activities: mapped };
}
