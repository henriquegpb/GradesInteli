// Navegação por URL de verdade, em cima do History API da própria página.
//
// Não entra react-router: a overlay tem uma tela por vez e o mapa de rotas é
// estático (`routes.ts`), então empurrar o endereço e ouvir `popstate` é tudo
// o que falta — e evita um router disputando o histórico com o do Adalove.
import type { RouteId } from "~/shell/nav";
import { pathForRoute, routeForPath } from "~/shell/routes";

let dirty = false;

/** Se a overlay já mexeu no histórico. O react-router do Adalove não escuta
 *  `pushState`, então depois disso a UI original está desencontrada da URL e
 *  quem sai precisa de um carregamento de verdade. */
export function historyDirty() {
  return dirty;
}

export function pushRoute(route: RouteId) {
  const path = pathForRoute(route);
  if (location.pathname.replace(/\/+$/, "") === path) return;

  // O estado existente é preservado: o react-router do Adalove guarda `idx`/`key`
  // ali e usa na volta do botão de voltar. Trocar por um objeto nosso deixaria
  // a UI original perdida se o aluno voltasse para ela.
  const previous = typeof history.state === "object" && history.state ? history.state : {};
  history.pushState({ ...previous, gradesinteli: route }, "", path);
  dirty = true;
}

/** Voltar/avançar do navegador. `null` quando o endereço é de uma página do
 *  Adalove que não reconstruímos — quem trata disso é o mount, desmontando. */
export function onHistoryRoute(listener: (route: RouteId) => void) {
  const handler = () => {
    const route = routeForPath();
    if (route) listener(route);
  };
  window.addEventListener("popstate", handler);
  return () => window.removeEventListener("popstate", handler);
}
