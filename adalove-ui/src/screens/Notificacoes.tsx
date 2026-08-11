import {
  Bell,
  CheckCheck,
  FilePlus2,
  Lock,
  Receipt,
  RefreshCcw,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApi, useApiClient } from "~/data/api";
import type { ActivityView, SectionView } from "~/data/viewmodel";
import { relativeTime } from "~/data/news";
import { cn } from "~/lib/cn";
import { Tooltip } from "~/ui/Tooltip";
import { Skeleton } from "~/ui/Skeleton";
import { useToast } from "~/ui/Toast";

// GET /notifications devolve o histórico inteiro (338 no fixture) com
// `status: "read" | "unread"`, e PUT /notifications marca todas como lidas —
// mesmo par que o sino do Adalove usa.

interface RawNotification {
  uuid: string;
  status: string;
  message: string;
  type: string;
  created_at: string;
  payload?: { studentActivityUuid?: string; activityUuid?: string } | null;
  from_user?: { uuid?: string } | null;
}

const TYPES: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  "publish-activity": { label: "Nova atividade", icon: FilePlus2, color: "var(--color-green)" },
  "blocked-activity": { label: "Atividade bloqueada", icon: Lock, color: "var(--color-orange)" },
  "deleted-activity": { label: "Atividade removida", icon: Trash2, color: "var(--color-red)" },
  "reopen-activity": { label: "Atividade reaberta", icon: RefreshCcw, color: "var(--color-blue)" },
  "change-activity-status": {
    label: "Status alterado",
    icon: RefreshCcw,
    color: "var(--color-purple)",
  },
  "issued-bank-slip": { label: "Boleto emitido", icon: Receipt, color: "var(--color-yellow)" },
};

const FALLBACK = { label: "Notificação", icon: Bell, color: "var(--color-fg-muted)" };
const PAGE = 12;

export function NotificationsButton({
  view,
  onOpenActivity,
}: {
  view: SectionView;
  onOpenActivity: (activity: ActivityView) => void;
}) {
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [readAll, setReadAll] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const client = useApiClient();
  const toast = useToast();

  const { data, loading } = useApi<RawNotification[]>("/notifications");

  const items = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const unread = readAll ? 0 : items.filter((n) => n.status !== "read").length;

  // `composedPath` é o que enxerga através do shadow root — `event.target`
  // sozinho seria sempre o host da overlay.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !e.composedPath().includes(wrapRef.current)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  /** O Adalove marca tudo de uma vez; não há endpoint por notificação. */
  async function markAllRead() {
    if (!client?.put) return;
    setReadAll(true);
    try {
      await client.put("/notifications");
    } catch {
      setReadAll(false);
      toast.error("Não consegui marcar as notificações como lidas.");
    }
  }

  /** Notificação de atividade carrega o uuid dela: abre o modal direto. */
  function openFrom(notification: RawNotification) {
    const uuid =
      notification.payload?.studentActivityUuid ?? notification.payload?.activityUuid ?? null;
    if (!uuid) return;
    const activity = view.activities.find((a) => a.id === uuid || a.activityUuid === uuid);
    if (!activity) return;
    setOpen(false);
    onOpenActivity(activity);
  }

  return (
    <div ref={wrapRef} className="relative">
      <Tooltip label="Ver notificações" disabled={open}>
      <button
        type="button"
        aria-label={`Notificações${unread ? ` (${unread} não lidas)` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative inline-flex size-9 items-center justify-center rounded-control border transition-colors duration-150",
          open
            ? "border-accent bg-surface-hover text-fg"
            : "border-line bg-surface text-fg-soft hover:border-accent hover:text-fg",
        )}
      >
        <Bell size={16} aria-hidden />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-red px-1 font-mono text-[0.55rem] font-medium text-white tabular">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      </Tooltip>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 flex max-h-[70vh] w-[min(28rem,calc(100vw-3rem))] flex-col overflow-hidden rounded-card border border-line bg-surface shadow-2xl">
          <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2.5">
            <span className="text-[0.62rem] font-medium uppercase tracking-[0.06em] text-fg-muted">
              Notificações {items.length > 0 && `· ${items.length}`}
            </span>
            {unread > 0 && client?.put && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="inline-flex items-center gap-1 text-[0.68rem] text-accent transition-opacity hover:opacity-80"
              >
                <CheckCheck size={12} aria-hidden />
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading && (
              <div className="space-y-2 p-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            )}

            {!loading && items.length === 0 && (
              <p className="p-6 text-center text-xs text-fg-muted">Nenhuma notificação.</p>
            )}

            <ul className="divide-y divide-line-soft">
              {items.slice(0, limit).map((n) => {
                const meta = TYPES[n.type] ?? FALLBACK;
                const Icon = meta.icon;
                const isUnread = !readAll && n.status !== "read";
                const clickable = !!(n.payload?.studentActivityUuid ?? n.payload?.activityUuid);

                return (
                  <li key={n.uuid}>
                    <button
                      type="button"
                      onClick={() => openFrom(n)}
                      disabled={!clickable}
                      className={cn(
                        "flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors duration-150",
                        clickable ? "hover:bg-surface-hover" : "cursor-default",
                        isUnread && "bg-accent/5",
                      )}
                    >
                      <span
                        className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-control"
                        style={{ background: `color-mix(in srgb, ${meta.color} 15%, transparent)` }}
                      >
                        <Icon size={12} aria-hidden style={{ color: meta.color }} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="text-[0.6rem] uppercase tracking-[0.04em] text-fg-muted">
                            {meta.label}
                          </span>
                          <span className="text-[0.6rem] text-fg-muted">
                            {relativeTime(new Date(n.created_at)) ?? ""}
                          </span>
                          {isUnread && (
                            <span aria-hidden className="size-1.5 rounded-full bg-accent" />
                          )}
                        </span>
                        <span className="mt-0.5 block text-xs leading-snug text-fg-soft">
                          {n.message}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {items.length > limit && (
              <button
                type="button"
                onClick={() => setLimit((l) => l + PAGE)}
                className="w-full border-t border-line-soft py-2.5 text-[0.68rem] text-accent transition-colors hover:bg-surface-hover"
              >
                mostrar mais {Math.min(PAGE, items.length - limit)}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
