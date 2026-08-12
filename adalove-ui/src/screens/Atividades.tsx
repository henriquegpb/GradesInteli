import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { normalize } from "@/lib/normalize";
import { CATEGORY_COLOR } from "~/data/activityTypes";
import { STATUS_DOING, STATUS_DONE, STATUS_LABEL, STATUS_TODO, type ActivityStatus } from "~/data/types";
import type { ActivityView, SectionView } from "~/data/viewmodel";
import { cn } from "~/lib/cn";
import { ActivityCard, ActivityCardBody } from "~/screens/ActivityCard";
import { Badge } from "~/ui/Badge";
import { Button } from "~/ui/Button";
import { Card } from "~/ui/Card";
import { SearchInput } from "~/ui/Input";
import { Select } from "~/ui/Select";
import { Switch } from "~/ui/Switch";
import { Table, TableContainer, Td, Th } from "~/ui/Table";

const COLUMNS: ActivityStatus[] = [STATUS_TODO, STATUS_DOING, STATUS_DONE];

/** `closestCorners` sozinho erra o alvo quando a coluna está vazia: um card da
 *  coluna vizinha, cheia, fica com o canto mais perto do ponteiro e vence. Com
 *  `pointerWithin` a pergunta passa a ser "sobre o que o ponteiro está", que é o
 *  que importa aqui; `closestCorners` fica só como rede quando o ponteiro sai
 *  de qualquer área válida. */
const collisionDetection: CollisionDetection = (args) => {
  const withinPointer = pointerWithin(args);
  return withinPointer.length > 0 ? withinPointer : closestCorners(args);
};

/** Colunas de UMA semana — a unidade do arraste. O kanban do Adalove é por
 *  semana, então mover um card para outra semana não faria sentido. */
type WeekColumns = Record<ActivityStatus, ActivityView[]>;

function columnsOf(activities: ActivityView[]): WeekColumns {
  return {
    [STATUS_TODO]: activities.filter((a) => a.status === STATUS_TODO),
    [STATUS_DOING]: activities.filter((a) => a.status === STATUS_DOING),
    [STATUS_DONE]: activities.filter((a) => a.status === STATUS_DONE),
  };
}

function findColumn(columns: WeekColumns, id: string): ActivityStatus | null {
  for (const status of COLUMNS) {
    if (columns[status].some((a) => a.id === id)) return status;
  }
  return null;
}

