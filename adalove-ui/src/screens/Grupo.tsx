import { ArrowLeft } from "lucide-react";
import type { RawStudent } from "~/data/types";
import type { SectionView } from "~/data/viewmodel";
import { Card, CardTitle } from "~/ui/Card";

/** Telas de detalhe não têm item na sidebar, então precisam da própria volta. */
function BackLink({ onBack }: { onBack?: () => void }) {
  if (!onBack) return null;
  return (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center gap-1.5 text-xs text-fg-muted transition-colors hover:text-fg"
    >
      <ArrowLeft size={13} aria-hidden />
      Visão geral
    </button>
  );
}

/** "G03" -> 3; sem grupo (raro, mas existe) vai para o fim da lista. */
function groupOrder(caption: string | null): number {
  const n = caption ? parseInt(caption.replace(/\D/g, ""), 10) : NaN;
  return Number.isNaN(n) ? Infinity : n;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase();
}

function PersonRow({ student, me }: { student: RawStudent; me: boolean }) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-bg font-mono text-[0.62rem] text-fg-soft">
        {initials(student.name)}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-fg">
        {student.name}
        {me && <span className="ml-2 text-xs text-accent">você</span>}
      </span>
      {student.groupCaption && (
        <span className="shrink-0 font-mono text-xs text-fg-muted">{student.groupCaption}</span>
      )}
    </li>
  );
}

export function Grupo({ view, onBack }: { view: SectionView; onBack?: () => void }) {
  const others = view.classmates
    .filter((s) => !view.group.members.some((m) => m.uuid === s.uuid))
    .sort(
      (a, b) =>
        groupOrder(a.groupCaption) - groupOrder(b.groupCaption) || a.name.localeCompare(b.name),
    );

  // Quebra a lista em blocos por grupo (a ordenação acima já deixa cada grupo
  // contíguo) — sem isso a Turma inteira vira uma lista corrida e o olho perde
  // onde um grupo termina e o outro começa.
  const clusters: RawStudent[][] = [];
  for (const s of others) {
    const last = clusters.at(-1);
    if (last && last[0]?.groupCaption === s.groupCaption) last.push(s);
    else clusters.push([s]);
  }

  return (
    <div className="space-y-4">
      <BackLink onBack={onBack} />
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h1 className="text-xl font-medium text-fg">Grupo</h1>
        {view.group.caption && (
          <span className="font-mono text-xs text-fg-muted">{view.group.caption}</span>
        )}
      </div>

      {view.group.members.length > 0 && (
        <Card>
          <div className="border-b border-line px-4 py-3">
            <CardTitle>Meu grupo · {view.group.caption}</CardTitle>
          </div>
          <ul className="divide-y divide-line-soft">
            {view.group.members.map((s) => (
              <PersonRow key={s.uuid} student={s} me={s.name === view.studentName} />
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <div className="border-b border-line px-4 py-3">
          <CardTitle>Turma · {others.length} colegas</CardTitle>
        </div>
        <div className="divide-y divide-line">
          {clusters.map((cluster) => (
            <ul key={cluster[0]!.groupCaption ?? cluster[0]!.uuid} className="divide-y divide-line-soft">
              {cluster.map((s) => (
                <PersonRow key={s.uuid} student={s} me={false} />
              ))}
            </ul>
          ))}
        </div>
      </Card>
    </div>
  );
}
