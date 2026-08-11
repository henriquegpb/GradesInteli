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
  putActivityStatus,
} from "~/data/client";
import { initCapture } from "~/capture";
import type { ApiClient } from "~/data/api";
import type { RawUserdata } from "~/data/types";
import { ensureFonts } from "~/lib/fonts";
import cssText from "~/theme.css?inline";
import { SkeletonShell } from "~/ui/Skeleton";

/** Na extensão as telas novas batem direto na apiv2, com o token da página. */
const API: ApiClient = {
  get: (path) => adaloveGet(path),
  put: (path, body) => adalovePut(path, body),
};

const HOST_ID = "gradesinteli-adalove-ui";

/** A overlay substitui só a Vida Acadêmica. Nas demais rotas do Adalove
 *  (financeiro, feed, perfil…) a UI original tem que aparecer normalmente —
 *  senão os links da sidebar levariam a páginas cobertas pela nossa tela. */
function isOverlayRoute(pathname = location.pathname) {
  return pathname === "/" || pathname.startsWith("/academic-life");
}
const HIDE_STYLE_ID = "gi-hide-root";
const UI_MODE_KEY = "uiMode";

let root: Root | null = null;
let host: HTMLElement | null = null;

/** `@theme` do Tailwind compila para `:root`, que não casa dentro de um shadow
 *  root. Reescrever para `:host` é o que faz os tokens resolverem lá dentro. */
function shadowScopedCss(css: string) {
  return css.replace(/:root\b/g, ":host");
}

function hideOriginalUi() {
  if (document.getElementById(HIDE_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = HIDE_STYLE_ID;
  // Além de esconder a UI deles, soltamos html/body: o Adalove trava altura e
  // overflow para o próprio layout, e com isso sobrava um segundo contexto de
  // rolagem — dava para "rolar além" da nossa página. Um scroll só, o da página.
  style.textContent = [
    "#root{display:none!important}",
    "html,body{overflow:visible!important;height:auto!important;max-height:none!important;margin:0!important;background:#0e0e10!important;overscroll-behavior:none!important}",
  ].join("");
  (document.head ?? document.documentElement).appendChild(style);
}

function showOriginalUi() {
  document.getElementById(HIDE_STYLE_ID)?.remove();
}

/** Fallback: a extensão já intercepta /userdata e guarda em `lastCapture`. Se a
 *  chamada direta falhar (token rotacionado, turma não resolvida), a captura
 *  que o próprio Adalove fez ainda serve. */
async function lastCapture(): Promise<RawUserdata | null> {
  try {
    const res = (await chrome.storage.local.get("lastCapture")) as {
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
    bottom: "64px",
    left: "20px",
    zIndex: "2147483000",
    padding: "12px 24px",
    background: "#16161a",
    color: "#e0e0e4",
    border: "1px solid #6e7bf2",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "600",
    fontFamily: "system-ui, -apple-system, sans-serif",
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(0,0,0,.35)",
    opacity: "0.75",
    transition: "opacity .15s",
  } satisfies Partial<CSSStyleDeclaration>);
  btn.addEventListener("mouseenter", () => (btn.style.opacity = "1"));
  btn.addEventListener("mouseleave", () => (btn.style.opacity = "0.75"));
  btn.addEventListener("click", () => void setUiMode("new"));
  document.body.appendChild(btn);
}

function setToggleVisible(visible: boolean) {
  const btn = document.getElementById(TOGGLE_ID);
  if (btn) btn.style.display = visible ? "" : "none";
}

export async function setUiMode(mode: "new" | "original") {
  await chrome.storage.local.set({ [UI_MODE_KEY]: mode });
  if (mode === "new") {
    setToggleVisible(false);
    void mountOverlay();
  } else {
    unmountOverlay();
    ensureToggleButton();
    setToggleVisible(true);
  }
}

// A preferência é o que faz o produto ser usado: sem ela, o aluno reescolhe a
// cada page load e desiste na terceira vez.
async function syncToRoute() {
  const res = await chrome.storage.local.get(UI_MODE_KEY);
  const wantsOverlay = res?.[UI_MODE_KEY] === "new";

  if (wantsOverlay && isOverlayRoute()) {
    setToggleVisible(false);
    void mountOverlay();
    return;
  }

  // Fora do território da overlay (ou com a UI original escolhida), devolvemos
  // a página deles intacta. O esconde-root do adalove-boot.js sai aqui.
  unmountOverlay();
  if (!wantsOverlay && isOverlayRoute()) ensureToggleButton();
  setToggleVisible(!wantsOverlay && isOverlayRoute());
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
  await initCapture();
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
