"use client";
import { useState, useCallback, useEffect, useMemo } from "react";
import type {
  AppState,
  ItemNota,
  AtividadeNaoReconhecida,
  SimulacaoConfig,
  MetricasModulo,
  ParticipacaoLetra,
  ParticipacaoMultipliers,
} from "@/types/grades";
import { DEFAULT_PARTICIPACAO_MULTIPLIERS } from "@/types/grades";
import { parseAdaloveHtml } from "@/lib/adalove-parser";
import { matchActivities, getCatalog } from "@/lib/catalog-matcher";
import { calcularMetricas } from "@/lib/grade-calculator";
import { loadState, saveState, clearState, DEFAULT_SIMULACAO } from "@/lib/storage";
import { normalize } from "@/lib/normalize";

export function useGradeDashboard() {
  const [items, setItems] = useState<ItemNota[]>([]);
  const [naoReconhecidas, setNaoReconhecidas] = useState<AtividadeNaoReconhecida[]>([]);
  const [simulacao, setSimulacao] = useState<SimulacaoConfig>(DEFAULT_SIMULACAO);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [lastImportAt, setLastImportAt] = useState<string | null>(null);
  const [vinculosManuais, setVinculosManuais] = useState<Record<string, number>>({});
  const [importError, setImportError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [participacao, setParticipacao] = useState<ParticipacaoLetra>("B");
  const [participacaoMultipliers, setParticipacaoMultipliers] =
    useState<ParticipacaoMultipliers>(DEFAULT_PARTICIPACAO_MULTIPLIERS);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const state = loadState();
    if (state.items.length > 0) {
      setItems(state.items);
      setNaoReconhecidas(state.naoReconhecidas);
      setSimulacao(state.simulacao);
      setStudentName(state.studentName);
      setLastImportAt(state.lastImportAt);
      setVinculosManuais(state.vinculosManuais);
    }
    setParticipacao(state.participacao);
    setParticipacaoMultipliers(state.participacaoMultipliers);
    setTheme(state.theme);
    document.documentElement.setAttribute("data-theme", state.theme);
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    saveState({
      items,
      naoReconhecidas,
      simulacao,
      studentName,
      lastImportAt,
      vinculosManuais,
      participacao,
      participacaoMultipliers,
      theme,
    });
  }, [items, naoReconhecidas, simulacao, studentName, lastImportAt, vinculosManuais, participacao, participacaoMultipliers, theme, isHydrated]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      return next;
    });
  }, []);

  const metricas: MetricasModulo | null = useMemo(() => {
    if (items.length === 0) return null;
    return calcularMetricas(items, simulacao);
  }, [items, simulacao]);

  const importHtml = useCallback(
    async (file: File) => {
      setImportError(null);
      try {
        const html = await file.text();
        const payload = parseAdaloveHtml(html);
        const result = matchActivities(payload.activities, vinculosManuais);

        setItems(result.items);
        setNaoReconhecidas(result.naoReconhecidas);
        setStudentName(payload.studentName);
        setLastImportAt(new Date().toISOString());
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erro ao importar HTML";
        setImportError(msg);
      }
    },
    [vinculosManuais]
  );

  const updateNota = useCallback((id: string, nota: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, nota } : item))
    );
  }, []);

  const vincularManualmente = useCallback(
    (naoReconhecidaIndex: number, catalogIndex: number) => {
      const nr = naoReconhecidas[naoReconhecidaIndex];
      if (!nr) return;

      const key = normalize(nr.importada.nome);
      const newVinculos = { ...vinculosManuais, [key]: catalogIndex };
      setVinculosManuais(newVinculos);

      const allImported = [
        ...items
          .filter((i) => i.origem === "importado" || i.origem === "manual")
          .map((i) => ({
            semana: i.semana,
            tipo: i.tipo,
            nome: i.atividade,
            pontos: i.peso,
            nota: i.nota,
          })),
        ...naoReconhecidas.map((nr) => nr.importada),
      ];

      const result = matchActivities(allImported as any, newVinculos);
      setItems(result.items);
      setNaoReconhecidas(result.naoReconhecidas);
    },
    [items, naoReconhecidas, vinculosManuais]
  );

  const resetAll = useCallback(() => {
    clearState();
    setItems([]);
    setNaoReconhecidas([]);
    setSimulacao(DEFAULT_SIMULACAO);
    setStudentName(null);
    setLastImportAt(null);
    setVinculosManuais({});
    setImportError(null);
    setParticipacao("B");
    setParticipacaoMultipliers(DEFAULT_PARTICIPACAO_MULTIPLIERS);
  }, []);

  const exportState = useCallback((): string => {
    const state: AppState = {
      items, naoReconhecidas, simulacao, studentName, lastImportAt,
      vinculosManuais, participacao, participacaoMultipliers, theme,
    };
    return JSON.stringify(state, null, 2);
  }, [items, naoReconhecidas, simulacao, studentName, lastImportAt, vinculosManuais, participacao, participacaoMultipliers, theme]);

  const importState = useCallback((json: string) => {
    try {
      const state = JSON.parse(json) as AppState;
      setItems(state.items || []);
      setNaoReconhecidas(state.naoReconhecidas || []);
      setSimulacao(state.simulacao || DEFAULT_SIMULACAO);
      setStudentName(state.studentName || null);
      setLastImportAt(state.lastImportAt || null);
      setVinculosManuais(state.vinculosManuais || {});
      if (state.participacao) setParticipacao(state.participacao);
      if (state.participacaoMultipliers) setParticipacaoMultipliers(state.participacaoMultipliers);
    } catch {
      setImportError("JSON inválido");
    }
  }, []);

  return {
    items, naoReconhecidas, simulacao, setSimulacao,
    studentName, lastImportAt, metricas, importError, isHydrated,
    importHtml, updateNota, vincularManualmente, resetAll, exportState, importState,
    participacao, setParticipacao,
    participacaoMultipliers, setParticipacaoMultipliers,
    theme, toggleTheme,
  };
}
