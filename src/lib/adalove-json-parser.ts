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
  sort?: number; // ordem da atividade dentro da semana
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

// Classificação por nome. O `type` numérico da API não separa perfeitamente
// aulas e ponderadas: em payloads reais, `type: 11` aparece tanto em materiais
// sem peso quanto em atividades ponderadas. Como aulas/autoestudos com peso 0
// são filtrados antes do cálculo, atividade avaliada sem outro sinal explícito
// deve cair como Ponderada, não Aula.
function inferTipo(activity: AdaloveApiActivity): TipoAtividade {
  const c = (activity.caption || "").toLowerCase();
  // "Artefato 1", "Art. 1", "Art.1", "Art 1 [WAD]"
  if (/\bprova\b|prova do m[oó]dulo/.test(c) || activity.exam === 1) return "Prova";
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

  return { studentName, activities: mapped };
}
