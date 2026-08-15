import { ArrowUpRight, Check, Copy, Newspaper, Users } from "lucide-react";
import { useState } from "react";
import { relativeTime, type NewsItem } from "~/data/news";
import type { SectionView } from "~/data/viewmodel";
import { cn } from "~/lib/cn";
import { Logo } from "~/lib/logos";
import { copyText } from "~/lib/prefs";
import { SHORTCUT_CLASS, shortcut, stopCardClick } from "~/ui/shortcut";
import { Button } from "~/ui/Button";
import { Card, CardTitle } from "~/ui/Card";
import { Skeleton } from "~/ui/Skeleton";

function ProjectCard({ view, onSeeAll }: { view: SectionView; onSeeAll?: () => void }) {
  return (
    <Card
      className={cn("flex flex-col p-4", onSeeAll && SHORTCUT_CLASS)}
      {...shortcut("Ver todos os estudantes da turma", onSeeAll)}
    >
      <CardTitle>Turma</CardTitle>
      <div className="mt-3 flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-control border border-line bg-bg">
          <Users size={16} aria-hidden className="text-accent" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-fg">
            {view.section.project ?? view.section.caption}
          </div>
          {view.section.advisor && (
            <div className="mt-0.5 truncate text-xs text-fg-muted">
              Orientação: {view.section.advisor}
            </div>
          )}
        </div>
      </div>

      {view.section.projectDescription && (
        <p className="mt-3 text-xs leading-relaxed text-fg-soft">
          {view.section.projectDescription}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
        <span className="font-mono text-xs text-fg-muted tabular">
          {view.classmates.length} estudantes
        </span>
        {onSeeAll && (
          <Button variant="outline" className="h-8 px-2.5 text-xs" onClick={onSeeAll}>
            Ver todos
          </Button>
        )}
      </div>
    </Card>
  );
}

function DriveCard({ view }: { view: SectionView }) {
  const [copied, setCopied] = useState(false);
  const url = view.section.repository;

  async function copy() {
    if (!url) return;
    if (await copyText(url)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Card
      className={cn("flex flex-col p-4", url && SHORTCUT_CLASS)}
      // A ação principal do card é abrir a pasta; o botão de copiar continua
      // sendo dele, e por isso corta a propagação do clique logo abaixo.
      {...shortcut(
        "Abrir a pasta de materiais da turma",
        url ? () => window.open(url, "_blank", "noopener,noreferrer") : undefined,
      )}
    >
      <CardTitle>Materiais da turma</CardTitle>
      <div className="mt-3 flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-control border border-line bg-bg">
          <Logo name="drive" size={17} />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-medium text-fg">Google Drive</div>
          <div className="mt-0.5 font-mono text-xs text-fg-muted">{view.section.caption}</div>
        </div>
      </div>

      <div className="mt-auto flex items-center gap-2 pt-4">
        {url ? (
          <>
            {/* Sem `stopPropagation` o clique no link abriria a pasta duas
                vezes: uma pela âncora e outra pelo atalho do card. */}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={stopCardClick}
              className="inline-flex h-8 items-center gap-1.5 rounded-control border border-line bg-surface px-2.5 text-xs font-medium text-fg transition-colors duration-150 hover:border-accent hover:text-accent"
            >
              Abrir pasta
              <ArrowUpRight size={13} aria-hidden />
            </a>
            <button
              type="button"
              title="Copiar link"
              aria-label="Copiar link"
              onClick={(e) => {
                stopCardClick(e);
                void copy();
              }}
              className="inline-flex size-8 items-center justify-center rounded-control border border-line bg-surface text-fg-soft transition-colors duration-150 hover:border-accent hover:text-accent"
            >
              {copied ? (
                <Check size={13} aria-hidden className="text-green" />
              ) : (
                <Copy size={13} aria-hidden />
              )}
            </button>
          </>
        ) : (
          <span className="text-xs text-fg-muted">Esta turma não tem pasta cadastrada.</span>
        )}
      </div>
    </Card>
  );
}

function NewsCard({ news, loading }: { news: NewsItem[] | null; loading: boolean }) {
  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-center justify-between gap-2">
        <CardTitle>Notícias</CardTitle>
        <a
          href="/feed"
          className="inline-flex items-center gap-1 text-xs text-accent transition-opacity hover:opacity-80"
        >
          Ver todas
          <ArrowUpRight size={12} aria-hidden />
        </a>
      </div>

      {loading ? (
        <div className="mt-3 space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : news && news.length > 0 ? (
        <ul className="mt-3 space-y-3">
          {news.slice(0, 3).map((item) => (
            <li key={item.id} className="border-b border-line-soft pb-3 last:border-0 last:pb-0">
              <div className="flex flex-wrap items-baseline gap-x-2 text-[0.62rem]">
                <span className="text-fg-muted">{relativeTime(item.date) ?? ""}</span>
                {item.author && <span className="truncate text-purple">{item.author}</span>}
              </div>
              {item.title && (
                <div className="mt-1 truncate text-xs font-medium text-fg">{item.title}</div>
              )}
              {item.body && (
                <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-fg-soft">{item.body}</p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-3 flex flex-1 items-center gap-2 text-xs text-fg-muted">
          <Newspaper size={14} aria-hidden />
          Nenhuma notícia por aqui.
        </div>
      )}
    </Card>
  );
}

export function SectionCards({
  view,
  news,
  newsLoading = false,
  onSeeStudents,
}: {
  view: SectionView;
  news: NewsItem[] | null;
  newsLoading?: boolean;
  onSeeStudents?: () => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <ProjectCard view={view} onSeeAll={onSeeStudents} />
      <DriveCard view={view} />
      <NewsCard news={news} loading={newsLoading} />
    </div>
  );
}
