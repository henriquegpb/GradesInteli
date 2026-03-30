"use client";
import styles from "./ActivitiesFilters.module.css";
import { TIPOS_VALIDOS } from "@/types/grades";

interface Props {
  semana: string;
  tipo: string;
  busca: string;
  semanas: string[];
  onSemanaChange: (v: string) => void;
  onTipoChange: (v: string) => void;
  onBuscaChange: (v: string) => void;
}

export default function ActivitiesFilters({
  semana,
  tipo,
  busca,
  semanas,
  onSemanaChange,
  onTipoChange,
  onBuscaChange,
}: Props) {
  return (
    <div className={styles.bar}>
      <select
        className={styles.select}
        value={semana}
        onChange={(e) => onSemanaChange(e.target.value)}
      >
        <option value="">Todas as semanas</option>
        {semanas.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select
        className={styles.select}
        value={tipo}
        onChange={(e) => onTipoChange(e.target.value)}
      >
        <option value="">Todos os tipos</option>
        {TIPOS_VALIDOS.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <input
        className={styles.search}
        type="text"
        placeholder="Buscar atividade..."
        value={busca}
        onChange={(e) => onBuscaChange(e.target.value)}
      />
    </div>
  );
}
