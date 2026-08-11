import { cn } from "~/lib/cn";
import { Card } from "~/ui/Card";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-line-soft", className)} />;
}

// Esqueletos com a FORMA do conteúdo que substituem. Um retângulo genérico
// avisa que algo carrega, mas o layout ainda pula quando o dado chega; com a
// forma certa, a página só ganha conteúdo no lugar onde ele já estava.

/** Título da página + contador ao lado. */
export function SkeletonHeader() {
  return (
    <div className="flex items-baseline gap-3">
      <Skeleton className="h-6 w-44" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

/** Fileira de cards de métrica. */
export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="px-4 py-3">
          <Skeleton className="h-2 w-20" />
          <Skeleton className="mt-2.5 h-6 w-24" />
          <Skeleton className="mt-2 h-2 w-28" />
        </Card>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 8, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-card border border-line">
      <div className="flex gap-4 border-b border-line bg-surface px-3 py-2.5">
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} className={cn("h-2", i === 0 ? "flex-1" : "w-16")} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-line-soft px-3 py-3 last:border-0">
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton key={c} className={cn("h-3", c === 0 ? "flex-1" : "w-16")} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Grade de cards de conteúdo (empresas, universidades, pratos…). */
export function SkeletonGrid({
  count = 6,
  columns = 3,
  lines = 2,
}: {
  count?: number;
  columns?: number;
  lines?: number;
}) {
  return (
    <div
      className={cn(
        "grid gap-3 sm:grid-cols-2",
        columns === 3 && "lg:grid-cols-3",
        columns === 4 && "lg:grid-cols-4",
      )}
    >
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-start gap-2">
            <Skeleton className="size-4 shrink-0 rounded-full" />
            <Skeleton className="h-3 flex-1" />
          </div>
          {Array.from({ length: lines }, (_, l) => (
            <Skeleton key={l} className={cn("mt-2 h-2", l === lines - 1 ? "w-2/3" : "w-full")} />
          ))}
        </Card>
      ))}
    </div>
  );
}

/** Lista de itens com título e duas linhas (notícias, editais). */
export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <Card key={i} className="p-4">
          <div className="flex gap-2">
            <Skeleton className="h-2 w-16" />
            <Skeleton className="h-2 w-24" />
          </div>
          <Skeleton className="mt-2 h-3 w-1/3" />
          <Skeleton className="mt-2 h-2 w-full" />
          <Skeleton className="mt-1.5 h-2 w-4/5" />
        </Card>
      ))}
    </div>
  );
}

/** Texto longo (páginas de conteúdo). */
export function SkeletonProse() {
  const widths = ["w-full", "w-11/12", "w-full", "w-4/5", "w-full", "w-3/5"];
  return (
    <Card className="space-y-3 p-6">
      <Skeleton className="h-5 w-56" />
      <div className="space-y-2 pt-2">
        {widths.map((w, i) => (
          <Skeleton key={i} className={cn("h-2.5", w)} />
        ))}
      </div>
      <Skeleton className="h-4 w-40 pt-2" />
      <div className="space-y-2">
        {widths.slice(0, 4).map((w, i) => (
          <Skeleton key={i} className={cn("h-2.5", w)} />
        ))}
      </div>
    </Card>
  );
}

/** A Visão geral inteira — usada no primeiro carregamento da overlay. */
export function SkeletonOverview() {
  return (
    <div className="space-y-4">
      <SkeletonHeader />
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <Card key={i} className="px-4 py-3">
            <Skeleton className="h-2 w-24" />
            <Skeleton className="mt-2.5 h-6 w-20" />
            <Skeleton className="mt-2 h-2 w-32" />
          </Card>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="px-4 py-3">
            <Skeleton className="h-2 w-20" />
            <Skeleton className="mt-3 h-5 w-28" />
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Card className="flex items-center gap-4 p-4">
          <Skeleton className="size-[110px] shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-2.5 w-full" />
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <Skeleton className="h-2 w-16" />
          <Skeleton className="mt-3 h-7 w-28" />
          <Skeleton className="mt-3 h-1.5 w-full" />
        </Card>
      </div>
      <Card className="px-4 py-3">
        <Skeleton className="h-4 w-52" />
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-2 w-20" />
            <div className="mt-4 flex h-24 items-end gap-2">
              {[0.35, 0.6, 1].map((h, j) => (
                <div key={j} className="flex-1" style={{ height: `${h * 100}%` }}>
                  <Skeleton className="h-full w-full" />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/** Sidebar + conteúdo: o primeiro paint da overlay, antes do /userdata chegar. */
export function SkeletonShell() {
  return (
    <div className="flex min-h-screen w-full bg-bg">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col gap-1 border-r border-line bg-surface p-3">
        <div className="mb-4 flex items-center gap-2.5 p-1.5">
          <Skeleton className="size-[34px] shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-1.5 h-2 w-28" />
          </div>
        </div>
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 lg:px-6">
        <div className="mx-auto w-full max-w-[1400px]">
          <SkeletonOverview />
        </div>
      </main>
    </div>
  );
}
