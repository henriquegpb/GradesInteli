import { CalendarClock, ChevronDown, ExternalLink, Star, UserRound, Users, Video } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { fmtNota } from "@/lib/format";
import { AskAiButtons } from "~/ai/AskAiButton";
import { CATEGORY_COLOR } from "~/data/activityTypes";
import { useApi } from "~/data/api";
import { STATUS_LABEL, type ActivityStatus } from "~/data/types";
import type { ActivityView, SectionView } from "~/data/viewmodel";
import { cn } from "~/lib/cn";
import { formatDate } from "~/lib/date";
import { sanitizeHtml } from "~/lib/sanitize";
import { Badge } from "~/ui/Badge";
import { Button } from "~/ui/Button";
import { Modal } from "~/ui/Modal";
import { Select } from "~/ui/Select";
import { Tabs } from "~/ui/Tabs";

// As mesmas seis abas do Adalove. Aparecem sempre, mesmo vazias — igual lá, e
// porque uma aba que some conforme o dado confunde mais do que informa.
//
// Conteúdo vem do /userdata; material, vídeo e assuntos vêm do endpoint de
// detalhe `/student-activities/{uuid}/activity/data`, carregado ao abrir.

type Tab = "conteudo" | "material" | "video" | "avaliacao" | "organizacao" | "feedback";

const TABS: { label: string; value: Tab }[] = [
  { label: "Conteúdo", value: "conteudo" },
  { label: "Material de estudo", value: "material" },
  { label: "Vídeo de estudo", value: "video" },
  { label: "Avaliação", value: "avaliacao" },
  { label: "Organização", value: "organizacao" },
  { label: "Feedback", value: "feedback" },
];

/** A aba de Avaliação só faz sentido em atividade que de fato é avaliada. Numa
 *  aula ou autoestudo sem peso ela abria vazia — "sem enunciado", "sem
 *  avaliação" —, e isso valia para a maioria dos cards.
 *
 *  O critério é ter peso na nota, mas qualquer conteúdo de avaliação também
 *  abre a aba: assim nada some se o Adalove preencher enunciado ou nota numa
 *  atividade sem peso. */
function hasEvaluation(activity: ActivityView): boolean {
  return (
    activity.weight > 0 ||
    activity.evaluated ||
    !!activity.question?.trim() ||
    !!activity.answer?.trim()
  );
}

function tabsFor(activity: ActivityView): { label: string; value: Tab }[] {
  return TABS.filter((t) => t.value !== "avaliacao" || hasEvaluation(activity));
}

interface Material {
  uuid?: string;
  url?: string;
  link?: string;
  title?: string;
}

interface ActivityDetail {
  subjects?: { uuid: string; subject: string }[];
  prerequisites?: { uuid?: string; prerequisite?: string; title?: string }[];
  activityStudyMaterial?: Material[];
  activityVideoMaterial?: Material[];
}

function Empty({ children }: { children: string }) {
  return <p className="text-sm text-fg-muted">{children}</p>;
}

/** ~10 linhas de `text-sm leading-relaxed`. Acima disso o enunciado empurra o
 *  resto do modal para fora da vista. */
const CLAMP_PX = 232;

/** Conteúdo do Adalove com "Ver mais", igual ao deles. O corte é medido, não
 *  chutado por contagem de caracteres: o HTML tem listas, títulos e imagens, e
 *  contar caracteres erraria feio. */
