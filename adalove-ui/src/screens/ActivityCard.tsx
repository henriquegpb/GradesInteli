import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Star } from "lucide-react";
import { useState } from "react";
import { AskAiButtons } from "~/ai/AskAiButton";
import { CATEGORY_COLOR } from "~/data/activityTypes";
import type { ActivityView, SectionView } from "~/data/viewmodel";
import { cn } from "~/lib/cn";
import { Badge } from "~/ui/Badge";

/** Conteúdo visual do card, sem nada de arraste. Compartilhado com o
 *  DragOverlay para que o card arrastado seja idêntico ao parado — antes o
 *  overlay redesenhava uma versão reduzida, e o eixo sumia e a altura mudava. */
export function ActivityCardBody({ activity }: { activity: ActivityView }) {
  const Icon = activity.kind.icon;

  return (
    <>
      <div className="flex items-start gap-2">
        <Icon
          size={14}
          aria-hidden
          className="mt-0.5 shrink-0"
          style={{ color: activity.kind.color }}
        />
        <span className="min-w-0 flex-1 text-sm leading-snug text-fg">{activity.caption}</span>
        {activity.favorite && (
          <Star size={12} aria-hidden className="mt-0.5 shrink-0 fill-yellow text-yellow" />
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1">
        {activity.weight > 0 && (
          <Badge color={CATEGORY_COLOR[activity.category]}>
            {activity.category} · {activity.weight}
          </Badge>
        )}
        {activity.axis && <Badge>{activity.axis}</Badge>}
        {activity.evaluated && activity.grade !== null && (
          <Badge tone="positive" className="font-mono tabular">
            {activity.grade.toFixed(1)}
          </Badge>
        )}
      </div>
    </>
  );
}

export function ActivityCard({
  activity,
  view,
  onOpen,
  draggable = true,
}: {
  activity: ActivityView;
  view: SectionView;
  onOpen: (activity: ActivityView) => void;
  draggable?: boolean;
}) {
  // Os botões de IA são 4 SVGs inline cada. Montá-los nos 200 cards de uma vez
  // enchia o DOM com 800 SVGs e travava o arraste; agora só entram no hover.
  const [hovered, setHovered] = useState(false);

  // `useSortable` em vez de `useDraggable`: é o que faz os vizinhos abrirem
  // espaço, permitindo soltar ENTRE cards e não só na coluna.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: activity.id,
    disabled: !draggable,
    data: { status: activity.status, week: activity.week },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        // Sem contorno: o card se separa do fundo pela superfície, não por linha.
        // O hover então tem que vir do fundo — sem ele o card ficaria inerte.
        "group relative rounded-card bg-surface transition-colors duration-150",
        "hover:bg-surface-hover",
        // Fantasma no lugar de origem enquanto o overlay segue o cursor.
        isDragging && "opacity-30",
      )}
    >
      {/* A área de arraste é o corpo do card; os botões ficam fora dela para
          que clicar num deles não inicie um drag. */}
      <button
        type="button"
        data-activity-card={activity.id}
        onClick={() => onOpen(activity)}
        className="w-full cursor-pointer p-3 text-left"
        {...listeners}
        {...attributes}
      >
        <ActivityCardBody activity={activity} />
      </button>

      {hovered && !isDragging && (
        <div className="absolute right-2 top-2">
          <AskAiButtons activity={activity} view={view} size="sm" />
        </div>
      )}
    </div>
  );
}
