"use client";
import { useState, useCallback, useRef } from "react";
import { useGradeDashboard } from "@/hooks/useGradeDashboard";
import StudentHeader from "@/components/dashboard/StudentHeader";
import HtmlUpload from "@/components/import/HtmlUpload";
import MetricCard from "@/components/dashboard/MetricCard";
import DistributionChart from "@/components/dashboard/DistributionChart";
import ProgressBars from "@/components/dashboard/ProgressBars";
import AttendanceCard from "@/components/dashboard/AttendanceCard";
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
    attendance, importAttendanceHtml, attendanceError,
  } = useGradeDashboard();

  const [dragging, setDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    setDragging(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragging(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file && (file.name.endsWith(".html") || file.name.endsWith(".htm"))) {
        importHtml(file);
      }
    },
    [importHtml]
  );

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
      <div
        className={styles.emptyContainer}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <StudentHeader
          studentName={studentName}
          lastImportAt={lastImportAt}
          uploadSlot={upload}
        />
        <div className={`${styles.emptyState} ${dragging ? styles.emptyDragging : ""}`}>
          <div className={styles.dropZone}>
            <span className={styles.dropIcon}>↓</span>
            <span className={styles.dropText}>Arraste o arquivo HTML aqui</span>
          </div>

          <div className={styles.dropDivider}>
            <span>ou</span>
          </div>

          <h2 className={styles.emptyTitle}>Como exportar do Adalove</h2>
          <ol className={styles.emptySteps}>
            <li>
              Acesse o{" "}
              <a
                href="https://adalove.inteli.edu.br"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.emptyLink}
              >
                Adalove
              </a>{" "}
              e vá até a página <strong>Notas</strong>.
            </li>
            <li>
              Certifique-se de que a <strong>grade de notas</strong> está visível
              (todas as atividades e pontuações carregadas).
            </li>
            <li>
              Salve a página como HTML:{" "}
              <kbd className={styles.kbd}>Ctrl+S</kbd> (Windows) ou{" "}
              <kbd className={styles.kbd}>⌘+S</kbd> (Mac) e escolha{" "}
              <em>&quot;Página da Web completa&quot;</em>.
            </li>
            <li>
              Arraste o arquivo <code>.html</code> salvo para cá, ou clique em{" "}
              <strong>Importar HTML</strong> acima.
            </li>
          </ol>
          <p className={styles.emptyHint}>
            Seus dados ficam salvos no navegador — nada é enviado para nenhum servidor.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={styles.shell}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {dragging && (
        <div className={styles.dragOverlay}>
          <span className={styles.dragOverlayText}>Solte para atualizar notas</span>
        </div>
      )}
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
              valueSuffix={`/ ${fmtNota(metricas.pontosAvaliados * 10, 3)} avaliados`}
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
            <div className={styles.combinedCard}>
              <div className={styles.combinedLeft}>
                <DistributionChart pesosPorTipo={metricas.pesosPorTipo} bare />
              </div>
              <div className={styles.combinedDivider} />
              <div className={styles.combinedRight}>
                <ProgressBars items={items} bare />
              </div>
            </div>
            <AttendanceCard
              attendance={attendance}
              onImport={importAttendanceHtml}
              error={attendanceError}
            />
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
          <ActivitiesTable items={items} onNotaChange={updateNota} />
        </aside>
      </div>
    </div>
  );
}
