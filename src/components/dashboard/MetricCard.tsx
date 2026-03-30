"use client";
import styles from "./MetricCard.module.css";

interface Breakdown {
  label: string;
  value: string;
}

interface Props {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  variant?: "default" | "success" | "warning" | "danger";
  breakdowns?: Breakdown[];
}

export default function MetricCard({
  label,
  value,
  sub,
  accent,
  variant = "default",
  breakdowns,
}: Props) {
  return (
    <div
      className={`${styles.card} ${styles[variant]}`}
      style={accent ? { borderTopColor: accent } : undefined}
    >
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
      {sub && <span className={styles.sub}>{sub}</span>}
      {breakdowns && breakdowns.length > 0 && (
        <div className={styles.breakdowns}>
          {breakdowns.map((b) => (
            <div key={b.label} className={styles.bdItem}>
              <span className={styles.bdLabel}>{b.label}</span>
              <span className={styles.bdValue}>{b.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
