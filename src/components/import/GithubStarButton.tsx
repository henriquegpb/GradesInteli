"use client";
import { Star } from "lucide-react";
import styles from "./GithubStarButton.module.css";

interface Props {
  onHoverChange?: (hovered: boolean) => void;
  onStarClick?: () => void;
}

export default function GithubStarButton({ onHoverChange, onStarClick }: Props) {
  return (
    <span className={styles.root}>
      <span className={styles.support}>O seu apoio ajuda muito</span>
      <a
        href="https://github.com/henriquegpb/GradesInteli"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.btn}
        onClick={() => onStarClick?.()}
        onMouseEnter={() => onHoverChange?.(true)}
        onMouseLeave={() => onHoverChange?.(false)}
        onFocus={() => onHoverChange?.(true)}
        onBlur={() => onHoverChange?.(false)}
      >
        <span className={styles.iconWrap} aria-hidden="true">
          <Star className={styles.icon} size={12} strokeWidth={2} />
        </span>
        <span className={styles.label}>Star no GitHub</span>
        <span className={styles.shine} aria-hidden="true" />
      </a>
    </span>
  );
}
