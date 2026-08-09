export type TipoAtividade =
  | "Aula"
  | "Ponderada"
  | "Artefato"
  | "Grupo"
  | "Prova"
  | "";

export const TIPOS_VALIDOS: TipoAtividade[] = [
  "Ponderada",
  "Artefato",
  "Aula",
  "Grupo",
  "Prova",
];

export interface AtividadeImportada {
  semana: string;
  tipo: TipoAtividade;
  nome: string;
  pontos: number;
  nota: number | null;
}

export interface AtividadeCatalogo {
  row: number;
  semana: string;
  tipo: TipoAtividade;
  atividade: string;
  peso: number;
  nota: number;
}

export interface ItemNota {
  id: string;
  semana: string;
  tipo: TipoAtividade;
  atividade: string;
  peso: number;
  nota: number | null;
  origem: "catalogo" | "importado" | "manual";
  matchStatus: "matched" | "unmatched" | "manual";
  catalogIndex?: number;
}

export interface AtividadeNaoReconhecida {
  importada: AtividadeImportada;
  vinculoManual?: number;
}

export interface SimulacaoConfig {
  notaAssumida: number;
  notaAssumidaPonderada: number;
  notaAssumidaArtefato: number;
  manterAteOMomento: boolean;
  metaFinal: number;
}

export type ParticipacaoLetra = "A" | "B" | "C" | "D" | "E";

export interface ParticipacaoMultipliers {
  A: number;
  B: number;
  C: number;
  D: number;
  E: number;
}

export const DEFAULT_PARTICIPACAO_MULTIPLIERS: ParticipacaoMultipliers = {
  A: 1.05,
  B: 1.0,
  C: 0.95,
  D: 0.9,
  E: 0.85,
};

export interface MetricasModulo {
  acumuladoPonderadas: number;
  acumuladoArtefatos: number;
  acumuladoAulas: number;
  acumuladoGrupo: number;
  acumuladoProva: number;
  acumuladoTotal: number;
  mediaPonderadasAteOMomento: number | null;
  mediaArtefatosAteOMomento: number | null;
  mediaAulasAteOMomento: number | null;
  mediaGrupoAteOMomento: number | null;
  mediaProvaAteOMomento: number | null;
  mediaTotalAteOMomento: number | null;
  notaNecessariaProva: number;
  notaNecessariaProvaRaw: number;
  provaStatus: "folga" | "aprovado" | "exigente" | "impossivel";
  provaFeita: boolean;
  acumuladoFinalProjetado: number;
  pontosNaoAvaliados: number;
  pontosAvaliados: number;
  pesosPorTipo: Record<string, number>;
}

export interface ParsedAdalovePayload {
  studentName: string | null;
  activities: AtividadeImportada[];
  attendanceRows?: AttendanceRow[];
}

export type PresencaStatus = "presente" | "falta" | "justificado" | "futuro";

export interface AttendanceRow {
  atividade: string;
  semana: string;
  dia: string;
  presencas: PresencaStatus[];
  // Horas de aula de cada chamada (sectionHoursOne/Two/Three da API). No 3º ano
  // vem [1, 1, 2] — a 3ª chamada pesa o dobro. Ausente no import de HTML, que
  // não expõe essa informação; nesse caso cai no toggle manual "3º ano".
  pesos?: number[];
}

export interface AttendanceData {
  totalUnits: number;
  presentes: number;
  faltas: number;
  justificados: number;
  futuros: number;
  maxFaltasAllowed: number;
  faltasRestantes: number;
  percentFaltas: number;
  // true quando os pesos vieram da API (em horas de aula) e não do toggle manual.
  pesosAutomaticos?: boolean;
  // Quanto ainda dá pra faltar, traduzido em chamadas de cada peso. No 3º ano
  // sai [{ peso: 2, slots: N }, { peso: 1, slots: M }] — N aulas OU M dev/AE.
  // Só é preenchido quando existe mais de um peso em jogo.
  faltasRestantesPorPeso?: { peso: number; slots: number }[];
}

export interface AppState {
  items: ItemNota[];
  naoReconhecidas: AtividadeNaoReconhecida[];
  simulacao: SimulacaoConfig;
  studentName: string | null;
  lastImportAt: string | null;
  vinculosManuais: Record<string, number>;
  participacao: ParticipacaoLetra;
  participacaoMultipliers: ParticipacaoMultipliers;
  theme: "dark" | "light";
  attendance: AttendanceData | null;
  attendanceRows: AttendanceRow[] | null;
  attendanceUltimaPeso2: boolean;
}
