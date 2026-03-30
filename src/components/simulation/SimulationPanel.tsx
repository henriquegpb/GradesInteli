"use client";
import type { SimulacaoConfig, MetricasModulo } from "@/types/grades";
import { fmtNota } from "@/lib/format";
import styles from "./SimulationPanel.module.css";

interface Props {
  simulacao: SimulacaoConfig;
  onSimulacaoChange: (s: SimulacaoConfig) => void;
  metricas: MetricasModulo;
}

export default function SimulationPanel({
  simulacao,
  onSimulacaoChange,
  metricas,
}: Props) {
  const provaLabel =
    metricas.provaStatus === "aprovado"
      ? "Cenário confortável"
      : metricas.provaStatus === "exigente"
        ? "Nota alta necessária"
        : "Acima de 10 — cenário improvável";

  const provaClass =
    metricas.provaStatus === "aprovado"
      ? styles.success
      : metricas.provaStatus === "exigente"
        ? styles.warning
        : styles.danger;

  const mediaLabel =
    metricas.mediaTotalAteOMomento !== null
      ? metricas.mediaTotalAteOMomento.toFixed(2)
      : "—";

  return (
    <div className={styles.wrapper}>
      <h3 className={styles.title}>Objetivo de média final</h3>

      <div className={styles.sliderRow}>
        <input
          className={styles.slider}
          type="range"
          min={0}
          max={10}
          step={0.5}
          value={simulacao.metaFinal}
          onChange={(e) =>
            onSimulacaoChange({
              ...simulacao,
              metaFinal: parseFloat(e.target.value),
            })
          }
        />
        <span className={styles.sliderValue}>{simulacao.metaFinal.toFixed(1)}</span>
      </div>

      <div className={styles.controls}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Nota para atividades faltantes</span>
          <input
            className={styles.input}
            type="number"
            min={0}
            max={10}
            step={0.5}
            value={simulacao.notaAssumida}
            onChange={(e) =>
              onSimulacaoChange({
                ...simulacao,
                notaAssumida: parseFloat(e.target.value) || 0,
              })
            }
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>
            Usar sua média {mediaLabel} para atividades não avaliadas
          </span>
          <button
            className={`${styles.toggle} ${simulacao.manterAteOMomento ? styles.toggleOn : ""}`}
            onClick={() =>
              onSimulacaoChange({
                ...simulacao,
                manterAteOMomento: !simulacao.manterAteOMomento,
              })
            }
          >
            <span className={styles.toggleKnob} />
          </button>
        </label>
      </div>

      <div className={styles.results}>
        <div className={styles.resultItem}>
          <span className={styles.resultLabel}>Nota necessária na prova</span>
          <span className={`${styles.resultValue} ${provaClass}`}>
            {fmtNota(metricas.notaNecessariaProva)}
          </span>
          <span className={`${styles.resultStatus} ${provaClass}`}>
            {provaLabel}
          </span>
        </div>
        <div className={styles.resultItem}>
          <span className={styles.resultLabel}>Total projetado do módulo</span>
          <span className={styles.resultValue}>
            {fmtNota(metricas.acumuladoFinalProjetado)}
          </span>
        </div>
        <div className={styles.resultItem}>
          <span className={styles.resultLabel}>Pontos não avaliados</span>
          <span className={styles.resultValue}>
            {(metricas.pontosNaoAvaliados * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}
