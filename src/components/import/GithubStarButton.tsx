"use client";
import { Star } from "lucide-react";
import styles from "./GithubStarButton.module.css";

export default function GithubStarButton() {
  return (
    <a
      href="https://github.com/henriquegpb/GradesInteli"
      target="_blank"
      rel="noopener noreferrer"
      className={styles.btn}
      title="Dê uma estrela no GitHub — ajuda o projeto a crescer"
    >
      <span className={styles.iconWrap} aria-hidden="true">
        <Star className={styles.icon} size={12} strokeWidth={2} />
      </span>
      <span className={styles.label}>Star no GitHub</span>
      <span className={styles.shine} aria-hidden="true" />
    </a>
  );
}
