"use client";
import { useRef } from "react";
import { useGradeDashboard } from "@/hooks/useGradeDashboard";
import StudentHeader from "@/components/dashboard/StudentHeader";
import HtmlUpload from "@/components/import/HtmlUpload";
import MetricCard from "@/components/dashboard/MetricCard";
import DistributionChart from "@/components/dashboard/DistributionChart";
import ProgressBars from "@/components/dashboard/ProgressBars";
import ActivitiesTable from "@/components/table/ActivitiesTable";
import UnknownActivitiesPanel from "@/components/table/UnknownActivitiesPanel";
import SimulationPanel from "@/components/simulation/SimulationPanel";
import { fmtNota } from "@/lib/format";
import styles from "./page.module.css";

export default function Home() {
  const {
    items, naoReconhecidas, simulacao, setSimulacao,
    studentName, lastImportAt, metricas, importError, isHydrated,
    importHtml, updateNota, vincularManualmente, resetAll, exportState, importState,
    participacao, setParticipacao,
    participacaoMultipliers, setParticipacaoMultipliers,
    theme, toggleTheme,
    effectiveMetaFinal,
  } = useGradeDashboard();

  const importInputRef = useRef<HTMLInputElement>(null);

  if (!isHydrated) return null;

  const hasData = items.length > 0;

  const handleExport = () => {
    const json = exportState();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "grades-inteli-state.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((json) => importState(json));
    e.target.value = "";
  };

  const upload = (
    <div className={styles.headerActions}>
      <HtmlUpload onImport={importHtml} error={importError} />
      <button
        className={styles.themeBtn}
        onClick={toggleTheme}
        title={theme === "dark" ? "Modo claro" : "Modo escuro"}
      >
        {theme === "dark" ? "☀" : "☾"}
      </button>
    </div>
  );

  if (!hasData || !metricas) {
    return (
      <div className={styles.emptyContainer}>
        <StudentHeader
          studentName={studentName}
          lastImportAt={lastImportAt}
          uploadSlot={upload}
        />
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>
            Importe um HTML exportado do Adalove para começar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <StudentHeader
        studentName={studentName}
        lastImportAt={lastImportAt}
        uploadSlot={upload}
      />

      <div className={styles.dashboard}>
        <div className={styles.main}>
          <div className={styles.metricsGrid}>
            <MetricCard
              label="Total acumulado"
              value={fmtNota(metricas.acumuladoTotal, 3)}
              sub={`de ${(Object.values(metricas.pesosPorTipo).reduce((a, b) => a + b, 0) * 10).toFixed(1)} pts possíveis`}
              breakdowns={[
                { label: "Pond.", value: fmtNota(metricas.acumuladoPonderadas, 3) },
                { label: "Artef.", value: fmtNota(metricas.acumuladoArtefatos, 3) },
                { label: "Prova", value: fmtNota(metricas.acumuladoProva, 3) },
              ]}
            />
            <MetricCard
              label="Média até o momento"
              value={
                metricas.mediaTotalAteOMomento !== null
                  ? fmtNota(metricas.mediaTotalAteOMomento)
                  : "—"
              }
              breakdowns={[
                { label: "Pond.", value: metricas.mediaPonderadasAteOMomento !== null ? fmtNota(metricas.mediaPonderadasAteOMomento) : "—" },
                { label: "Artef.", value: metricas.mediaArtefatosAteOMomento !== null ? fmtNota(metricas.mediaArtefatosAteOMomento) : "—" },
                { label: "Prova", value: metricas.mediaProvaAteOMomento !== null ? fmtNota(metricas.mediaProvaAteOMomento) : "—" },
              ]}
            />
            <MetricCard
              label={`Nota na prova p/ ${simulacao.metaFinal.toFixed(1)}`}
              value={fmtNota(metricas.notaNecessariaProva)}
              variant={
                metricas.provaStatus === "aprovado"
                  ? "success"
                  : metricas.provaStatus === "exigente"
                    ? "warning"
                    : "danger"
              }
            />
            <MetricCard
              label="Projeção final"
              value={fmtNota(metricas.acumuladoFinalProjetado)}
            />
          </div>

          <div className={styles.categoryCards}>
            <MetricCard
              label="Ponderadas"
              value={fmtNota(metricas.acumuladoPonderadas, 3)}
              sub={
                metricas.mediaPonderadasAteOMomento !== null
                  ? `média ${fmtNota(metricas.mediaPonderadasAteOMomento)}`
                  : "sem nota"
              }
              accent="var(--blue)"
            />
            <MetricCard
              label="Artefatos"
              value={fmtNota(metricas.acumuladoArtefatos, 3)}
              sub={
                metricas.mediaArtefatosAteOMomento !== null
                  ? `média ${fmtNota(metricas.mediaArtefatosAteOMomento)}`
                  : "sem nota"
              }
              accent="var(--green)"
            />
            <MetricCard
              label="Prova"
              value={fmtNota(metricas.acumuladoProva, 3)}
              sub={
                metricas.mediaProvaAteOMomento !== null
                  ? `média ${fmtNota(metricas.mediaProvaAteOMomento)}`
                  : "sem nota"
              }
              accent="var(--orange)"
            />
          </div>

          <div className={styles.chartsRow}>
            <DistributionChart pesosPorTipo={metricas.pesosPorTipo} />
            <ProgressBars items={items} />
          </div>

          <SimulationPanel
            simulacao={simulacao}
            onSimulacaoChange={setSimulacao}
            metricas={metricas}
            participacao={participacao}
            multipliers={participacaoMultipliers}
            onParticipacaoChange={setParticipacao}
            onMultipliersChange={setParticipacaoMultipliers}
            effectiveMetaFinal={effectiveMetaFinal}
          />

          {naoReconhecidas.length > 0 && (
            <UnknownActivitiesPanel
              naoReconhecidas={naoReconhecidas}
              onVincular={vincularManualmente}
            />
          )}

          <div className={styles.actions}>
            <button className={styles.actionBtn} onClick={handleExport}>
              Exportar JSON
            </button>
            <button
              className={styles.actionBtn}
              onClick={() => importInputRef.current?.click()}
            >
              Importar JSON
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".json"
              onChange={handleImportJson}
              style={{ display: "none" }}
            />
            <button
              className={`${styles.actionBtn} ${styles.dangerBtn}`}
              onClick={() => {
                if (confirm("Resetar todos os dados?")) resetAll();
              }}
            >
              Resetar
            </button>
            <span className={styles.credit}>Criado por Henrique Barone</span>
          </div>
        </div>

        <aside className={styles.sidebar}>
          <h2 className={styles.sidebarTitle}>Atividades</h2>
          <ActivitiesTable items={items} onNotaChange={updateNota} />
        </aside>
      </div>
    </div>
  );
}
