"use client";
import { useMemo } from "react";
import type { ItemNota } from "@/types/grades";
import styles from "./WeeklyChart.module.css";

interface Props {
  items: ItemNota[];
}

export default function WeeklyChart({ items }: Props) {
  const weeks = useMemo(() => {
    const map = new Map<string, { sum: number; count: number; weight: number }>();

    for (const item of items) {
      if (!item.semana || item.nota === null) continue;
      const entry = map.get(item.semana) || { sum: 0, count: 0, weight: 0 };
      entry.sum += (item.nota ?? 0) * item.peso;
      entry.weight += item.peso;
      entry.count += 1;
      map.set(item.semana, entry);
    }

    return Array.from(map.entries())
      .map(([semana, { sum, weight }]) => ({
        semana,
        avg: weight > 0 ? sum / weight : 0,
      }))
      .sort((a, b) => {
        const na = parseInt(a.semana.replace("S", ""));
        const nb = parseInt(b.semana.replace("S", ""));
        return na - nb;
      });
  }, [items]);

  if (weeks.length === 0) return null;

  const maxVal = 10;

  return (
    <div className={styles.wrapper}>
      <h3 className={styles.title}>Média ponderada por semana</h3>
      <div className={styles.chart}>
        {weeks.map((w) => {
          const pct = (w.avg / maxVal) * 100;
          const isLow = w.avg < 6;
          return (
            <div key={w.semana} className={styles.col}>
              <span className={styles.val}>{w.avg.toFixed(1)}</span>
              <div className={styles.barTrack}>
                <div
                  className={`${styles.bar} ${isLow ? styles.barLow : ""}`}
                  style={{ height: `${pct}%` }}
                />
              </div>
              <span className={styles.label}>{w.semana}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