function Column({
  status,
  activities,
  view,
  onOpen,
  canDrag,
}: {
  status: ActivityStatus;
  activities: ActivityView[];
  view: SectionView;
  onOpen: (a: ActivityView) => void;
  canDrag: boolean;
}) {
  // Este droppable cobre a coluna vazia; entre cards, quem resolve a posição é
  // o SortableContext.
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}`, data: { status } });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-32 flex-col gap-2 rounded-card border border-dashed p-2 transition-colors duration-150",
        isOver ? "border-accent bg-accent/5" : "border-line-soft",
      )}
    >
      <div className="flex items-center justify-between px-1">
        <span className="text-[0.62rem] font-medium uppercase tracking-[0.04em] text-fg-muted">
          {STATUS_LABEL[status]}
        </span>
        <span className="font-mono text-[0.62rem] text-fg-muted tabular">{activities.length}</span>
      </div>

      <SortableContext
        items={activities.map((a) => a.id)}
        strategy={verticalListSortingStrategy}
        disabled={!canDrag}
      >
        {activities.map((a) => (
          <ActivityCard key={a.id} activity={a} view={view} onOpen={onOpen} draggable={canDrag} />
        ))}
      </SortableContext>
    </div>
  );
}

export function Atividades({
  view,
  onOpen,
  onMove,
  week = "all",
  onWeekChange,
  onBack,
}: {
  view: SectionView;
  onOpen: (a: ActivityView) => void;
  /** `sort` é a posição 1-based na coluna de destino — o mesmo que o Adalove envia. */
  onMove?: (activity: ActivityView, status: ActivityStatus, sort: number) => void;
  week?: string;
  onWeekChange?: (week: string) => void;
  onBack?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [kindId, setKindId] = useState("all");
  const [axis, setAxis] = useState("all");
  const [onlyGraded, setOnlyGraded] = useState(false);
  const [onlyWeighted, setOnlyWeighted] = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [mode, setMode] = useState<"kanban" | "tabela">("kanban");

  // Enquanto arrasta, a ordem vive aqui: é isso que faz os vizinhos abrirem
  // espaço na coluna de destino ANTES de soltar.
  const [drag, setDrag] = useState<{ id: string; week: string; columns: WeekColumns } | null>(null);

  const sensors = useSensors(
    // 5px de folga: sem isso um clique no card viraria drag e o modal nunca abriria.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return view.activities.filter((a) => {
      if (q && !normalize(a.caption).includes(q) && !normalize(a.descriptionText).includes(q))
        return false;
      if (kindId !== "all" && String(a.kind.id) !== kindId) return false;
      if (axis !== "all" && a.axis !== axis) return false;
      if (week !== "all" && a.week !== week) return false;
      if (onlyGraded && !a.evaluated) return false;
      if (onlyWeighted && a.weight <= 0) return false;
      if (onlyFavorites && !a.favorite) return false;
      return true;
    });
  }, [view.activities, query, kindId, axis, week, onlyGraded, onlyWeighted, onlyFavorites]);

  const weeks = useMemo(() => {
    const map = new Map<string, ActivityView[]>();
    for (const a of filtered) {
      const list = map.get(a.week);
      if (list) list.push(a);
      else map.set(a.week, [a]);
    }
    return [...map.entries()]
      .map(([label, list]) => ({ label, num: list[0]?.weekNum ?? 0, activities: list }))
      .sort((a, b) => a.num - b.num);
  }, [filtered]);

  const dragging = drag ? view.activities.find((a) => a.id === drag.id) : null;

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    const activity = view.activities.find((a) => a.id === id);
    if (!activity) return;
    setDrag({
      id,
      week: activity.week,
      columns: columnsOf(filtered.filter((a) => a.week === activity.week)),
    });
  }

  /** Reposiciona o card durante o arraste. A posição final só é persistida no fim. */
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || !drag) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const from = findColumn(drag.columns, activeId);
    const to = overId.startsWith("col:")
      ? (Number(overId.slice(4)) as ActivityStatus)
      : findColumn(drag.columns, overId);
    if (from == null || to == null) return;

    // Pairar sobre o fundo da própria coluna não é um reposicionamento — sem
    // esta guarda o card era jogado para o fim dela a cada evento de over.
    if (from === to && overId.startsWith("col:")) return;

    const moved = drag.columns[from].find((a) => a.id === activeId);
    if (!moved) return;

    const source = drag.columns[from].filter((a) => a.id !== activeId);
    const target = from === to ? source : [...drag.columns[to]];
    const overIndex = target.findIndex((a) => a.id === overId);
    const insertAt = overIndex === -1 ? target.length : overIndex;

    // O dnd-kit dispara `over` a cada frame. Sem esta saída, cada um deles
    // re-renderizava a semana inteira — era daí que vinha a lentidão.
    if (from === to && drag.columns[from][insertAt]?.id === activeId) return;

    target.splice(insertAt, 0, moved);

    setDrag({
      ...drag,
      columns: { ...drag.columns, [from]: from === to ? target : source, [to]: target },
    });
  }

  function handleDragEnd() {
    const state = drag;
    setDrag(null);
    if (!state || !onMove) return;

    const activity = view.activities.find((a) => a.id === state.id);
    const status = findColumn(state.columns, state.id);
    if (!activity || status == null) return;

    const sort = state.columns[status].findIndex((a) => a.id === state.id) + 1;
    if (activity.status === status && activity.sort === sort) return;
    onMove(activity, status, sort);
  }

  const hasFilters =
    query !== "" ||
    kindId !== "all" ||
    axis !== "all" ||
    week !== "all" ||
    onlyGraded ||
    onlyWeighted ||
    onlyFavorites;

  function clearFilters() {
    setQuery("");
    setKindId("all");
    setAxis("all");
    onWeekChange?.("all");
    setOnlyGraded(false);
    setOnlyWeighted(false);
    setOnlyFavorites(false);
  }

  return (
    <div className="space-y-4">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-fg-muted transition-colors hover:text-fg"
        >
          <ArrowLeft size={13} aria-hidden />
          Visão geral
        </button>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="text-xl font-medium text-fg">Atividades</h1>
        <span className="font-mono text-xs text-fg-muted">
          {filtered.length} de {view.activities.length}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant={mode === "kanban" ? "primary" : "outline"}
            className="h-8 px-2.5 text-xs"
            onClick={() => setMode("kanban")}
          >
            Kanban
          </Button>
          <Button
            variant={mode === "tabela" ? "primary" : "outline"}
            className="h-8 px-2.5 text-xs"
            onClick={() => setMode("tabela")}
          >
            Tabela
          </Button>
        </div>
      </div>

      <Card className="space-y-3 p-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <SearchInput
            placeholder="Buscar por atividade"
            aria-label="Buscar por atividade"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Select
            aria-label="Tipo de atividade"
            value={kindId}
            onChange={(e) => setKindId(e.target.value)}
          >
            <option value="all">Todos os tipos</option>
            {view.kinds.map((k) => (
              <option key={k.id} value={String(k.id)}>
                {k.name}
              </option>
            ))}
          </Select>
          <Select aria-label="Eixo" value={axis} onChange={(e) => setAxis(e.target.value)}>
            <option value="all">Todos os eixos</option>
            {view.axes.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Semana"
            value={week}
            onChange={(e) => onWeekChange?.(e.target.value)}
            disabled={!onWeekChange}
          >
            <option value="all">Todas as semanas</option>
            {view.weeks.map((w) => (
              <option key={w.key} value={w.key}>
                {w.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Switch checked={onlyGraded} onChange={setOnlyGraded} label="Apenas avaliadas" />
          <Switch checked={onlyWeighted} onChange={setOnlyWeighted} label="Apenas ponderadas" />
          <Switch checked={onlyFavorites} onChange={setOnlyFavorites} label="Favoritos" />
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto text-xs text-accent underline-offset-2 hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-6">
          <p className="text-sm text-fg-muted">Nenhuma atividade com esses filtros.</p>
        </Card>
      ) : mode === "tabela" ? (
        <TableContainer>
          <Table>
            <thead>
              <tr>
                <Th>Atividade</Th>
                <Th className="w-28">Semana</Th>
                <Th className="w-24">Status</Th>
                <Th className="w-20 text-right">Peso</Th>
                <Th className="w-20 text-right">Nota</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => onOpen(a)}
                  className="cursor-pointer transition-colors hover:bg-surface-hover"
                >
                  <Td>
                    <div className="flex items-center gap-2">
                      <a.kind.icon
                        size={13}
                        aria-hidden
                        className="shrink-0"
                        style={{ color: a.kind.color }}
                      />
                      <span className="min-w-0 truncate text-xs">{a.caption}</span>
                    </div>
                  </Td>
                  <Td className="font-mono text-xs text-fg-muted tabular">{a.week}</Td>
                  <Td>
                    <Badge
                      tone={a.status === 3 ? "positive" : a.status === 2 ? "warning" : "default"}
                    >
                      {STATUS_LABEL[a.status]}
                    </Badge>
                  </Td>
                  <Td className="text-right font-mono text-xs tabular">
                    {a.weight > 0 ? a.weight : "—"}
                  </Td>
                  <Td className="text-right font-mono text-xs tabular">
                    {a.grade !== null ? a.grade.toFixed(1) : "—"}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableContainer>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setDrag(null)}
        >
          <div className="space-y-6">
            {weeks.map((weekGroup) => {
              // Durante o arraste, a semana ativa desenha a partir do estado
              // local — que já reflete onde o card vai cair.
              const columns =
                drag?.week === weekGroup.label ? drag.columns : columnsOf(weekGroup.activities);

              return (
                <section key={weekGroup.label} className="space-y-2">
                  <h2 className="text-sm font-medium text-fg">{weekGroup.label}</h2>
                  <div className="grid gap-3 md:grid-cols-3">
                    {COLUMNS.map((status) => (
                      <Column
                        key={status}
                        status={status}
                        activities={columns[status]}
                        view={view}
                        onOpen={onOpen}
                        canDrag={!!onMove}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Mesmo corpo do card parado: o arrastado não muda de altura nem
              perde badges no caminho. */}
          <DragOverlay dropAnimation={null}>
            {dragging && (
              <div className="rounded-card bg-surface-hover p-3 shadow-2xl">
                <ActivityCardBody activity={dragging} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
