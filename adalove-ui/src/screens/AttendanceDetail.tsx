import { Check, X } from "lucide-react";
import { useState, type CSSProperties } from "react";
import type { PresencaStatus } from "@/types/grades";
import type { ActivityView, AttendanceSlotView } from "~/data/viewmodel";
import { cn } from "~/lib/cn";
import { formatDate } from "~/lib/date";
import { Modal } from "~/ui/Modal";

// Detalhe de presença de UM encontro: uma faixa por chamada na régua do dia,
// como o gráfico do modal do Adalove.
//
// A janela de cada chamada é derivada em `attendanceWindow` (data/viewmodel), a
// partir do horário e da tolerância da section — e confere minuto a minuto com o
// gráfico do Adalove num encontro real.
//
// Falta a linha da "Catraca": aquilo é registro de entrada e saída
// (08:01:52 → 10:02:48 no encontro conferido), que não existe em nenhum payload
// que a extensão captura. É a única parte do gráfico que ainda não dá para
// reproduzir.

const STATUS: Record<PresencaStatus, { label: string; color: string }> = {
  presente: { label: "Presente", color: "var(--color-green)" },
  justificado: { label: "Justificada", color: "var(--color-blue)" },
  falta: { label: "Falta", color: "var(--color-red)" },
  futuro: { label: "A ocorrer", color: "var(--color-fg-muted)" },
};

function label(minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  return `${h}:${String(minutes % 60).padStart(2, "0")}`;
}

interface Span {
  slot: AttendanceSlotView;
  start: number;
  end: number;
}

function spanOf(slot: AttendanceSlotView): Span | null {
  const { startsAt, endsAt } = slot;
  if (startsAt === null || endsAt === null || endsAt <= startsAt) return null;
  return { slot, start: startsAt, end: endsAt };
}

/** Modal de um encontro visto pela ótica de falta: só as chamadas. Sem badges,
 *  abas, enunciado, mover cartão ou IA — quem clicou numa linha da tabela de
 *  Faltas quer saber de presença, e o modal completo vive no kanban. */
export function AttendanceModal({
  activity,
  onClose,
}: {
  activity: ActivityView | null;
  onClose: () => void;
}) {
  const Icon = activity?.kind.icon;

  return (
    <Modal
      open={!!activity}
      onClose={onClose}
      icon={
        Icon && (
          <span
            className="flex size-8 items-center justify-center rounded-control"
            style={{
              background: `color-mix(in srgb, ${activity!.kind.color} 15%, transparent)`,
              color: activity!.kind.color,
            }}
          >
            <Icon size={15} aria-hidden />
          </span>
        )
      }
      title={activity?.caption ?? ""}
      subtitle={
        activity
          ? [activity.kind.name, activity.week, formatDate(activity.date)]
              .filter(Boolean)
              .join(" · ")
          : ""
      }
    >
      {activity && <AttendanceDetail slots={activity.attendance} />}
    </Modal>
  );
}

export function AttendanceDetail({ slots }: { slots: AttendanceSlotView[] }) {
  // Instantâneo de propósito: com atraso, percorrer as três faixas para comparar
  // horários vira uma espera a cada parada.
  const [hovered, setHovered] = useState<number | null>(null);

  if (slots.length === 0) return null;

  const spans = slots.map(spanOf);
  const known = spans.filter((s): s is Span => s !== null);
  if (known.length === 0) return null;

  // Régua em horas cheias, arredondando para fora: assim a primeira faixa não
  // nasce colada na borda e o eixo cai em horas redondas.
  const from = Math.floor(Math.min(...known.map((s) => s.start)) / 60) * 60;
  const to = Math.ceil(Math.max(...known.map((s) => s.end)) / 60) * 60;
  const total = to - from;
  const hours: number[] = [];
  for (let h = from; h <= to; h += 60) hours.push(h);

  // Linhas de hora como fundo da própria faixa: um grid absoluto por cima
  // roubaria o hover das barras.
  const grid = `repeating-linear-gradient(to right, var(--color-line-soft) 0 1px, transparent 1px ${
    100 / (hours.length - 1)
  }%)`;

  return (
    <div className="rounded-card border border-line-soft p-5">
      <div className="text-[0.62rem] uppercase tracking-[0.06em] text-fg-muted">Presença</div>

      <div className="mt-5 space-y-3">
        {slots.map((slot, i) => {
          const span = spans[i];
          const s = STATUS[slot.status];
          const StatusIcon = slot.status === "presente" ? Check : slot.status === "falta" ? X : null;

          return (
            <div key={slot.slot} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-sm text-fg-soft">Presença {slot.slot}</span>
              <span className="w-4 shrink-0" style={{ color: s.color }}>
                {StatusIcon && <StatusIcon size={15} aria-hidden />}
              </span>

              <span className="relative h-9 min-w-0 flex-1" style={{ background: grid }}>
                {span && (
                  <>
                    <span
                      onMouseEnter={() => setHovered(slot.slot)}
                      onMouseLeave={() => setHovered(null)}
                      aria-label={`Presença ${slot.slot}, de ${label(span.start)} a ${label(span.end)}: ${s.label}`}
                      // `gi-glow` só na faixa que aconteceu: a de "a ocorrer" é
                      // contorno tracejado vazio, e brilho ali sugeriria dado.
                      className={cn("absolute inset-y-0 rounded", slot.status !== "futuro" && "gi-glow")}
                      style={
                        {
                          left: `${((span.start - from) / total) * 100}%`,
                          width: `${((span.end - span.start) / total) * 100}%`,
                          ...(slot.status === "futuro"
                            ? { border: `1px dashed ${s.color}` }
                            : { "--gi-glow": s.color }),
                        } as CSSProperties
                      }
                    />

                    {/* Balão na cor da faixa, para não haver dúvida de qual delas
                        ele fala. `pointer-events-none`: nascendo em cima da barra,
                        ele roubaria o mouse e piscaria sem parar. */}
                    {hovered === slot.slot && (
                      <span
                        role="tooltip"
                        className="pointer-events-none absolute bottom-full z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-control border px-2 py-1 font-mono text-xs tabular"
                        style={{
                          left: `${(((span.start + span.end) / 2 - from) / total) * 100}%`,
                          color: s.color,
                          borderColor: s.color,
                          background: `color-mix(in srgb, ${s.color} 16%, var(--color-surface))`,
                        }}
                      >
                        {label(span.start)}–{label(span.end)} · {s.label}
                      </span>
                    )}
                  </>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex">
        <span className="w-24 shrink-0" />
        <span className="w-4 shrink-0" />
        <span className="flex min-w-0 flex-1 justify-between font-mono text-[0.7rem] text-fg-muted tabular">
          {hours.map((h) => (
            <span key={h}>{label(h)}</span>
          ))}
        </span>
      </div>
    </div>
  );
}
