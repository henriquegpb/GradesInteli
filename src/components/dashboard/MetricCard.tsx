"use client";
import styles from "./MetricCard.module.css";

interface Props {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  variant?: "default" | "success" | "warning" | "danger";
}

export default function MetricCard({
  label,
  value,
  sub,
  accent,
  variant = "default",
}: Props) {
  return (
    <div
      className={`${styles.card} ${styles[variant]}`}
      style={accent ? { borderTopColor: accent } : undefined}
    >
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
      {sub && <span className={styles.sub}>{sub}</span>}
    </div>
  );
}
