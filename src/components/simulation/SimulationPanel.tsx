"use client";
import { useState } from "react";
import type { SimulacaoConfig, MetricasModulo, ParticipacaoLetra, ParticipacaoMultipliers } from "@/types/grades";
import { fmtNota } from "@/lib/format";
import { Pencil, X, Settings } from "lucide-react";
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
        {/* ---- LEFT: controls ---- */}
        <div className={styles.leftCol}>
          <span className={styles.sectionLabel}>Nota para faltantes</span>
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

            <div className={styles.partResult}>
              <span className={styles.partLabel}>
                {fmtNota(metricas.acumuladoFinalProjetado)} × {mult.toFixed(2)}
              </span>
              <span className={styles.partValue}>{notaComParticipacao.toFixed(2)}</span>
            </div>

            {showMultConfig && (
              <div className={styles.configGrid}>
                {LETRAS.map((l) => (
                  <label key={l} className={styles.configRow}>
                    <span className={styles.configLetter}>{l}</span>
                    <input
                      className={styles.configInput}
                      type="number"
                      step={0.01}
                      min={0}
                      max={2}
                      value={multipliers[l]}
                      onChange={(e) =>
                        onMultipliersChange({
                          ...multipliers,
                          [l]: parseFloat(e.target.value) || 0,
                        })
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

        {/* ---- RIGHT: prova + objective ---- */}
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

            {mult !== 1 && (
              <div className={styles.objectiveMeta}>
                Meta módulo: {effectiveMetaFinal.toFixed(2)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
