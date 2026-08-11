import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_SIMULACAO } from "@/lib/storage";
import {
  DEFAULT_PARTICIPACAO_MULTIPLIERS,
  type ParticipacaoLetra,
  type ParticipacaoMultipliers,
  type SimulacaoConfig,
} from "@/types/grades";
import { ApiProvider, type ApiClient } from "~/data/api";
import type { AdaloveUser } from "~/data/client";
import { normalizeNews, type NewsItem } from "~/data/news";
import { getPref, setPref } from "~/lib/prefs";
import type { Theme } from "~/shell/HeaderActions";
import type { ActivityStatus, RawUserdata } from "~/data/types";
import { buildSectionView, type ActivityView } from "~/data/viewmodel";
import { ActivityModal } from "~/screens/ActivityModal";
import { Atividades } from "~/screens/Atividades";
import { Grupo } from "~/screens/Grupo";
import { Atendimento } from "~/screens/Atendimento";
import { Cardapio } from "~/screens/Cardapio";
import { Carreiras } from "~/screens/Carreiras";
import { Financeiro } from "~/screens/Financeiro";
import { Historico } from "~/screens/Historico";
import { Intercambio } from "~/screens/Intercambio";
import { Noticias } from "~/screens/Noticias";
import { Pagina, type PageSlug } from "~/screens/Pagina";
import { Perfil } from "~/screens/Perfil";
import { Simulados } from "~/screens/Simulados";
import { Overview } from "~/screens/Overview";
import { Footer } from "~/shell/Footer";
import { Sidebar } from "~/shell/Sidebar";
import type { RouteId } from "~/shell/nav";
import { ToastProvider, useToast } from "~/ui/Toast";

export interface AppProps {
  raw: RawUserdata;
  /** Ausente no harness de dev; presente na extensão. Voltar para a UI do Adalove. */
  onExit?: () => void;
  /** Persiste a mudança de coluna. Se ausente, o kanban fica só de leitura. */
  persistStatus?: (
    studentActivityUuid: string,
    status: ActivityStatus,
    sort: number,
  ) => Promise<unknown>;
  /** Tela inicial. O harness de dev usa `?route=` para abrir direto numa tela. */
  initialRoute?: RouteId;
  /** Notícias do Adalove. Ausente no dev: o card mostra o estado vazio. */
  fetchNews?: () => Promise<unknown>;
  /** Usuário logado, lido do localStorage do Adalove. */
  user?: AdaloveUser | null;
  /** Cliente das telas novas: rede na extensão, fixture no harness de dev. */
  api: ApiClient;
}

