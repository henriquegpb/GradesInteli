import { useLayoutEffect, useRef } from "react";
import { cn } from "~/lib/cn";

import type { LucideIcon } from "lucide-react";

export interface TabOption<T extends string> {
  label: string;
  value: T;
  icon?: LucideIcon;
}

/** Pill deslizante posicionada por medição — padrão do nora/admin. */
export function Tabs<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const indicator = indicatorRef.current;
    const active = buttonRefs.current[options.findIndex((o) => o.value === value)];
    if (!wrap || !indicator || !active) return;

    const update = () => {
      indicator.style.width = `${active.offsetWidth}px`;
      indicator.style.height = `${active.offsetHeight}px`;
      indicator.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
    };
    update();

    const observer = new ResizeObserver(update);
    observer.observe(wrap);
    observer.observe(active);
    return () => observer.disconnect();
  }, [options, value]);

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative inline-flex max-w-full gap-0.5 overflow-x-auto rounded-control border border-line bg-surface p-1",
        className,
      )}
    >
      <span
        ref={indicatorRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 z-0 rounded border border-line bg-line-soft transition-[transform,width,height] duration-300 ease-[cubic-bezier(.4,0,.2,1)]"
      />
      {options.map((option, i) => (
        <button
          key={option.value}
          ref={(el) => {
            buttonRefs.current[i] = el;
          }}
          type="button"
          aria-current={option.value === value ? "true" : undefined}
          onClick={() => onChange(option.value)}
          className={cn(
            // `font-medium` em TODAS as abas, ativa ou não: o peso da fonte muda
            // a largura do texto, então alternar aba fazia a barra inteira
            // recalcular e os itens escorregarem de lugar. Só a cor muda agora.
            "relative z-10 inline-flex shrink-0 items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors duration-150",
            option.value === value ? "text-fg" : "text-fg-muted hover:text-fg",
          )}
        >
          {option.icon && (
            <option.icon
              size={13}
              aria-hidden
              className={option.value === value ? "" : "opacity-60"}
            />
          )}
          {option.label}
        </button>
      ))}
    </div>
  );
}
