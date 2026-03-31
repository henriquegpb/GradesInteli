"use client";
import { useState, useMemo } from "react";
import type { ItemNota } from "@/types/grades";
import { fmtNota, fmtPeso } from "@/lib/format";
import NumericInput from "@/components/ui/NumericInput";
import ActivitiesFilters from "./ActivitiesFilters";
import styles from "./ActivitiesTable.module.css";

const TYPE_COLORS: Record<string, string> = {
  Ponderada: "var(--color-ponderada)",
  Artefato: "var(--color-artefato)",
  Prova: "var(--color-prova)",
  Aula: "var(--purple)",
  Grupo: "var(--teal)",
};

function pesoColor(peso: number): string {
  const pct = Math.round(peso * 100);
  if (pct <= 1) return "var(--green)";
  if (pct <= 2) return "var(--yellow)";
  if (pct <= 3) return "var(--orange)";
  if (pct <= 4) return "var(--red)";
  if (pct <= 5) return "#991111";
  return "var(--purple)";
}

interface Props {
  items: ItemNota[];
  onNotaChange: (id: string, nota: number) => void;
}

type SortKey = "original" | "semana" | "tipo" | "atividade" | "peso" | "nota";
type SortDir = "asc" | "desc";

export default function ActivitiesTable({ items, onNotaChange }: Props) {
  const [semanaFilter, setSemanaFilter] = useState("");
  const [tipoFilter, setTipoFilter] = useState("");
  const [busca, setBusca] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("original");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const semanas = useMemo(() => {
    const set = new Set(items.map((i) => i.semana).filter(Boolean));
    return Array.from(set).sort((a, b) => {
      const na = parseInt(a.replace("S", ""));
      const nb = parseInt(b.replace("S", ""));
      return na - nb;
    });
  }, [items]);

  const filtered = useMemo(() => {
    let result = items;
    if (semanaFilter) result = result.filter((i) => i.semana === semanaFilter);
    if (tipoFilter) result = result.filter((i) => i.tipo === tipoFilter);
    if (busca) {
      const q = busca.toLowerCase();
      result = result.filter((i) => i.atividade.toLowerCase().includes(q));
    }

    if (sortKey !== "original") {
      const dir = sortDir === "asc" ? 1 : -1;
      result = [...result].sort((a, b) => {
        const va = a[sortKey];
        const vb = b[sortKey];
        if (typeof va === "number" && typeof vb === "number")
          return (va - vb) * dir;
        return String(va).localeCompare(String(vb)) * dir;
      });
    }

    return result;
  }, [items, semanaFilter, tipoFilter, busca, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  };

  return (
    <div className={styles.wrapper}>
      <ActivitiesFilters
        semana={semanaFilter}
        tipo={tipoFilter}
        busca={busca}
        semanas={semanas}
        onSemanaChange={setSemanaFilter}
        onTipoChange={setTipoFilter}
        onBuscaChange={setBusca}
      />
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th onClick={() => toggleSort("semana")} className={styles.sortable}>
                Sem.{sortIndicator("semana")}
              </th>
              <th onClick={() => toggleSort("tipo")} className={styles.sortable}>
                Tipo{sortIndicator("tipo")}
              </th>
              <th onClick={() => toggleSort("atividade")} className={styles.sortable}>
                Atividade{sortIndicator("atividade")}
              </th>
              <th onClick={() => toggleSort("peso")} className={styles.sortable}>
                Peso{sortIndicator("peso")}
              </th>
              <th onClick={() => toggleSort("nota")} className={styles.sortable}>
                Nota{sortIndicator("nota")}
              </th>
              <th>Origem</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} className={item.nota === 0 ? styles.pending : ""}>
                <td className={styles.mono}>{item.semana}</td>
                <td>
                  <span
                    className={styles.typeBadge}
                    style={{
                      borderColor: TYPE_COLORS[item.tipo] || "var(--border)",
                      color: TYPE_COLORS[item.tipo] || "var(--text-muted)",
                    }}
                  >
                    {item.tipo || "—"}
                  </span>
                </td>
                <td className={styles.name}>{item.atividade}</td>
                <td className={styles.mono} style={{ color: pesoColor(item.peso) }}>{fmtPeso(item.peso)}</td>
                <td>
                  <NumericInput
                    className={styles.notaInput}
                    value={item.nota}
                    onChange={(v) => onNotaChange(item.id, v)}
                  />
                </td>
                <td>
                  <span className={`${styles.originBadge} ${styles[item.matchStatus]}`}>
                    {item.matchStatus === "matched"
                      ? "auto"
                      : item.matchStatus === "manual"
                        ? "manual"
                        : "catálogo"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.count}>
        {filtered.length} de {items.length} atividades
      </p>
    </div>
  );
}