function Workspace({
  raw: initialRaw,
  onExit,
  persistStatus,
  initialRoute,
  fetchNews,
  user = null,
}: AppProps) {
  const [raw, setRaw] = useState(initialRaw);
  const [route, setRoute] = useState<RouteId>(initialRoute ?? "overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selected, setSelected] = useState<ActivityView | null>(null);
  const [week, setWeek] = useState("all");
  const [news, setNews] = useState<NewsItem[] | null>(null);
  const [simulacao, setSimulacao] = useState<SimulacaoConfig>(DEFAULT_SIMULACAO);
  const [participacao, setParticipacao] = useState<ParticipacaoLetra>("B");
  const [multipliers, setMultipliers] = useState<ParticipacaoMultipliers>(
    DEFAULT_PARTICIPACAO_MULTIPLIERS,
  );
  const [theme, setTheme] = useState<Theme>("dark");
  const [newsLoading, setNewsLoading] = useState(!!fetchNews);
  const toast = useToast();

  // Notícias são acessório: se a chamada falhar, o card mostra vazio e o resto
  // do dashboard segue normal — não vale um erro na tela inteira.
  useEffect(() => {
    if (!fetchNews) return;
    let alive = true;
    void fetchNews()
      .then((payload) => alive && setNews(normalizeNews(payload)))
      .catch(() => alive && setNews([]))
      .finally(() => alive && setNewsLoading(false));
    return () => {
      alive = false;
    };
  }, [fetchNews]);

  // A simulação é preferência do aluno: sobrevive a recarregar a página.
  useEffect(() => {
    void getPref("simulador").then((raw) => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw) as {
          simulacao?: SimulacaoConfig;
          participacao?: ParticipacaoLetra;
          multipliers?: ParticipacaoMultipliers;
        };
        if (saved.simulacao) setSimulacao({ ...DEFAULT_SIMULACAO, ...saved.simulacao });
        if (saved.participacao) setParticipacao(saved.participacao);
        if (saved.multipliers) {
          setMultipliers({ ...DEFAULT_PARTICIPACAO_MULTIPLIERS, ...saved.multipliers });
        }
      } catch {
        /* preferência corrompida: segue com o padrão */
      }
    });
  }, []);

  useEffect(() => {
    void setPref("simulador", JSON.stringify({ simulacao, participacao, multipliers }));
  }, [simulacao, participacao, multipliers]);

  useEffect(() => {
    void getPref("theme").then((v) => {
      if (v === "light" || v === "dark") setTheme(v);
    });
  }, []);

  // O fundo da raiz também acompanha: é ele que aparece no overscroll, e no
  // claro uma faixa preta embaixo saltaria aos olhos.
  useEffect(() => {
    void setPref("theme", theme);
    document.documentElement.style.background = theme === "light" ? "#f4f4f6" : "#0e0e10";
  }, [theme]);

  const openWeek = useCallback((value: string) => {
    setWeek(value);
    setRoute("atividades");
  }, []);

  // Mesma conta do site: a meta é dividida pelo multiplicador de participação
  // antes do cálculo, para "objetivo 7 com participação A" exigir menos.
  const effectiveMetaFinal =
    multipliers[participacao] > 0
      ? simulacao.metaFinal / multipliers[participacao]
      : simulacao.metaFinal;

  const view = useMemo(
    () => buildSectionView(raw, { ...simulacao, metaFinal: effectiveMetaFinal }),
    [raw, simulacao, effectiveMetaFinal],
  );

  /** Aplica a mudança E renumera a coluna de destino. O Adalove só envia o
   *  `sort` do card movido e re-sequencia no backend; sem renumerar aqui, dois
   *  cards ficariam com o mesmo `sort` e a ordem local sairia ambígua. */
  const setActivityStatus = useCallback((id: string, status: ActivityStatus, sort: number) => {
    setRaw((current) => {
      const moved = current.activities.find((a) => a.studentActivityUuid === id);
      if (!moved) return current;

      const sameColumn = current.activities
        .filter(
          (a) =>
            a.studentActivityUuid !== id &&
            a.status === status &&
            a.folderCaption === moved.folderCaption,
        )
        .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

      // Reinsere o card na posição pedida e numera de 1 a n.
      const ordered = [...sameColumn];
      ordered.splice(Math.max(0, Math.min(sort - 1, ordered.length)), 0, moved);
      const sorts = new Map(ordered.map((a, i) => [a.studentActivityUuid, i + 1]));

      return {
        ...current,
        activities: current.activities.map((a) => {
          const nextSort = sorts.get(a.studentActivityUuid);
          if (a.studentActivityUuid === id) return { ...a, status, sort: nextSort ?? sort };
          return nextSort == null ? a : { ...a, sort: nextSort };
        }),
      };
    });
  }, []);

  const handleMove = useCallback(
    (activity: ActivityView, status: ActivityStatus, sort: number) => {
      if (!persistStatus) return;

      const previousStatus = activity.status;
      const previousSort = activity.sort;

      // Optimistic: a coluna muda na hora. Se o PUT falhar, o card volta —
      // nunca fica um estado local que o Adalove não conhece.
      setActivityStatus(activity.id, status, sort);

      void persistStatus(activity.id, status, sort).catch((error: unknown) => {
        setActivityStatus(activity.id, previousStatus, previousSort);
        toast.error(
          error instanceof Error
            ? `Não foi possível mover: ${error.message}`
            : "Não foi possível mover a atividade.",
        );
      });
    },
    [persistStatus, setActivityStatus, toast],
  );

  return (
    <div data-theme={theme} className="adalove-ui-root flex min-h-screen w-full bg-bg text-fg">
      <Sidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        route={route}
        onRoute={setRoute}
        user={user ?? { name: view.studentName, email: null, uuid: null, avatar: null }}
        sectionCaption={view.section.caption}
        onExit={onExit}
      />

      <main className="flex min-w-0 flex-1 flex-col px-4 py-6 lg:px-6">
        {/* Teto de largura: em monitor grande o conteúdo esticava de ponta a
            ponta e as linhas ficavam longas demais para ler. */}
        {/* `flex-1` empurra o rodapé para baixo: em tela curta ele encostava
            no conteúdo, no meio da página. */}
        <div className="mx-auto w-full max-w-[1400px] flex-1">
        {route === "overview" && (
          <Overview
            view={view}
            onOpenWeek={openWeek}
            onOpenActivity={setSelected}
            onSeeStudents={() => setRoute("grupo")}
            theme={theme}
            onTheme={setTheme}
            simulacao={simulacao}
            onSimulacao={setSimulacao}
            participacao={participacao}
            onParticipacao={setParticipacao}
            multipliers={multipliers}
            onMultipliers={setMultipliers}
            news={news}
            newsLoading={newsLoading}
          />
        )}
        {route === "atividades" && (
          <Atividades
            view={view}
            onOpen={setSelected}
            // O Adalove pode travar o kanban por turma; respeitamos a regra deles.
            onMove={persistStatus && view.section.allowCardMovement ? handleMove : undefined}
            week={week}
            onWeekChange={setWeek}
            onBack={() => setRoute("overview")}
          />
        )}
        {route === "grupo" && <Grupo view={view} onBack={() => setRoute("overview")} />}
        {route === "perfil" && (
          <Perfil view={view} user={user} onBack={() => setRoute("overview")} />
        )}
        {route === "noticias" && <Noticias onBack={() => setRoute("overview")} />}
        {route === "financeiro" && <Financeiro onBack={() => setRoute("overview")} />}
        {route === "cardapio" && <Cardapio onBack={() => setRoute("overview")} />}
        {route === "atendimento" && <Atendimento onBack={() => setRoute("overview")} />}
        {route === "historico" && <Historico onBack={() => setRoute("overview")} />}
        {route === "carreiras" && <Carreiras onBack={() => setRoute("overview")} />}
        {route === "intercambio" && <Intercambio onBack={() => setRoute("overview")} />}
        {route === "simulados" && <Simulados onBack={() => setRoute("overview")} />}
        {route.startsWith("pagina:") && (
          <Pagina
            key={route}
            slug={route.slice("pagina:".length) as PageSlug}
            onBack={() => setRoute("overview")}
          />
        )}
        </div>

        <div className="mx-auto w-full max-w-[1400px]">
          <Footer />
        </div>
      </main>

      <ActivityModal
        activity={selected}
        view={view}
        onClose={() => setSelected(null)}
        onMove={persistStatus ? handleMove : undefined}
      />
    </div>
  );
}

export default function App(props: AppProps) {
  return (
    <ApiProvider value={props.api}>
      <ToastProvider>
        <Workspace {...props} />
      </ToastProvider>
    </ApiProvider>
  );
}
