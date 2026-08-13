// Mapa rota nossa ↔ URL do Adalove.
//
// Os caminhos vêm do `GET /users/menus` do próprio Adalove (capturado em
// `data/adalove-capturas-*.json`), que é o menu que o front deles monta. Usar as
// MESMAS URLs é o que faz a overlay se comportar como página de verdade:
// endereço compartilhável, F5 abre a mesma tela, voltar/avançar funcionam, e
// quem sai para a UI original cai na página equivalente do Adalove.
//
// Duas telas nossas não existem lá (o kanban e o grupo moram dentro da Vida
// Acadêmica): essas ganham um sub-caminho de `/academic-life`, que continua
// dentro do território da overlay. Ao sair para a UI original, `canonicalPath`
// devolve o caminho real do Adalove para esse endereço sintético.
import type { RouteId } from "~/shell/nav";

export const ROUTE_PATHS: Record<RouteId, string> = {
  overview: "/academic-life",
  // Sintéticos: sub-telas da Vida Acadêmica, sem equivalente no Adalove.
  atividades: "/academic-life/atividades",
  grupo: "/academic-life/grupo",

  perfil: "/profile",
  noticias: "/feed",
  financeiro: "/financial",
  cardapio: "/menu",
  historico: "/student-record",
  carreiras: "/careers",
  intercambio: "/exchange-program/partners",
  simulados: "/mock-tests",
  atendimento: "/service-channels",
  "pagina:calendar": "/pages/calendar",
  "pagina:library": "/pages/library",
  "pagina:institutional-norms": "/pages/institutional-norms",
  "pagina:tools": "/pages/tools",
};

/** Outros endereços do Adalove que caem numa tela nossa. `/` é onde o Adalove
 *  larga o aluno depois do login; `notices` é a segunda aba do Intercâmbio, que
 *  reconstruímos numa tela só. */
const ALIASES: Record<string, RouteId> = {
  "/": "overview",
  "/exchange-program": "intercambio",
  "/exchange-program/notices": "intercambio",
};

/** Onde a UI original tem que aparecer para um endereço sintético nosso. */
const SYNTHETIC_FALLBACK = "/academic-life";

function normalize(pathname: string): string {
  // Uma barra no fim é o mesmo endereço; sem normalizar, `/feed/` não casaria.
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

export function pathForRoute(route: RouteId): string {
  return ROUTE_PATHS[route] ?? SYNTHETIC_FALLBACK;
}

/** Rota da tela que responde por este endereço, ou `null` se o Adalove é que
 *  responde por ele (checkin, notificações, surveys…) — aí a overlay sai. */
export function routeForPath(pathname = location.pathname): RouteId | null {
  const path = normalize(pathname);

  for (const [id, routePath] of Object.entries(ROUTE_PATHS) as [RouteId, string][]) {
    if (path === routePath) return id;
  }

  const alias = ALIASES[path];
  if (alias) return alias;

  // Qualquer outro sub-caminho da Vida Acadêmica é nosso: cai na Visão geral em
  // vez de devolver a tela do Adalove no meio da navegação.
  if (path.startsWith(`${SYNTHETIC_FALLBACK}/`)) return "overview";

  return null;
}

export function isOverlayPath(pathname = location.pathname): boolean {
  return routeForPath(pathname) !== null;
}

/** Endereço do Adalove correspondente — o próprio, quando ele é real, ou o da
 *  Vida Acadêmica quando é um sintético nosso. Usado ao voltar para a UI
 *  original: o Adalove não sabe renderizar `/academic-life/atividades`. */
export function canonicalPath(pathname = location.pathname): string {
  const path = normalize(pathname);
  if (path === ROUTE_PATHS.atividades || path === ROUTE_PATHS.grupo) return SYNTHETIC_FALLBACK;
  if (path.startsWith(`${SYNTHETIC_FALLBACK}/`)) return SYNTHETIC_FALLBACK;
  return path;
}
