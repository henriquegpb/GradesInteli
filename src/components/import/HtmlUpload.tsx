"use client";
import { useRef, useState, useCallback } from "react";
import styles from "./HtmlUpload.module.css";

interface Props {
  onImport: (file: File) => void;
  error: string | null;
}

export default function HtmlUpload({ onImport, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.match(/\.html?$/i)) return;
      onImport(file);
    },
    [onImport]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div
      className={`${styles.zone} ${dragging ? styles.dragging : ""}`}
      onDrop={onDrop}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".html,.htm"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        className={styles.input}
      />
      <span className={styles.icon}>↑</span>
      <span className={styles.label}>Importar Adalove</span>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
