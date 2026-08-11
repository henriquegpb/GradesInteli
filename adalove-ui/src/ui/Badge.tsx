import type { HTMLAttributes } from "react";
import { cn } from "~/lib/cn";

type Tone = "default" | "positive" | "negative" | "warning" | "info";

/** Pill de borda, sem preenchimento — igual ao `.typeBadge` do GradesInteli. */
export function Badge({
  className,
  tone = "default",
  color,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone; color?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[0.6rem] font-medium",
        !color && tone === "default" && "border-line text-fg-soft",
        !color && tone === "positive" && "border-green/40 text-green",
        !color && tone === "negative" && "border-red/40 text-red",
        !color && tone === "warning" && "border-yellow/40 text-yellow",
        !color && tone === "info" && "border-blue/40 text-blue",
        className,
      )}
      // Cor de categoria vem como token CSS, não como classe — a tríade
      // Ponderada/Artefato/Prova é definida por dado, não por variante.
      style={color ? { borderColor: color, color } : undefined}
      {...props}
    />
  );
}
