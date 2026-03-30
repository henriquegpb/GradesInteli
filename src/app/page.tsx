"use client";
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
    importHtml, updateNota, vincularManualmente, resetAll,
    participacao, setParticipacao,
    participacaoMultipliers, setParticipacaoMultipliers,
    theme, toggleTheme,
    effectiveMetaFinal,
  } = useGradeDashboard();

  if (!isHydrated) return null;

  const hasData = items.length > 0;

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
            />
            <MetricCard
              label="Média até o momento"
              value={
                metricas.mediaTotalAteOMomento !== null
                  ? fmtNota(metricas.mediaTotalAteOMomento)
                  : "—"
              }
            />
          </div>

          <div className={styles.categoryCards}>
            <div className={styles.dualCard} style={{ borderTopColor: "var(--color-ponderada)" }}>
              <span className={styles.dualLabel}>Ponderadas</span>
              <div className={styles.dualBody}>
                <div className={styles.dualCol}>
                  <span className={styles.dualSubLabel}>Acumulado</span>
                  <span className={styles.dualValue}>{fmtNota(metricas.acumuladoPonderadas, 3)}</span>
                </div>
                <div className={styles.dualDivider} />
                <div className={styles.dualCol}>
                  <span className={styles.dualSubLabel}>Até o momento</span>
                  <span className={styles.dualValue}>
                    {metricas.mediaPonderadasAteOMomento !== null ? fmtNota(metricas.mediaPonderadasAteOMomento) : "—"}
                  </span>
                </div>
              </div>
            </div>
            <div className={styles.dualCard} style={{ borderTopColor: "var(--color-artefato)" }}>
              <span className={styles.dualLabel}>Artefatos</span>
              <div className={styles.dualBody}>
                <div className={styles.dualCol}>
                  <span className={styles.dualSubLabel}>Acumulado</span>
                  <span className={styles.dualValue}>{fmtNota(metricas.acumuladoArtefatos, 3)}</span>
                </div>
                <div className={styles.dualDivider} />
                <div className={styles.dualCol}>
                  <span className={styles.dualSubLabel}>Até o momento</span>
                  <span className={styles.dualValue}>
                    {metricas.mediaArtefatosAteOMomento !== null ? fmtNota(metricas.mediaArtefatosAteOMomento) : "—"}
                  </span>
                </div>
              </div>
            </div>
            <div className={styles.dualCard} style={{ borderTopColor: "var(--color-prova)" }}>
              <span className={styles.dualLabel}>Prova</span>
              <div className={styles.dualBody}>
                <div className={styles.dualCol}>
                  <span className={styles.dualSubLabel}>Acumulado</span>
                  <span className={styles.dualValue}>{fmtNota(metricas.acumuladoProva, 3)}</span>
                </div>
                <div className={styles.dualDivider} />
                <div className={styles.dualCol}>
                  <span className={styles.dualSubLabel}>Até o momento</span>
                  <span className={styles.dualValue}>
                    {metricas.mediaProvaAteOMomento !== null ? fmtNota(metricas.mediaProvaAteOMomento) : "—"}
                  </span>
                </div>
              </div>
            </div>
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

          <div className={styles.footer}>
            <span className={styles.credit}>
              Criado por{" "}
              <a
                href="https://github.com/henriquegpb"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.creditLink}
              >
                Henrique Barone
              </a>
              {" · inspirado na famosa "}
              <a
                href="https://docs.google.com/spreadsheets/d/1PmS8W2Wg32J6AM097Om1dvlKDnFfx0FmIF6EjEY7H7E/edit?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.creditLink}
              >
                planilha
              </a>
            </span>
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
