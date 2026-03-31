"use client";
import type { ItemNota } from "@/types/grades";
import styles from "./ProgressBars.module.css";

const TYPE_COLORS: Record<string, string> = {
  Ponderada: "var(--color-ponderada)",
  Artefato: "var(--color-artefato)",
  Prova: "var(--color-prova)",
  Aula: "var(--purple)",
  Grupo: "var(--teal)",
};

interface Props {
  items: ItemNota[];
  bare?: boolean;
}

export default function ProgressBars({ items, bare }: Props) {
  const tipos = Object.keys(TYPE_COLORS);
  const data = tipos
    .map((tipo) => {
      const ofType = items.filter((i) => i.tipo === tipo);
      if (ofType.length === 0) return null;
      const total = ofType.reduce((a, i) => a + i.peso, 0);
      const graded = ofType.filter((i) => i.nota !== 0).reduce((a, i) => a + i.peso, 0);
      const pct = total > 0 ? graded / total : 0;
      return { tipo, total, graded, pct, count: ofType.length, gradedCount: ofType.filter((i) => i.nota !== 0).length };
    })
    .filter(Boolean) as { tipo: string; total: number; graded: number; pct: number; count: number; gradedCount: number }[];

  if (data.length === 0) return null;

  const content = (
    <>
      <h3 className={styles.title}>Progresso por categoria</h3>
      <div className={styles.bars}>
        {data.map((d) => (
          <div key={d.tipo} className={styles.row}>
            <span className={styles.label}>{d.tipo}</span>
            <div className={styles.track}>
              <div
                className={styles.fill}
                style={{ width: `${d.pct * 100}%`, background: TYPE_COLORS[d.tipo] }}
              />
            </div>
            <span className={styles.value}>
              {d.gradedCount}/{d.count}
            </span>
          </div>
        ))}
      </div>
    </>
  );

  if (bare) return content;

  return <div className={styles.wrapper}>{content}</div>;
}
