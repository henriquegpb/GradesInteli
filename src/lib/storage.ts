import type { AppState, SimulacaoConfig, ParticipacaoMultipliers } from "@/types/grades";
import { DEFAULT_PARTICIPACAO_MULTIPLIERS } from "@/types/grades";

const STORAGE_KEY = "grades-inteli-state";

const DEFAULT_SIMULACAO: SimulacaoConfig = {
  notaAssumida: 7,
  manterAteOMomento: true,
  metaFinal: 7,
};

function defaultState(): AppState {
  return {
    items: [],
    naoReconhecidas: [],
    simulacao: DEFAULT_SIMULACAO,
    studentName: null,
    lastImportAt: null,
    vinculosManuais: {},
    participacao: "B",
    participacaoMultipliers: DEFAULT_PARTICIPACAO_MULTIPLIERS,
    theme: "dark",
  };
}

export function loadState(): AppState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const defaults = defaultState();
    return {
      ...defaults,
      ...parsed,
      simulacao: { ...defaults.simulacao, ...(parsed.simulacao || {}) },
      participacaoMultipliers: { ...defaults.participacaoMultipliers, ...(parsed.participacaoMultipliers || {}) },
    };
  } catch {
    return defaultState();
  }
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage full or unavailable
  }
}

export function clearState(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export { DEFAULT_SIMULACAO };
