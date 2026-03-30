"use client";
import { useState } from "react";
import type { ParticipacaoLetra, ParticipacaoMultipliers } from "@/types/grades";
import styles from "./ParticipacaoCard.module.css";

const LETRAS: ParticipacaoLetra[] = ["A", "B", "C", "D", "E"];

interface Props {
  participacao: ParticipacaoLetra;
  multipliers: ParticipacaoMultipliers;
  mediaFinal: number;
  onParticipacaoChange: (p: ParticipacaoLetra) => void;
  onMultipliersChange: (m: ParticipacaoMultipliers) => void;
}

export default function ParticipacaoCard({
  participacao,
  multipliers,
  mediaFinal,
  onParticipacaoChange,
  onMultipliersChange,
}: Props) {
  const [showConfig, setShowConfig] = useState(false);

  const notaFinal = mediaFinal * multipliers[participacao];

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h3 className={styles.title}>Participação</h3>
        <button
          className={styles.configBtn}
          onClick={() => setShowConfig(!showConfig)}
          title="Editar multiplicadores"
        >
          {showConfig ? "×" : "⚙"}
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

      <div className={styles.result}>
        <span className={styles.resultLabel}>
          Média final × {multipliers[participacao].toFixed(2)}
        </span>
        <span className={styles.resultValue}>{notaFinal.toFixed(2)}</span>
      </div>

      {showConfig && (
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
  );
}
