"use client";
import { useState } from "react";
import type { AtividadeNaoReconhecida } from "@/types/grades";
import { getCatalog } from "@/lib/catalog-matcher";
import styles from "./UnknownActivitiesPanel.module.css";

interface Props {
  naoReconhecidas: AtividadeNaoReconhecida[];
  onVincular: (naoReconhecidaIndex: number, catalogIndex: number) => void;
}

export default function UnknownActivitiesPanel({
  naoReconhecidas,
  onVincular,
}: Props) {
  const catalog = getCatalog();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (naoReconhecidas.length === 0) return null;

  return (
    <div className={styles.wrapper}>
      <h3 className={styles.title}>
        Atividades não reconhecidas
        <span className={styles.count}>{naoReconhecidas.length}</span>
      </h3>
      <p className={styles.hint}>
        Essas atividades foram encontradas no HTML mas não casaram com o catálogo
        oficial. Você pode vincular manualmente cada uma.
      </p>
      <div className={styles.list}>
        {naoReconhecidas.map((nr, i) => (
          <div key={i} className={styles.item}>
            <div className={styles.itemHeader}>
              <div>
                <span className={styles.itemName}>{nr.importada.nome}</span>
                <span className={styles.itemMeta}>
                  {nr.importada.semana} · {nr.importada.tipo || "sem tipo"} ·
                  nota {nr.importada.nota}
                </span>
              </div>
              <button
                className={styles.btn}
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                {openIndex === i ? "fechar" : "vincular"}
              </button>
            </div>
            {openIndex === i && (
              <div className={styles.catalogList}>
                {catalog.map((cat, ci) => (
                  <button
                    key={ci}
                    className={styles.catalogItem}
                    onClick={() => {
                      onVincular(i, ci);
                      setOpenIndex(null);
                    }}
                  >
                    <span>{cat.atividade}</span>
                    <span className={styles.catalogMeta}>
                      {cat.semana} · {cat.tipo}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