function Html({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const sanitized = useMemo(() => sanitizeHtml(html), [html]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setOverflows(el.scrollHeight > CLAMP_PX + 8);
    check();
    // Imagens e fontes chegam depois e mudam a altura.
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [sanitized]);

  return (
    <div>
      <div
        ref={ref}
        className={cn(
          "adalove-prose relative text-sm leading-relaxed text-fg-soft",
          !expanded && overflows && "overflow-hidden",
        )}
        style={!expanded && overflows ? { maxHeight: CLAMP_PX } : undefined}
        // Sanitizado: sem script/iframe/handlers inline.
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />

      {overflows && (
        <>
          {!expanded && (
            <div
              aria-hidden
              className="-mt-10 h-10 bg-gradient-to-b from-transparent to-surface"
            />
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-1 inline-flex items-center gap-1 text-xs text-accent transition-opacity hover:opacity-80"
          >
            <ChevronDown
              size={12}
              aria-hidden
              className={cn("transition-transform duration-200", expanded && "rotate-180")}
            />
            {expanded ? "Ver menos" : "Ver mais"}
          </button>
        </>
      )}
    </div>
  );
}

function LinkList({
  items,
  icon: Icon,
  empty,
}: {
  items: Material[];
  icon: typeof ExternalLink;
  empty: string;
}) {
  if (!items.length) return empty ? <Empty>{empty}</Empty> : null;
  return (
    <ul className="space-y-2">
      {items.map((item, i) => {
        const href = item.url ?? item.link ?? null;
        const label = item.title ?? href ?? "Material";
        return (
          <li key={item.uuid ?? i}>
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-start gap-2 text-sm text-accent hover:underline"
              >
                <Icon size={14} aria-hidden className="mt-0.5 shrink-0" />
                <span className="min-w-0 break-all">{label}</span>
              </a>
            ) : (
              <span className="text-sm text-fg-soft">{label}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Alternativa precisa ao arraste — e a única forma quando a coluna de destino
 *  está fora da tela. Mesmo controle que o Adalove tem no rodapé do card. */
function MoveCard({
  activity,
  view,
  onMove,
}: {
  activity: ActivityView;
  view: SectionView;
  onMove: (activity: ActivityView, status: ActivityStatus, sort: number) => void;
}) {
  // O `sort` da API é uma ordenação global (chega a 22 numa coluna de 4), não o
  // índice dentro da coluna. A posição que o usuário vê e edita é o índice.
  const columnOf = (s: ActivityStatus) =>
    view.activities.filter((a) => a.week === activity.week && a.status === s);
  const currentIndex = columnOf(activity.status).findIndex((a) => a.id === activity.id) + 1;

  const [status, setStatus] = useState<ActivityStatus>(activity.status);
  const [position, setPosition] = useState(String(Math.max(currentIndex, 1)));

  const max =
    columnOf(status).filter((a) => a.id !== activity.id).length + 1;

  const parsed = Number(position);
  const valid = Number.isInteger(parsed) && parsed >= 1 && parsed <= max;
  const unchanged = status === activity.status && parsed === currentIndex;

  return (
    <div>
      <div className="mb-2 text-[0.58rem] uppercase tracking-[0.06em] text-fg-muted">
        Mover cartão
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[10rem] flex-1">
          <label className="block text-[0.58rem] uppercase tracking-[0.06em] text-fg-muted">
            Coluna
          </label>
          <Select
            className="mt-1"
            aria-label="Coluna"
            value={String(status)}
            onChange={(e) => setStatus(Number(e.target.value) as ActivityStatus)}
          >
            {([1, 2, 3] as ActivityStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </div>

        <div className="w-24">
          <label className="block text-[0.58rem] uppercase tracking-[0.06em] text-fg-muted">
            Posição
          </label>
          <input
            inputMode="numeric"
            aria-label="Posição"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className={cn(
              "mt-1 h-9 w-full rounded-control border bg-bg px-3 text-center font-mono text-sm text-fg outline-none transition-colors tabular",
              valid ? "border-line focus:border-accent" : "border-red",
            )}
          />
        </div>

        <Button
          variant="primary"
          disabled={!valid || unchanged}
          onClick={() => onMove(activity, status, parsed)}
        >
          Mudar
        </Button>

        <span className="w-full text-[0.62rem] text-fg-muted">
          {valid
            ? `1 a ${max} em ${STATUS_LABEL[status]}`
            : `A posição precisa estar entre 1 e ${max}`}
        </span>
      </div>
    </div>
  );
}

export function ActivityModal({
  activity,
  view,
  onClose,
  onMove,
}: {
  activity: ActivityView | null;
  view: SectionView;
  onClose: () => void;
  onMove?: (activity: ActivityView, status: ActivityStatus, sort: number) => void;
}) {
  const [tab, setTab] = useState<Tab>("conteudo");

  const { data: detail } = useApi<ActivityDetail>(
    activity ? `/student-activities/${activity.id}/activity/data` : null,
  );
  const subjects = useMemo(() => detail?.subjects ?? [], [detail]);
  const visibleTabs = useMemo(() => (activity ? tabsFor(activity) : TABS), [activity]);

  // Trocar de atividade pode tirar do ar a aba aberta (a de Avaliação some em
  // quem não é avaliado): sem isto o modal abriria num painel inexistente.
  useEffect(() => {
    if (!visibleTabs.some((t) => t.value === tab)) setTab("conteudo");
  }, [visibleTabs, tab]);

  if (!activity) return null;

  const Icon = activity.kind.icon;
  const canMove = !!onMove && view.section.allowCardMovement;

  return (
    <Modal
      open
      onClose={onClose}
      className="max-w-[820px]"
      icon={
        <span
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-control"
          style={{ background: `color-mix(in srgb, ${activity.kind.color} 15%, transparent)` }}
        >
          <Icon size={15} aria-hidden style={{ color: activity.kind.color }} />
        </span>
      }
      title={
        <span className="flex items-center gap-2">
          <span className="min-w-0">{activity.caption}</span>
          {activity.favorite && (
            <Star size={13} aria-hidden className="shrink-0 fill-yellow text-yellow" />
          )}
        </span>
      }
      subtitle={`${activity.kind.name} · ${activity.week}`}
      footer={
        <div className="space-y-3">
          {canMove && <MoveCard activity={activity} view={view} onMove={onMove!} />}
          <div
            className={cn(
              "flex flex-wrap items-center justify-between gap-3",
              canMove && "border-t border-line-soft pt-3",
            )}
          >
            <span className="text-xs text-fg-soft">Explicar com IA</span>
            <AskAiButtons activity={activity} view={view} />
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {activity.weight > 0 ? (
            <Badge tone="positive">Atividade ponderada: {activity.weight} pontos</Badge>
          ) : (
            <Badge tone="negative">Atividade não ponderada</Badge>
          )}
          {activity.required && <Badge tone="info">Atividade obrigatória</Badge>}
          <Badge color="var(--color-orange)">
            {activity.studyType === "class" ? "Em sala" : "Semana"}
          </Badge>
          <Badge color={CATEGORY_COLOR[activity.category]}>{activity.category}</Badge>
          <Badge
            tone={activity.status === 3 ? "positive" : activity.status === 2 ? "warning" : "default"}
          >
            {STATUS_LABEL[activity.status]}
          </Badge>
          {activity.axis && <Badge>Eixo {activity.axis}</Badge>}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-soft">
          {activity.professor && (
            <span className="inline-flex items-center gap-1.5">
              <UserRound size={12} aria-hidden className="text-fg-muted" />
              {activity.professor}
            </span>
          )}
          {activity.assistant && (
            <span className="inline-flex items-center gap-1.5">
              <Users size={12} aria-hidden className="text-fg-muted" />
              {activity.assistant}
            </span>
          )}
          {formatDate(activity.date) && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock size={12} aria-hidden className="text-fg-muted" />
              {formatDate(activity.date)}
            </span>
          )}
        </div>

        <Tabs options={visibleTabs} value={tab} onChange={setTab} />

        {tab === "conteudo" && (
          <div className="space-y-4">
            {activity.descriptionHtml ? (
              <Html html={activity.descriptionHtml} />
            ) : (
              <Empty>Esta atividade não tem descrição.</Empty>
            )}

            {subjects.length > 0 && (
              <div className="border-t border-line-soft pt-3">
                <div className="text-[0.58rem] uppercase tracking-[0.06em] text-fg-muted">
                  Assuntos relacionados
                </div>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {subjects.map((s) => (
                    <li key={s.uuid}>
                      <Badge>{s.subject}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {tab === "material" && (
          <div className="space-y-3">
            {activity.url && (
              <a
                href={activity.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-start gap-2 text-sm text-accent hover:underline"
              >
                <ExternalLink size={14} aria-hidden className="mt-0.5 shrink-0" />
                <span className="min-w-0 break-all">{activity.url}</span>
              </a>
            )}
            <LinkList
              items={detail?.activityStudyMaterial ?? []}
              icon={ExternalLink}
              empty={activity.url ? "" : "Sem material de estudo cadastrado."}
            />
          </div>
        )}

        {tab === "video" && (
          <LinkList
            items={detail?.activityVideoMaterial ?? []}
            icon={Video}
            empty="Sem vídeo de estudo cadastrado."
          />
        )}

        {tab === "avaliacao" && (
          <div className="space-y-4">
            {activity.question ? (
              <div>
                <div className="text-[0.58rem] uppercase tracking-[0.06em] text-fg-muted">
                  Pergunta
                </div>
                <div className="mt-1">
                  <Html html={activity.question} />
                </div>
              </div>
            ) : (
              <Empty>Esta atividade não tem enunciado de avaliação.</Empty>
            )}

            {activity.answer && (
              <div className="rounded-card border border-line bg-bg p-3">
                <div className="text-[0.58rem] uppercase tracking-[0.06em] text-fg-muted">
                  Resposta
                </div>
                <div className="mt-1">
                  <Html html={activity.answer} />
                </div>
              </div>
            )}

            <div className="border-t border-line-soft pt-3 text-sm">
              <span className="text-fg-muted">Avaliação: </span>
              {activity.evaluated ? (
                <span className="font-mono text-fg tabular">{fmtNota(activity.grade)}</span>
              ) : (
                <span className="text-fg-soft">Sem avaliação até o momento</span>
              )}
            </div>
          </div>
        )}

        {tab === "organizacao" && (
          <div className="space-y-4">
            {activity.notes ? (
              <div>
                <div className="text-[0.58rem] uppercase tracking-[0.06em] text-fg-muted">
                  Anotações
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-fg-soft">{activity.notes}</p>
              </div>
            ) : (
              <Empty>Você não escreveu anotações nesta atividade.</Empty>
            )}

            {(activity.positivePoints ?? activity.negativePoints) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {activity.positivePoints && (
                  <div>
                    <div className="text-[0.58rem] uppercase tracking-[0.06em] text-green">
                      Pontos positivos
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-fg-soft">
                      {activity.positivePoints}
                    </p>
                  </div>
                )}
                {activity.negativePoints && (
                  <div>
                    <div className="text-[0.58rem] uppercase tracking-[0.06em] text-red">
                      Pontos negativos
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-fg-soft">
                      {activity.negativePoints}
                    </p>
                  </div>
                )}
              </div>
            )}

            {(detail?.prerequisites?.length ?? 0) > 0 && (
              <div className="border-t border-line-soft pt-3">
                <div className="text-[0.58rem] uppercase tracking-[0.06em] text-fg-muted">
                  Pré-requisitos
                </div>
                <ul className="mt-2 space-y-1 text-sm text-fg-soft">
                  {detail!.prerequisites!.map((p, i) => (
                    <li key={p.uuid ?? i}>{p.title ?? p.prerequisite}</li>
                  ))}
                </ul>
              </div>
            )}

            {activity.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {activity.tags.map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "feedback" && (
          <div className="space-y-4">
            {activity.feedback ? (
              <div>
                <div className="text-[0.58rem] uppercase tracking-[0.06em] text-fg-muted">
                  Individual
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-fg-soft">{activity.feedback}</p>
              </div>
            ) : (
              <Empty>Sem feedback do professor até o momento.</Empty>
            )}

            {activity.feedbackGroup && (
              <div className="border-t border-line-soft pt-3">
                <div className="text-[0.58rem] uppercase tracking-[0.06em] text-fg-muted">
                  Do grupo
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-fg-soft">
                  {activity.feedbackGroup}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
