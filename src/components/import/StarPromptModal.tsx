"use client";
import { useEffect, useState } from "react";
import styles from "./StarPromptModal.module.css";

interface Props {
  open: boolean;
  onStar: () => void;
  onDismiss: () => void;
}

export default function StarPromptModal({ open, onStar, onDismiss }: Props) {
  // Backdrop-click dismissal is disabled for the first 1.5s to avoid an
  // accidental dismiss right as the modal appears. Ignorar/Esc still work.
  const [backdropArmed, setBackdropArmed] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBackdropArmed(false);
    const armTimer = setTimeout(() => setBackdropArmed(true), 1000);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(armTimer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onDismiss]);

  if (!open) return null;

  return (
    <div className={styles.backdrop} onClick={() => backdropArmed && onDismiss()}>
      <div
        className={styles.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="star-prompt-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.avatars}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.avatarPhoto} src="/img/HenriquePerfil.png" alt="Henrique" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.avatarGithub} src="/img/GitHubWhite.svg" alt="GitHub" />
        </div>

        <h2 id="star-prompt-title" className={styles.title}>
          Sua <span className={styles.gold}>Star</span> ajuda muito o projeto!
        </h2>

        <ul className={styles.benefits}>
          <li className={styles.benefit}>
            <span className={styles.benefitIcon}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.iconDollar} src="/img/Dollarsign.svg" alt="" aria-hidden="true" />
            </span>
            <span>
              Custa para manter, sua <span className={styles.gold}>estrela</span> faz valer
            </span>
          </li>
          <li className={styles.benefit}>
            <span className={styles.benefitIcon}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.iconGroup} src="/img/Group.svg" alt="" aria-hidden="true" />
            </span>
            <span>Propriedade dos alunos Inteli, código aberto</span>
          </li>
        </ul>

        <button className={styles.starBtn} onClick={onStar}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.starBtnIcon} src="/img/GitHubBlack.svg" alt="" aria-hidden="true" />
          Atribuir Estrela
        </button>

        <button className={styles.ignore} onClick={onDismiss}>
          Ignorar
        </button>
      </div>
    </div>
  );
}
