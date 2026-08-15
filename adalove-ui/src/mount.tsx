// Entry do content script (mundo ISOLADO, adalove.inteli.edu.br).
//
// Monta a UI num shadow root para que o CSS do Adalove não entre e o nosso não
// vaze. A UI original NUNCA é destruída — só escondida — então voltar é sempre
// possível e nenhum bug nosso deixa o aluno sem plataforma.
import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import App from "~/App";
import {
  adaloveGet,
  adalovePut,
  AdaloveAuthError,
  currentSectionUuid,
  currentUser,
  fetchNews,
  fetchUserdata,
  putActivityAnswer,
  putActivityStatus,
} from "~/data/client";
import type { ApiClient } from "~/data/api";
import type { RawUserdata } from "~/data/types";
import { ensureFonts } from "~/lib/fonts";
import { ext } from "~/lib/ext";
import cssText from "~/theme.css?inline";
import { historyDirty } from "~/shell/history";
import { canonicalPath, isOverlayPath } from "~/shell/routes";
import { SkeletonShell } from "~/ui/Skeleton";

/** Na extensão as telas novas batem direto na apiv2, com o token da página. */
const API: ApiClient = {
  get: (path) => adaloveGet(path),
  put: (path, body) => adalovePut(path, body),
};

const HOST_ID = "gradesinteli-adalove-ui";

const HIDE_STYLE_ID = "gi-hide-root";
const UI_MODE_KEY = "uiMode";

let root: Root | null = null;
let host: HTMLElement | null = null;

/** `@theme` do Tailwind compila para `:root`, que não casa dentro de um shadow
 *  root. Reescrever para `:host` é o que faz os tokens resolverem lá dentro. */
function shadowScopedCss(css: string) {
  return css.replace(/:root\b/g, ":host");
}

const PROPS_STYLE_ID = "gi-tw-properties";

/** `@property` só registra a partir de folha do DOCUMENTO: dentro de shadow root
 *  a regra é ignorada. E o Tailwind v4 escreve os utilitários em cima desses
 *  registros — `border-*` sai como `border-style: var(--tw-border-style)`. Sem o
 *  registro a variável não existe, o valor fica inválido no cálculo e a borda
 *  vira `none`: o app inteiro perde as linhas (grade do calendário, anel dos
 *  badges, barra colorida das aulas), e com ela sombra, transform e gradiente,
 *  que dependem dos mesmos registros.
 *
 *  Então as ~40 regras `@property` vão também para o head. Elas só declaram
 *  custom properties `--tw-*` com `inherits: false`, nada que a página use. */
function registerCustomProperties(css: string) {
  if (document.getElementById(PROPS_STYLE_ID)) return;
  const rules = css.match(/@property\s+--[\w-]+\s*\{[^}]*\}/g);
  if (!rules) return;
  const style = document.createElement("style");
  style.id = PROPS_STYLE_ID;
  style.textContent = rules.join("");
  (document.head ?? document.documentElement).appendChild(style);
}

/** `rem` resolve contra o <html> do DOCUMENTO, inclusive dentro de shadow root.
 *  Se a página do Adalove encolhe a raiz, a UI inteira sai menor do que foi
 *  desenhada — a sidebar de 16rem vira 160px em vez de 256px. Fixamos a raiz
 *  enquanto a overlay está ativa e devolvemos o valor original ao sair.
 *
 *  Vai inline e com `!important` de propósito: uma regra de folha de estilo
 *  perderia para um `!important` inline da própria página, que é justamente o
 *  caso mais provável de dar errado. */
let previousRootFontSize: string | null = null;
let previousRootFontPriority = "";
let previousRootBackground: string | null = null;
let previousRootBackgroundPriority = "";
let rootFontObserver: MutationObserver | null = null;

const PINNED = "16px";

function applyPin() {
  const root = document.documentElement;
  if (root.style.getPropertyValue("font-size") === PINNED) return;
  root.style.setProperty("font-size", PINNED, "important");
}

function pinRootFontSize() {
  const root = document.documentElement;
  if (previousRootFontSize === null) {
    // Guarda valor E prioridade: devolver "62.5%" sem o !important que a página
    // tinha mudaria o resultado dela depois que a gente sai.
    previousRootFontSize = root.style.getPropertyValue("font-size");
    previousRootFontPriority = root.style.getPropertyPriority("font-size");
  }
  // O App também pinta o fundo da raiz (é o que aparece no overscroll), e sem
  // guardar o valor a página ficava preta depois de voltar para a UI original.
  if (previousRootBackground === null) {
    previousRootBackground = root.style.getPropertyValue("background");
    previousRootBackgroundPriority = root.style.getPropertyPriority("background");
  }

  applyPin();

  // O Adalove é uma SPA: fixar uma vez não basta se ele reescrever o estilo da
  // raiz depois (numa troca de rota, por exemplo). O observer reaplica — e sai
  // cedo quando o valor já é o nosso, senão ele se dispararia em loop.
  rootFontObserver?.disconnect();
  rootFontObserver = new MutationObserver(applyPin);
  rootFontObserver.observe(root, { attributes: true, attributeFilter: ["style"] });
}

