"use client";
import styles from "./DistributionChart.module.css";

const TYPE_COLORS: Record<string, string> = {
  Ponderada: "var(--color-ponderada)",
  Artefato: "var(--color-artefato)",
  Prova: "var(--color-prova)",
  Aula: "var(--purple)",
  Grupo: "var(--teal)",
};

interface Props {
  pesosPorTipo: Record<string, number>;
}

export default function DistributionChart({ pesosPorTipo }: Props) {
  const entries = Object.entries(pesosPorTipo).filter(([, v]) => v > 0);
  const total = entries.reduce((acc, [, v]) => acc + v, 0);

  if (total === 0) return null;

  const size = 100;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const segments = entries.map(([tipo, peso]) => {
    const pct = peso / total;
    const dashLength = pct * circumference;
    const dashOffset = -offset;
    offset += dashLength;
    return { tipo, peso, pct, dashLength, dashOffset };
  });

  return (
    <div className={styles.wrapper}>
      <h3 className={styles.title}>Distribuição de Nota no Módulo</h3>
      <div className={styles.body}>
      <div className={styles.chartContainer}>
        <svg viewBox={`0 0 ${size} ${size}`} className={styles.svg}>
          {segments.map((s) => (
            <circle
              key={s.tipo}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={TYPE_COLORS[s.tipo] || "var(--text-muted)"}
              strokeWidth={strokeWidth}
              strokeDasharray={`${s.dashLength} ${circumference - s.dashLength}`}
              strokeDashoffset={s.dashOffset}
              className={styles.segment}
            />
          ))}
        </svg>
        <span className={styles.centerLabel}>
          {(total * 100).toFixed(0)}%
        </span>
      </div>
      <div className={styles.legend}>
        {segments.map((s) => (
          <div key={s.tipo} className={styles.legendItem}>
            <span
              className={styles.dot}
              style={{ background: TYPE_COLORS[s.tipo] || "var(--text-muted)" }}
            />
            <span className={styles.legendLabel}>{s.tipo}</span>
            <span className={styles.legendValue}>
              {(s.pct * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
