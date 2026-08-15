// Entry do harness de dev: roda em localhost:5173 com HMR, contra um fixture
// gravado. É aqui que 95% do trabalho de UI acontece — sem Adalove, sem rede,
// sem recarregar extensão.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "~/App";
import { SkeletonShell } from "~/ui/Skeleton";
import { fixtureNameFor, type ApiClient } from "~/data/api";
import { avatarUrl, type AdaloveUser } from "~/data/client";
import type { RawUserdata } from "~/data/types";
import type { RouteId } from "~/shell/nav";
import "~/theme.css";

const FIXTURES = import.meta.glob<{ default: RawUserdata }>("../fixtures/*.json");
const ALL_FIXTURES = import.meta.glob<{ default: unknown }>("../fixtures/*.json");

/** Cliente de dev: em vez de rede, resolve o fixture gerado por
 *  scripts/split-captures.mjs a partir do caminho do endpoint. */
const devApi: ApiClient = {
  get: async <T,>(path: string): Promise<T> => {
    const name = fixtureNameFor(path);
    const key = Object.keys(ALL_FIXTURES).find((k) => k.endsWith(`/${name}`));
    if (!key) {
      throw new Error(
        `Sem fixture para ${path} (esperado fixtures/${name}). ` +
          "Rode o modo de captura e scripts/split-captures.mjs.",
      );
    }
    // `?slow=3000` segura a resposta para dar tempo de inspecionar (e fotografar)
    // os skeletons; sem o parâmetro, só a latência simbólica de sempre.
    const slow = Number(new URLSearchParams(location.search).get("slow"));
    await new Promise((r) => setTimeout(r, Number.isFinite(slow) && slow > 0 ? slow : 120));
    return (await ALL_FIXTURES[key]!()).default as T;
  },
  // Sem rede no harness: a escrita só resolve, para exercitar o optimistic update.
  put: async () => {
    await new Promise((r) => setTimeout(r, 200));
  },
};

/** Monta o usuário a partir do fixture de /users/details, quando existe. */
async function loadDevUser(): Promise<AdaloveUser> {
  const fallback: AdaloveUser = {
    name: "Henrique Gomes Pitol Barone",
    email: "henrique.barone@sou.inteli.edu.br",
    uuid: null,
    avatar: null,
  };
  const key = Object.keys(ALL_FIXTURES).find((k) => k.endsWith("/users-details.json"));
  if (!key) return fallback;

  try {
    const d = (await ALL_FIXTURES[key]!()).default as Record<string, string | null>;
    return {
      name: d.name ?? fallback.name,
      email: d.email ?? fallback.email,
      uuid: d.uuid ?? null,
      avatar: avatarUrl(d.avatar_filename ?? null, d.uuid ?? null),
    };
  } catch {
    return fallback;
  }
}

async function boot() {
  const el = document.getElementById("dev-root")!;
  el.classList.add("adalove-ui-root");

  const want = new URLSearchParams(location.search).get("fixture") ?? "henrique-2026-2A";
  const key = Object.keys(FIXTURES).find((k) => k.includes(want)) ?? Object.keys(FIXTURES)[0];

  if (!key) {
    el.textContent = "Nenhum fixture em adalove-ui/fixtures/.";
    return;
  }

  const mod = await FIXTURES[key]!();
  const devUser = await loadDevUser();
  const params = new URLSearchParams(location.search);
  const route = params.get("route") as RouteId | null;

  // Atalhos do harness: clicam na UI depois que ela monta, para inspecionar
  // estados internos sem clicar à mão — inclusive em screenshot headless.
  const clickAfterMount = (find: () => HTMLElement | undefined) =>
    setTimeout(() => find()?.click(), 400);

  // `?open=<n>` abre o n-ésimo card.
  if (params.has("open")) {
    const n = Number(params.get("open")) || 0;
    clickAfterMount(() => {
      const cards = document.querySelectorAll<HTMLButtonElement>("[data-activity-card]");
      return cards[Math.min(n, cards.length - 1)];
    });
  }

  // `?tab=Notas` clica num botão pelo rótulo visível ou pelo aria-label —
  // este último cobre os botões só de ícone, como o sino de notificações.
  // Aceita vários separados por vírgula, clicados em sequência:
  // `?tab=Notas,Copiar prompt`.
  const tab = params.get("tab");
  if (tab) {
    const steps = tab.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
    steps.forEach((wanted, i) => {
      setTimeout(
        () =>
          [...document.querySelectorAll<HTMLButtonElement>("button")]
            .find((b) => {
              const text = b.textContent?.trim().toLowerCase() ?? "";
              const label = b.getAttribute("aria-label")?.trim().toLowerCase() ?? "";
              // Prefixo além da igualdade: botões-linha (o do simulador, por
              // exemplo) carregam valor e status no mesmo textContent.
              // Prefixo só para rótulos longos: com "a" casaria "Acadêmico"
              // antes do botão certo.
              const prefixOk = wanted.length >= 8;
              return (
                text === wanted ||
                label === wanted ||
                (prefixOk && (text.startsWith(wanted) || label.startsWith(wanted)))
              );
            })
            ?.click(),
        400 * (i + 1),
      );
    });
  }

  // `?skeleton=1` mostra o primeiro paint da extensão (antes do /userdata),
  // que no harness normal nunca aparece — o fixture já está em memória.
  if (params.has("skeleton")) {
    createRoot(el).render(
      <StrictMode>
        <SkeletonShell />
      </StrictMode>,
    );
    return;
  }

  createRoot(el).render(
    <StrictMode>
      <App
        raw={mod.default}
        initialRoute={route ?? undefined}
        api={devApi}
        // Sem localStorage do Adalove aqui: o usuário vem do fixture de
        // /users/details, o que exercita a foto real e o fallback de erro.
        user={devUser}
        // Sem rede no harness: o drag funciona e o optimistic update é exercido,
        // só não há PUT. `?fail=1` força o caminho de erro para testar o rollback.
        persistStatus={async () => {
          await new Promise((r) => setTimeout(r, 250));
          if (new URLSearchParams(location.search).has("fail")) {
            throw new Error("falha simulada");
          }
        }}
        // Mesma ideia para o autosave da resposta: exercita "Salvando…/Salvo"
        // sem rede, e `?fail=1` exercita o "Não salvo".
        persistAnswer={async () => {
          await new Promise((r) => setTimeout(r, 400));
          if (new URLSearchParams(location.search).has("fail")) {
            throw new Error("falha simulada");
          }
        }}
      />
    </StrictMode>,
  );
}

void boot();
