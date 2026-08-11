import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "~/lib/cn";

const DELAY_MS = 1000;

/** Folga mínima entre o balão e a borda da janela. */
const EDGE_MARGIN = 8;

type Placement = "center" | "end" | "start";

/** Tooltip com atraso: só aparece depois de um tempo parado em cima, para não
 *  piscar quando o cursor apenas atravessa a fileira de botões. Some no clique —
 *  quem já clicou não precisa mais da explicação.
 *
 *  Sem portal, como o resto da overlay: o balão é `absolute` dentro de um
 *  wrapper `relative`, então não depende de nada fora do shadow root. */
export function Tooltip({
  label,
  children,
  disabled = false,
  className,
}: {
  label: string;
  children: ReactNode;
  /** Silencia o balão — útil quando o gatilho já abriu um painel. */
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<Placement>("center");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  useEffect(() => cancel, []);

  // Centralizado por padrão; encostado numa das bordas do gatilho quando
  // centralizar sairia da janela. A conta é geométrica e roda uma vez só: o
  // balão é `whitespace-nowrap`, então a largura não muda com o alinhamento
  // escolhido e não existe o ciclo medir → mover → medir de novo.
  //
  // `useLayoutEffect` e não `useEffect`: roda depois do DOM e ANTES da pintura,
  // então o balão nasce já no lugar certo — sem um quadro fora de posição.
  useLayoutEffect(() => {
    if (!open) return;

    const decide = () => {
      const wrap = wrapRef.current;
      const tip = tipRef.current;
      if (!wrap || !tip) return;

      const anchor = wrap.getBoundingClientRect();
      const width = tip.offsetWidth;
      const centered = anchor.left + anchor.width / 2 - width / 2;
      const limit = window.innerWidth - EDGE_MARGIN;

      if (centered >= EDGE_MARGIN && centered + width <= limit) setPlacement("center");
      else if (anchor.right - width >= EDGE_MARGIN) setPlacement("end");
      else setPlacement("start");
    };

    decide();
    window.addEventListener("resize", decide);
    return () => window.removeEventListener("resize", decide);
  }, [open, label]);

  const schedule = () => {
    cancel();
    timer.current = setTimeout(() => setOpen(true), DELAY_MS);
  };

  const hide = () => {
    cancel();
    setOpen(false);
  };

  const shown = open && !disabled;

  return (
    <span
      ref={wrapRef}
      className={cn("relative inline-flex", className)}
      // `pointer` e não `mouse`: cobre trackpad e caneta pelo mesmo caminho.
      onPointerEnter={(e) => {
        // Toque não tem hover: abrir aqui deixaria o balão preso na tela.
        if (e.pointerType === "touch" || disabled) return;
        schedule();
      }}
      onPointerLeave={hide}
      onPointerDown={hide}
      // Teclado não espera: quem chegou com Tab quer o rótulo agora.
      onFocusCapture={() => !disabled && setOpen(true)}
      onBlurCapture={hide}
    >
      {children}

      {/* Montado só enquanto aberto. Deixá-lo sempre no DOM, mesmo invisível,
          criava scroll horizontal na página: um elemento `absolute` continua
          contando para o scrollWidth com `opacity: 0`, e o balão da direita
          nascia centralizado, passando da borda da janela. */}
      {shown && (
        <span
          ref={tipRef}
          role="tooltip"
          className={cn(
            "gi-tip pointer-events-none absolute top-full z-50 mt-2 whitespace-nowrap rounded-control border border-line bg-surface px-2 py-1 text-[0.68rem] text-fg shadow-lg",
            placement === "center" && "left-1/2 -translate-x-1/2",
            placement === "end" && "right-0",
            placement === "start" && "left-0",
          )}
        >
          {label}
        </span>
      )}
    </span>
  );
}
