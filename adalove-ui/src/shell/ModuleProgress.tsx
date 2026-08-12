import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { useApi } from "~/data/api";
import type { SectionView } from "~/data/viewmodel";
import { cn } from "~/lib/cn";
import { startOfWeek } from "~/lib/date";
import { Tooltip } from "~/ui/Tooltip";

// O número do módulo NÃO sai do caption da turma: "T11" é o nome da turma e é o
// mesmo desde o primeiro módulo. Sai do currículo, em
// GET /student-curriculums/student-record — o mesmo payload da tela de Histórico.
//
// Também não dá para calcular por aritmética de ano/semestre: o registro deste
// aluno vai do CC09 direto para o CC11, sem CC10. Qualquer `(ano-1)*2+semestre`
// erraria em silêncio, que é o pior tipo de erro para um número exibido.

interface RecordModule {
  code?: string | null;
  caption?: string | null;
  status?: string | null;
  startDate?: string | null;
}

interface StudentRecord {
  programs?: { modules?: RecordModule[] }[];
}

const DAY = 86_400_000;
const WEEK = 7 * DAY;

function isApproved(status: string | null | undefined) {
  return (status ?? "").toUpperCase().startsWith("APROV");
}

/** O número vem do caption ("Módulo 11: …"); o `code` ("GRAD CC11") é a rede de
 *  segurança para quando o caption vier vazio. */
function moduleNumber(m: RecordModule): number | null {
  const raw = /(\d{1,2})/.exec(m.caption ?? "")?.[1] ?? /(\d{1,2})\s*$/.exec(m.code ?? "")?.[1];
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** O módulo em curso é o último ainda sem aprovação. O currículo só lista o que
 *  o aluno já cursou, então o último da lista é o atual — e o filtro por
 *  aprovação evita mostrar o anterior nos dias entre a nota sair e o módulo novo
 *  aparecer. */
function currentModule(record: StudentRecord | null): number | null {
  const modules = record?.programs?.flatMap((p) => p.modules ?? []) ?? [];
  if (modules.length === 0) return null;
  const pending = modules.filter((m) => !isApproved(m.status));
  const chosen = pending.at(-1) ?? modules.at(-1)!;
  return moduleNumber(chosen);
}

/** Semana atual = quantas semanas se passaram desde a segunda da Semana 01.
 *
 *  Uma data conhecida basta para ancorar a régua, porque as semanas do Adalove
 *  são consecutivas e numeradas: da semana ancorada volta-se `num - 1` semanas
 *  para achar a origem. Assim uma semana sem encontro (recesso, semana só de
 *  autoestudo) não deixa buraco na conta.
 *
 *  `now` entra como data pura em UTC, igual ao resto de lib/date.ts: as datas do
 *  /userdata são meia-noite UTC, e comparar com o horário local faria a semana
 *  virar algumas horas adiantada. */
function currentWeek(view: SectionView, now: Date): { week: number; total: number } | null {
  const total = view.weeks.length;
  if (total === 0) return null;

  let origin: number | null = null;
  for (const w of view.weeks) {
    const first = w.activities
      .map((a) => a.date)
      .filter((d): d is string => !!d)
      .sort()[0];
    const monday = first ? startOfWeek(first) : null;
    if (monday) {
      origin = Date.parse(monday) - (w.num - 1) * WEEK;
      break;
    }
  }
  if (origin === null) return null;

  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const elapsed = Math.floor((today - origin) / WEEK) + 1;
  return { week: Math.min(Math.max(elapsed, 1), total), total };
}

/** "Mód. 11" com a régua de semanas do módulo, ao lado do título. Turma e ano
 *  ficam escondidos atrás do chevron: são dados que não mudam nunca dentro de um
 *  módulo, então ocupavam a linha permanentemente para serem lidos uma vez. */
export function ModuleProgress({ view }: { view: SectionView }) {
  const { data } = useApi<StudentRecord>("/student-curriculums/student-record");
  const [open, setOpen] = useState(false);

  const modulo = currentModule(data);
  const progress = currentWeek(view, new Date());
  const detail = [
    view.section.caption,
    view.section.academicYear ? `${view.section.academicYear}º ano` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  if (modulo === null && !progress) return null;

  return (
    <span className="flex items-center gap-2">
      {modulo !== null && <span className="font-mono text-xs text-fg-muted">Mód. {modulo}</span>}

      {progress && (
        <Tooltip label={`Semana ${progress.week} de ${progress.total}`}>
          <span className="flex items-center gap-1.5">
            <span className="block h-1 w-20 overflow-hidden rounded-full bg-line">
              <span
                className="block h-full rounded-full bg-accent transition-[width] duration-500"
                style={{ width: `${(progress.week / progress.total) * 100}%` }}
              />
            </span>
            <span className="font-mono text-[0.6rem] text-fg-muted tabular">
              {progress.week}/{progress.total}
            </span>
          </span>
        </Tooltip>
      )}

      {/* Chevron depois da régua, apontando para onde o texto vai nascer. */}
      {detail && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Esconder turma e ano" : "Mostrar turma e ano"}
          className="flex cursor-pointer items-center text-fg-muted transition-colors duration-150 hover:text-fg-soft"
        >
          <ChevronRight
            size={12}
            aria-hidden
            className={cn("transition-transform duration-200", open && "rotate-180")}
          />
        </button>
      )}

      {/* Cresce para a direita por max-width, e não por montar/desmontar: assim a
          abertura é animável e o texto não reflui em duas linhas no caminho.
          `max-w` generoso porque a transição precisa de um valor concreto — o
          `w-auto` real vem do conteúdo, que é curto e `nowrap`. */}
      {detail && (
        <span
          aria-hidden={!open}
          className={cn(
            "overflow-hidden whitespace-nowrap font-mono text-xs text-fg-muted transition-all duration-300 ease-out",
            open ? "max-w-64 opacity-100" : "max-w-0 opacity-0",
          )}
        >
          {detail}
        </span>
      )}
    </span>
  );
}