function restoreRootFontSize() {
  rootFontObserver?.disconnect();
  rootFontObserver = null;
  const root = document.documentElement;

  if (previousRootFontSize !== null) {
    if (previousRootFontSize)
      root.style.setProperty("font-size", previousRootFontSize, previousRootFontPriority);
    else root.style.removeProperty("font-size");
    previousRootFontSize = null;
  }

  if (previousRootBackground !== null) {
    if (previousRootBackground)
      root.style.setProperty("background", previousRootBackground, previousRootBackgroundPriority);
    else root.style.removeProperty("background");
    previousRootBackground = null;
  }
}

function hideOriginalUi() {
  pinRootFontSize();

  // Sempre reescreve o conteúdo, mesmo com o <style> já no ar. O
  // adalove-boot.js cria esse MESMO id em document_start (para não piscar a tela
  // do Adalove antes da overlay montar) com um subconjunto das regras; se aqui a
  // gente desistisse por já existir, a regra que esconde o botão do fluxo antigo
  // nunca entraria — era assim que ele reaparecia por cima da UI nova.
  const style =
    (document.getElementById(HIDE_STYLE_ID) as HTMLStyleElement | null) ??
    document.createElement("style");
  style.id = HIDE_STYLE_ID;
  // Além de esconder a UI deles, soltamos html/body: o Adalove trava altura e
  // overflow para o próprio layout, e com isso sobrava um segundo contexto de
  // rolagem — dava para "rolar além" da nossa página. Um scroll só, o da página.
  style.textContent = [
    "#root{display:none!important}",
    "html,body{overflow:visible!important;height:auto!important;max-height:none!important;margin:0!important;background:#0e0e10!important;overscroll-behavior:none!important}",
    // O botão "Abrir no GradesInteli" é do fluxo antigo (adalove-content.js).
    // Com a UI nova ativa ele não faz sentido — a importação de notas é para
    // quem está na UI original —, então some por CSS e volta sozinho ao sair,
    // porque o <style> é removido inteiro.
    // Casa pelo z-index inline dele; o nosso próprio botão usa outro.
    'button[style*="2147483647"]{display:none!important}',
  ].join("");
  if (!style.isConnected) (document.head ?? document.documentElement).appendChild(style);
}

function showOriginalUi() {
  document.getElementById(HIDE_STYLE_ID)?.remove();
  restoreRootFontSize();
}

/** Fallback: a extensão já intercepta /userdata e guarda em `lastCapture`. Se a
 *  chamada direta falhar (token rotacionado, turma não resolvida), a captura
 *  que o próprio Adalove fez ainda serve. */
async function lastCapture(): Promise<RawUserdata | null> {
  try {
    const res = (await ext!.storage.local.get("lastCapture")) as {
      lastCapture?: { json?: unknown };
    };
    const json = res.lastCapture?.json;
    return typeof json === "string" ? (JSON.parse(json) as RawUserdata) : null;
  } catch {
    return null;
  }
}

async function loadUserdata(): Promise<RawUserdata> {
  const sectionUuid = currentSectionUuid();
  if (sectionUuid) {
    try {
      return await fetchUserdata(sectionUuid);
    } catch (error) {
      const cached = await lastCapture();
      if (cached) return cached;
      throw error;
    }
  }

  const cached = await lastCapture();
  if (cached) return cached;
  throw new AdaloveAuthError(
    "Não consegui identificar sua turma. Abra a Vida Acadêmica no Adalove uma vez e tente de novo.",
  );
}

function Splash({ message, error }: { message: string; error?: boolean }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-bg p-8">
      <div className="max-w-md text-center">
        <p className={error ? "text-sm text-red" : "text-sm text-fg-soft"}>{message}</p>
        {error && (
          <button
            type="button"
            onClick={() => void setUiMode("original")}
            className="mt-4 h-9 rounded-control border border-line px-3 text-xs text-fg-soft transition-colors hover:border-accent hover:text-fg"
          >
            Voltar para a UI original
          </button>
        )}
      </div>
    </div>
  );
}

function renderShell(node: React.ReactNode) {
  root?.render(<StrictMode>{node}</StrictMode>);
}

export async function mountOverlay() {
  if (host) return;

  hideOriginalUi();
  ensureFonts();

  host = document.createElement("div");
  host.id = HOST_ID;
  // Sem `overflow` e sem `position:fixed`: o host entra no fluxo normal e cresce
  // com o conteúdo, então quem rola é a página — um contexto de rolagem só.
  host.style.cssText = "position:relative;z-index:2147483000;width:100%;";
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });
  registerCustomProperties(cssText);
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(shadowScopedCss(cssText));
  shadow.adoptedStyleSheets = [sheet];

  const container = document.createElement("div");
  container.className = "adalove-ui-root";
  shadow.appendChild(container);

  root = createRoot(container);
  // Esqueleto, e não um "Carregando…" centralizado: o layout já entra no lugar
  // certo, então quando o /userdata chega nada salta de posição.
  renderShell(<SkeletonShell />);

  try {
    const raw = await loadUserdata();
    renderShell(
      <App
        raw={raw}
        onExit={() => void setUiMode("original")}
        persistStatus={putActivityStatus}
        persistAnswer={putActivityAnswer}
        fetchNews={fetchNews}
        user={currentUser()}
        api={API}
      />,
    );
  } catch (error) {
    renderShell(
      <Splash
        error
        message={
          error instanceof Error ? error.message : "Não consegui carregar seus dados do Adalove."
        }
      />,
    );
  }
}

