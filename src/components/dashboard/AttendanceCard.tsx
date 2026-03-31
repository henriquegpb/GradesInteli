"use client";
import { useRef, useState, useCallback } from "react";
import type { AttendanceData } from "@/types/grades";
import styles from "./AttendanceCard.module.css";

interface Props {
  attendance: AttendanceData | null;
  onImport: (file: File) => void;
  error: string | null;
}

export default function AttendanceCard({ attendance, onImport, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const dragCounter = useRef(0);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImport(file);
    e.target.value = "";
  };

  const onCardDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setDragOver(true);
  }, []);

  const onCardDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onCardDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragOver(false);
    }
  }, []);

  const onCardDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file && (file.name.endsWith(".html") || file.name.endsWith(".htm"))) {
        onImport(file);
      }
    },
    [onImport]
  );

  const dragProps = {
    onDragEnter: onCardDragEnter,
    onDragOver: onCardDragOver,
    onDragLeave: onCardDragLeave,
    onDrop: onCardDrop,
  };

  if (!attendance) {
    return (
      <div className={`${styles.card} ${dragOver ? styles.cardDragOver : ""}`} {...dragProps}>
        <div className={styles.emptyBody}>
          <button className={styles.importBtn} onClick={() => inputRef.current?.click()}>
            Importar Faltas
          </button>
          <span className={styles.hint}>
            Salve a página <strong>Faltas</strong> do Adalove como HTML, ou arraste aqui
          </span>
          {error && <span className={styles.error}>{error}</span>}
        </div>
        <input ref={inputRef} type="file" accept=".html,.htm" hidden onChange={handleFile} />
      </div>
    );
  }

  const evaluated = attendance.presentes + attendance.faltas + attendance.justificados;
  const danger = attendance.faltasRestantes <= 3;
  const critical = attendance.faltasRestantes === 0;

  return (
    <div className={`${styles.card} ${dragOver ? styles.cardDragOver : ""}`} {...dragProps}>
      <div className={styles.bigRow}>
        <div className={styles.bigStat}>
          <span className={`${styles.bigValue} ${critical ? styles.critical : danger ? styles.danger : ""}`}>
            {attendance.faltasRestantes}
          </span>
          <span className={styles.bigLabel}>faltas restantes</span>
        </div>
        <div className={styles.bigStat}>
          <span className={`${styles.bigValue} ${attendance.percentFaltas >= 15 ? styles.danger : ""}`}>
            {attendance.percentFaltas.toFixed(1)}%
          </span>
          <span className={styles.bigLabel}>% atual</span>
        </div>
      </div>

      <div className={styles.bar}>
        <div
          className={styles.barPresente}
          style={{ width: `${(attendance.presentes / attendance.totalUnits) * 100}%` }}
        />
        <div
          className={styles.barJustificado}
          style={{ width: `${(attendance.justificados / attendance.totalUnits) * 100}%` }}
        />
        <div
          className={styles.barFalta}
          style={{ width: `${(attendance.faltas / attendance.totalUnits) * 100}%` }}
        />
      </div>

      <div className={styles.details}>
        <div className={styles.detailItem}>
          <span className={`${styles.dot} ${styles.dotPresente}`} />
          <span className={styles.detailLabel}>Presente</span>
          <span className={styles.detailValue}>{attendance.presentes}</span>
        </div>
        <div className={styles.detailItem}>
          <span className={`${styles.dot} ${styles.dotJustificado}`} />
          <span className={styles.detailLabel}>Justificado</span>
          <span className={styles.detailValue}>{attendance.justificados}</span>
        </div>
        <div className={styles.detailItem}>
          <span className={`${styles.dot} ${styles.dotFalta}`} />
          <span className={styles.detailLabel}>Faltas</span>
          <span className={styles.detailValue}>{attendance.faltas}</span>
        </div>
        <div className={styles.detailItem}>
          <span className={`${styles.dot} ${styles.dotFuturo}`} />
          <span className={styles.detailLabel}>A avaliar</span>
          <span className={styles.detailValue}>{attendance.futuros}</span>
        </div>
      </div>

      <div className={styles.meta}>
        {evaluated}/{attendance.totalUnits} unidades · máx {attendance.maxFaltasAllowed} faltas (20%)
      </div>

      <button className={styles.updateBtn} onClick={() => inputRef.current?.click()}>
        Atualizar Faltas
      </button>
      <input ref={inputRef} type="file" accept=".html,.htm" hidden onChange={handleFile} />
    </div>
  );
}
