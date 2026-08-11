import { Check, Info, TriangleAlert, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "~/lib/cn";

// Portado do nora/web (app/components/ui/ToastNotification.tsx + styles/toast.css)
// com os tokens daqui: barra de tempo no topo, pausa no hover e animação de
// saída antes de sumir.
//
// Sem `createPortal` para o document.body, ao contrário do original: a overlay
// vive num shadow root, e um portal para fora dele perderia todo o CSS. Aqui o
// `fixed` já se posiciona pela viewport.

type Tone = "info" | "success" | "error" | "warning";

interface Toast {
  id: number;
  tone: Tone;
  message: string;
  duration: number;
}

interface ToastApi {
  toast: (message: string, tone?: Tone) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Fora do provider vira no-op em vez de estourar: um toast nunca é essencial,
 *  e derrubar a tela por falta de provider seria pior que não avisar. */
const NOOP: ToastApi = {
  toast: () => {},
  success: () => {},
  error: () => {},
  warning: () => {},
};

export function useToast(): ToastApi {
  return useContext(ToastContext) ?? NOOP;
}

const TONES: Record<Tone, { icon: typeof Check; color: string }> = {
  success: { icon: Check, color: "var(--color-green)" },
  error: { icon: X, color: "var(--color-red)" },
  warning: { icon: TriangleAlert, color: "var(--color-yellow)" },
  info: { icon: Info, color: "var(--color-accent)" },
};

/** Erro fica mais tempo: costuma precisar de duas leituras. */
const DURATION: Record<Tone, number> = {
  success: 3500,
  info: 3500,
  warning: 5000,
  error: 6000,
};

let nextId = 1;

function ToastRow({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  const [exiting, setExiting] = useState(false);
  const elapsedRef = useRef(0);
  const startedRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedule = useCallback(() => {
    const remaining = toast.duration - elapsedRef.current;
    if (remaining <= 0) {
      setExiting(true);
      return;
    }
    startedRef.current = Date.now();
    timerRef.current = setTimeout(() => setExiting(true), remaining);
  }, [toast.duration]);

  useEffect(() => {
    schedule();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [schedule]);

  // Espera a animação de saída terminar antes de tirar do DOM.
  useEffect(() => {
    if (!exiting) return;
    const t = setTimeout(onDone, 300);
    return () => clearTimeout(t);
  }, [exiting, onDone]);

  const pause = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    elapsedRef.current += Date.now() - startedRef.current;
  };

  const { icon: Icon, color } = TONES[toast.tone];

  return (
    <div
      role="status"
      onMouseEnter={pause}
      onMouseLeave={schedule}
      className={cn(
        "gi-toast pointer-events-auto relative flex min-w-[20rem] max-w-[27.5rem] items-center gap-2.5 overflow-hidden rounded-card border border-line bg-surface px-4 py-3",
        exiting && "gi-toast-exit",
      )}
      style={{ boxShadow: "0 8px 30px rgba(0,0,0,.3)" }}
    >
      <span
        aria-hidden
        className="gi-toast-timer absolute inset-x-0 top-0 h-0.5"
        style={{ background: color, animationDuration: `${toast.duration}ms` }}
      />
      <Icon size={18} aria-hidden className="shrink-0" style={{ color }} />
      <span className="min-w-0 flex-1 text-[0.8rem] font-medium leading-snug text-fg">
        {toast.message}
      </span>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const api = useMemo<ToastApi>(() => {
    const push = (message: string, tone: Tone = "info") => {
      setToasts((list) => [
        ...list.slice(-3),
        { id: nextId++, tone, message, duration: DURATION[tone] },
      ]);
    };
    return {
      toast: push,
      success: (m) => push(m, "success"),
      error: (m) => push(m, "error"),
      warning: (m) => push(m, "warning"),
    };
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* column-reverse: o mais novo entra por baixo e empurra a pilha para cima. */}
      <div
        role="region"
        aria-label="Notificações"
        className="pointer-events-none fixed bottom-6 right-6 z-[100] flex flex-col-reverse gap-2"
      >
        {toasts.map((t) => (
          <ToastRow key={t.id} toast={t} onDone={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