export function unmountOverlay() {
  root?.unmount();
  root = null;
  host?.remove();
  host = null;
  document.getElementById(PROPS_STYLE_ID)?.remove();
  showOriginalUi();
}

// Botão flutuante de entrada. Vive neste bundle de propósito: assim o
// adalove-content.js (fluxo de importação que já está em produção) não é tocado.
const TOGGLE_ID = "gi-adalove-ui-toggle";

function ensureToggleButton() {
  if (document.getElementById(TOGGLE_ID) || !document.body) return;

  const btn = document.createElement("button");
  btn.id = TOGGLE_ID;
  btn.type = "button";
  btn.textContent = "✦ UI nova";
  Object.assign(btn.style, {
    position: "fixed",
    // Canto inferior esquerdo: o botão do fluxo antigo mora embaixo à direita,
    // e um ficava por cima do outro.
    bottom: "20px",
    left: "20px",
    zIndex: "2147483000",
    padding: "12px 24px",
    // Mesmo visual do botão "Abrir no GradesInteli": roxo cheio, texto branco.
    background: "#6366f1",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "600",
    fontFamily: "system-ui, -apple-system, sans-serif",
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(0,0,0,.35)",
    transition: "filter .15s",
  } satisfies Partial<CSSStyleDeclaration>);
  // Opaco sempre: transparência deixava o fundo do Adalove atravessar o roxo.
  btn.addEventListener("mouseenter", () => (btn.style.filter = "brightness(1.1)"));
  btn.addEventListener("mouseleave", () => (btn.style.filter = ""));
  btn.addEventListener("click", () => void setUiMode("new"));
  document.body.appendChild(btn);
}

function setToggleVisible(visible: boolean) {
  const btn = document.getElementById(TOGGLE_ID);
  if (btn) btn.style.display = visible ? "" : "none";
}

export async function setUiMode(mode: "new" | "original") {
  await ext!.storage.local.set({ [UI_MODE_KEY]: mode });
  if (mode === "new") {
    setToggleVisible(false);
    void mountOverlay();
    return;
  }

  // Se navegamos por dentro da overlay, o react-router do Adalove ficou onde
  // estava (ele não escuta `pushState`): mostrar a UI original agora daria a
  // página de outro endereço, e num sub-caminho nosso ele nem tem tela. Um
  // carregamento de verdade no endereço equivalente entrega a página certa.
  //
  // Fora disso o caminho antigo continua: desmontar é instantâneo e não recarrega
  // nada — a UI deles nunca foi destruída, só escondida.
  if (historyDirty()) {
    location.assign(canonicalPath());
    return;
  }

  unmountOverlay();
  ensureToggleButton();
  setToggleVisible(true);
}

// A preferência é o que faz o produto ser usado: sem ela, o aluno reescolhe a
// cada page load e desiste na terceira vez.
async function syncToRoute() {
  const res = await ext!.storage.local.get(UI_MODE_KEY);
  const wantsOverlay = res?.[UI_MODE_KEY] === "new";

  if (wantsOverlay && isOverlayPath()) {
    setToggleVisible(false);
    void mountOverlay();
    return;
  }

  // Fora do território da overlay (ou com a UI original escolhida), devolvemos
  // a página deles intacta. O esconde-root do adalove-boot.js sai aqui.
  unmountOverlay();
  if (!wantsOverlay && isOverlayPath()) ensureToggleButton();
  setToggleVisible(!wantsOverlay && isOverlayPath());
}

// O Adalove é uma SPA: a rota muda por pushState, que o mundo isolado não
// enxerga. popstate cobre voltar/avançar; a sondagem cobre o resto, e é barata
// o bastante (uma comparação de string).
function watchRoute() {
  let last = location.pathname;
  const check = () => {
    if (location.pathname === last) return;
    last = location.pathname;
    void syncToRoute();
  };
  window.addEventListener("popstate", check);
  setInterval(check, 600);
}

async function boot() {
  // Captura roda em qualquer rota do Adalove: é justamente nas páginas que ainda
  // não reconstruímos que precisamos levantar o contrato.
  await syncToRoute();
  watchRoute();
}

declare global {
  interface Window {
    __gradesinteliAdaloveUi?: {
      mount: () => void;
      unmount: () => void;
      setMode: (mode: "new" | "original") => void;
    };
  }
}

window.__gradesinteliAdaloveUi = {
  mount: () => void mountOverlay(),
  unmount: unmountOverlay,
  setMode: (mode) => void setUiMode(mode),
};

if (document.body) void boot();
else document.addEventListener("DOMContentLoaded", () => void boot());
