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
  AttendanceData,
  AttendanceRow,
} from "@/types/grades";
import { DEFAULT_PARTICIPACAO_MULTIPLIERS } from "@/types/grades";
import { parseAdaloveHtml } from "@/lib/adalove-parser";
import { extractAttendanceRows, summarizeAttendanceRows } from "@/lib/attendance-parser";
import { calcularMetricas } from "@/lib/grade-calculator";
import { loadState, saveState, clearState, DEFAULT_SIMULACAO } from "@/lib/storage";

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
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[] | null>(null);
  const [attendanceUltimaPeso2, setAttendanceUltimaPeso2] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

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
    const ultima = state.attendanceUltimaPeso2 ?? false;
    setAttendanceUltimaPeso2(ultima);
    if (state.attendanceRows && state.attendanceRows.length > 0) {
      setAttendanceRows(state.attendanceRows);
      setAttendance(summarizeAttendanceRows(state.attendanceRows, ultima));
    } else if (state.attendance) {
      setAttendance(state.attendance);
    }
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
      attendance,
      attendanceRows,
      attendanceUltimaPeso2,
    });
  }, [items, naoReconhecidas, simulacao, studentName, lastImportAt, vinculosManuais, participacao, participacaoMultipliers, theme, attendance, attendanceRows, attendanceUltimaPeso2, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    if (attendanceRows && attendanceRows.length > 0) {
      setAttendance(summarizeAttendanceRows(attendanceRows, attendanceUltimaPeso2));
    }
  }, [isHydrated, attendanceRows, attendanceUltimaPeso2]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      return next;
    });
  }, []);

  const effectiveMetaFinal = useMemo(() => {
    const mult = participacaoMultipliers[participacao];
    return mult !== 0 ? simulacao.metaFinal / mult : simulacao.metaFinal;
  }, [simulacao.metaFinal, participacao, participacaoMultipliers]);

  const metricas: MetricasModulo | null = useMemo(() => {
    if (items.length === 0) return null;
    const adjusted = { ...simulacao, metaFinal: effectiveMetaFinal };
    return calcularMetricas(items, adjusted);
  }, [items, simulacao, effectiveMetaFinal]);

  const importHtml = useCallback(
    async (file: File) => {
      setImportError(null);
      try {
        const html = await file.text();
        const payload = parseAdaloveHtml(html);

        const newItems: ItemNota[] = payload.activities.map((a, i) => ({
          id: `imp-${i}`,
          semana: a.semana,
          tipo: a.tipo,
          atividade: a.nome,
          peso: a.pontos,
          nota: a.nota,
          origem: "importado" as const,
          matchStatus: "matched" as const,
        }));

        setItems(newItems);
        setNaoReconhecidas([]);
        setVinculosManuais({});
        setStudentName(payload.studentName);
        setLastImportAt(new Date().toISOString());
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erro ao importar HTML";
        setImportError(msg);
      }
    },
    []
  );

  const importAttendanceHtml = useCallback(async (file: File) => {
    setAttendanceError(null);
    try {
      const html = await file.text();
      setAttendanceRows(extractAttendanceRows(html));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao importar faltas";
      setAttendanceError(msg);
    }
  }, []);

  const setAttendanceUltimaPeso2Flag = useCallback((v: boolean) => {
    setAttendanceUltimaPeso2(v);
  }, []);

  const updateNota = useCallback((id: string, nota: number | null) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, nota } : item))
    );
  }, []);

  const vincularManualmente = useCallback(
    (_naoReconhecidaIndex: number, _catalogIndex: number) => {},
    []
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
    setAttendance(null);
    setAttendanceRows(null);
    setAttendanceUltimaPeso2(false);
    setAttendanceError(null);
  }, []);

  const exportState = useCallback((): string => {
    const state: AppState = {
      items, naoReconhecidas, simulacao, studentName, lastImportAt,
      vinculosManuais, participacao, participacaoMultipliers, theme, attendance,
      attendanceRows, attendanceUltimaPeso2,
    };
    return JSON.stringify(state, null, 2);
  }, [items, naoReconhecidas, simulacao, studentName, lastImportAt, vinculosManuais, participacao, participacaoMultipliers, theme, attendance, attendanceRows, attendanceUltimaPeso2]);

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
      if (state.attendanceRows?.length) {
        setAttendanceRows(state.attendanceRows);
      } else if (state.attendance) {
        setAttendance(state.attendance);
      }
      if (state.attendanceUltimaPeso2 !== undefined) {
        setAttendanceUltimaPeso2(state.attendanceUltimaPeso2);
      }
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
    effectiveMetaFinal,
    attendance, importAttendanceHtml, attendanceError,
    attendanceUltimaPeso2, setAttendanceUltimaPeso2Flag,
  };
}
