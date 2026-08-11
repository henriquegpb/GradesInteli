import { fmtAttendanceUnits } from "@/lib/format";
import type { PresencaStatus } from "@/types/grades";
import type { SectionView } from "~/data/viewmodel";
import { cn } from "~/lib/cn";
import { Card, CardTitle } from "~/ui/Card";
import { Table, TableContainer, Td, Th } from "~/ui/Table";

const STATUS_STYLE: Record<PresencaStatus, { label: string; color: string }> = {
  presente: { label: "Presente", color: "#2FAA5C" },
  justificado: { label: "Justificado", color: "#0777DB" },
  falta: { label: "Falta", color: "#F05086" },
  futuro: { label: "—", color: "#B3B3C3" },
};

function Dot({ status }: { status: PresencaStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span
      title={s.label}
      aria-label={s.label}
      className="inline-block size-2.5 rounded-full"
      style={{
        background: status === "futuro" ? "transparent" : s.color,
        border: status === "futuro" ? `1px solid ${s.color}` : undefined,
      }}
    />
  );
}

export function Faltas({
  view,
  showHeader = true,
}: {
  view: SectionView;
  /** Falso quando embutida numa aba da Visão geral, que já tem título. */
  showHeader?: boolean;
}) {
  const a = view.attendance;

  if (!a) {
    return (
      <div className="space-y-4">
        {showHeader && <h1 className="text-xl font-medium text-fg">Faltas</h1>}
        <Card className="p-6">
          <p className="text-sm text-fg-muted">Sem dados de presença nesta turma.</p>
        </Card>
      </div>
    );
  }

  const danger = a.percentFaltas >= 20;
  const warn = a.percentFaltas >= 15;
  const accent = danger ? "var(--color-red)" : warn ? "var(--color-yellow)" : "var(--color-green)";

  return (
    <div className="space-y-4">
      {showHeader && <h1 className="text-xl font-medium text-fg">Faltas</h1>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="px-4 py-3" style={{ borderTop: `2px solid ${accent}` }}>
          <div className="text-[0.62rem] font-medium uppercase tracking-[0.04em] text-fg-muted">
            Percentual de faltas
          </div>
          <div className="mt-1 font-mono text-xl font-medium text-fg tabular">
            {a.percentFaltas.toFixed(2)}%
          </div>
          <div className="mt-0.5 text-[0.62rem] text-fg-muted">limite de 20%</div>
        </Card>
        <Card className="px-4 py-3">
          <div className="text-[0.62rem] font-medium uppercase tracking-[0.04em] text-fg-muted">
            Faltas restantes
          </div>
          <div className="mt-1 font-mono text-xl font-medium text-fg tabular">
            {fmtAttendanceUnits(a.faltasRestantes)}
          </div>
          <div className="mt-0.5 text-[0.62rem] text-fg-muted">
            de {fmtAttendanceUnits(a.maxFaltasAllowed)} permitidas
          </div>
        </Card>
        <Card className="px-4 py-3">
          <div className="text-[0.62rem] font-medium uppercase tracking-[0.04em] text-fg-muted">
            Faltas registradas
          </div>
          <div className="mt-1 font-mono text-xl font-medium text-fg tabular">
            {fmtAttendanceUnits(a.faltas)}
          </div>
          <div className="mt-0.5 text-[0.62rem] text-fg-muted">
            {fmtAttendanceUnits(a.justificados)} justificadas
          </div>
        </Card>
        <Card className="px-4 py-3">
          <div className="text-[0.62rem] font-medium uppercase tracking-[0.04em] text-fg-muted">
            Total de aulas
          </div>
          <div className="mt-1 font-mono text-xl font-medium text-fg tabular">
            {fmtAttendanceUnits(a.totalUnits)}
          </div>
          <div className="mt-0.5 text-[0.62rem] text-fg-muted">
            {a.pesosAutomaticos ? "pesos da API" : "peso 1 por chamada"}
          </div>
        </Card>
      </div>

      {a.faltasRestantesPorPeso?.length ? (
        <Card className="p-4">
          <CardTitle>Faltas restantes por peso de aula</CardTitle>
          <ul className="mt-2 flex flex-wrap gap-4">
            {a.faltasRestantesPorPeso.map((row) => (
              <li key={row.peso} className="text-sm text-fg-soft">
                <span className="font-mono text-fg tabular">{row.slots}</span> aula(s) de peso{" "}
                <span className="font-mono tabular">{row.peso}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center gap-4 text-xs text-fg-soft">
        {(Object.keys(STATUS_STYLE) as PresencaStatus[]).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <Dot status={s} />
            {s === "futuro" ? "A ocorrer" : STATUS_STYLE[s].label}
          </span>
        ))}
      </div>

      <TableContainer>
        <Table>
          <thead>
            <tr>
              <Th>Atividade</Th>
              <Th className="w-24">Semana</Th>
              <Th className="w-20">Dia</Th>
              <Th className="w-32">Chamadas</Th>
            </tr>
          </thead>
          <tbody>
            {view.attendanceRows.map((row, i) => {
              const hasFalta = row.presencas.includes("falta");
              return (
                <tr
                  key={`${row.atividade}-${i}`}
                  className={cn("transition-colors hover:bg-surface-hover", hasFalta && "bg-red/5")}
                >
                  <Td className="text-xs">{row.atividade}</Td>
                  <Td className="font-mono text-xs text-fg-muted tabular">{row.semana}</Td>
                  <Td className="font-mono text-xs text-fg-muted tabular">{row.dia}</Td>
                  <Td>
                    <span className="flex items-center gap-1.5">
                      {row.presencas.map((p, j) => (
                        <Dot key={j} status={p} />
                      ))}
                    </span>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </TableContainer>
    </div>
  );
}
