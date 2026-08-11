import { cn } from "~/lib/cn";

/** Toggle estilo iOS, nas medidas do GradesInteli (trilho 28×16, botão 12). */
export function Switch({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  className?: string;
}) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2", className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-4 w-7 shrink-0 rounded-full transition-colors duration-150",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          checked ? "bg-accent" : "bg-line",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-3 rounded-full bg-white transition-transform duration-150",
            checked ? "translate-x-[14px]" : "translate-x-0.5",
          )}
        />
      </button>
      <span className="text-xs text-fg-soft">{label}</span>
    </label>
  );
}
