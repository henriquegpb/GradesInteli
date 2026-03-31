"use client";
import { useState } from "react";
import type { SimulacaoConfig, MetricasModulo, ParticipacaoLetra, ParticipacaoMultipliers } from "@/types/grades";
import { fmtNota } from "@/lib/format";
import { Pencil, X, Settings } from "lucide-react";
import NumericInput from "@/components/ui/NumericInput";
import styles from "./SimulationPanel.module.css";

const LETRAS: ParticipacaoLetra[] = ["A", "B", "C", "D", "E"];

interface Props {
  simulacao: SimulacaoConfig;
  onSimulacaoChange: (s: SimulacaoConfig) => void;
  metricas: MetricasModulo;
  participacao: ParticipacaoLetra;
  multipliers: ParticipacaoMultipliers;
  onParticipacaoChange: (p: ParticipacaoLetra) => void;
  onMultipliersChange: (m: ParticipacaoMultipliers) => void;
  effectiveMetaFinal: number;
}

export default function SimulationPanel({
  simulacao,
  onSimulacaoChange,
  metricas,
  participacao,
  multipliers,
  onParticipacaoChange,
  onMultipliersChange,
  effectiveMetaFinal,
}: Props) {
  const [showSlider, setShowSlider] = useState(false);
  const [showMultConfig, setShowMultConfig] = useState(false);

  const provaLabel =
    metricas.provaStatus === "aprovado"
      ? "Cenário confortável"
      : metricas.provaStatus === "exigente"
        ? "Nota alta necessária"
        : "Acima de 10 — improvável";

  const provaClass =
    metricas.provaStatus === "aprovado"
      ? styles.success
      : metricas.provaStatus === "exigente"
        ? styles.warning
        : styles.danger;

  const mult = multipliers[participacao];
  const notaComParticipacao = metricas.acumuladoFinalProjetado * mult;

  return (
    <div className={styles.wrapper}>
      <div className={styles.body}>
        <div className={styles.leftCol}>
          <span className={styles.sectionLabel}>Nota para atividades restantes</span>
          <div className={styles.pillRow}>
            <button
              className={`${styles.pill} ${!simulacao.manterAteOMomento ? styles.pillActive : ""}`}
              onClick={() =>
                onSimulacaoChange({ ...simulacao, manterAteOMomento: false })
              }
            >
              Hardcoded
            </button>
            <button
              className={`${styles.pill} ${simulacao.manterAteOMomento ? styles.pillActive : ""}`}
              onClick={() =>
                onSimulacaoChange({ ...simulacao, manterAteOMomento: true })
              }
            >
              Até o momento
            </button>
          </div>

          {!simulacao.manterAteOMomento && (
            <div className={styles.inputRow}>
              <label className={styles.inputGroup}>
                <span className={styles.inputLabel} style={{ color: "var(--color-ponderada)" }}>Pond.</span>
                <NumericInput
                  className={styles.input}
                  value={simulacao.notaAssumidaPonderada}
                  onChange={(v) =>
                    onSimulacaoChange({ ...simulacao, notaAssumidaPonderada: v ?? 0 })
                  }
                />
              </label>
              <label className={styles.inputGroup}>
                <span className={styles.inputLabel} style={{ color: "var(--color-artefato)" }}>Artef.</span>
                <NumericInput
                  className={styles.input}
                  value={simulacao.notaAssumidaArtefato}
                  onChange={(v) =>
                    onSimulacaoChange({ ...simulacao, notaAssumidaArtefato: v ?? 0 })
                  }
                />
              </label>
            </div>
          )}

          <div className={styles.partSection}>
            <div className={styles.partHeader}>
              <span className={styles.sectionLabel}>Participação</span>
              <button
                className={styles.iconBtn}
                onClick={() => setShowMultConfig(!showMultConfig)}
                title="Editar multiplicadores"
              >
                {showMultConfig ? <X size={11} /> : <Settings size={11} />}
              </button>
            </div>
            <div className={styles.selector}>
              {LETRAS.map((l) => (
                <button
                  key={l}
                  className={`${styles.letter} ${participacao === l ? styles.active : ""}`}
                  onClick={() => onParticipacaoChange(l)}
                >
                  {l}
                </button>
              ))}
            </div>

              {showMultConfig && (
              <div className={styles.configGrid}>
                {LETRAS.map((l) => (
                  <label key={l} className={styles.configRow}>
                    <span className={styles.configLetter}>{l}</span>
                    <NumericInput
                      className={styles.configInput}
                      value={multipliers[l]}
                      onChange={(v) =>
                        onMultipliersChange({ ...multipliers, [l]: v ?? 0 })
                      }
                    />
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className={styles.miniMetrics}>
            <div className={styles.miniItem}>
              <span className={styles.miniLabel}>Projeção</span>
              <span className={styles.miniValue}>{fmtNota(metricas.acumuladoFinalProjetado)}</span>
            </div>
            <div className={styles.miniItem}>
              <span className={styles.miniLabel}>Não avaliado</span>
              <span className={styles.miniValue}>{(metricas.pontosNaoAvaliados * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.rightCol}>
          <div className={styles.provaBlock}>
            <span className={styles.provaLabel}>Nota necessária na prova</span>
            <span className={`${styles.provaValue} ${provaClass}`}>
              {fmtNota(metricas.notaNecessariaProva)}
            </span>
            <span className={`${styles.provaStatus} ${provaClass}`}>
              {provaLabel}
            </span>
          </div>

          <div className={styles.objectiveBlock}>
            <div className={styles.objectiveRow}>
              <span className={styles.objectiveLabel}>Objetivo final</span>
              <div className={styles.objectiveRight}>
                <span className={styles.objectiveValue}>{simulacao.metaFinal.toFixed(1)}</span>
                <button
                  className={styles.iconBtn}
                  onClick={() => setShowSlider(!showSlider)}
                  title="Editar objetivo"
                >
                  {showSlider ? <X size={11} /> : <Pencil size={11} />}
                </button>
              </div>
            </div>

            {showSlider && (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
