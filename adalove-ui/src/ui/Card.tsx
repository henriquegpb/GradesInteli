import type { HTMLAttributes } from "react";
import { cn } from "~/lib/cn";

/** Receita do GradesInteli: surface + 1px border + raio 8px. Padding é do caller. */
export const CARD_CLASS = "rounded-card border border-line bg-surface";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(CARD_CLASS, className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "text-[0.7rem] font-medium uppercase tracking-[0.05em] text-fg-muted",
        className,
      )}
      {...props}
    />
  );
}
