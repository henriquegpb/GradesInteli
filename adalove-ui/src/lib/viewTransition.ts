import { flushSync } from "react-dom";

// Transição de tema com a View Transitions API: um corte diagonal varre a tela
// e revela o tema novo por cima do antigo.
//
// Dois detalhes que fazem isto funcionar aqui e não em um app comum:
//
// 1. Os pseudo-elementos `::view-transition-*` pendem do elemento raiz do
//    DOCUMENTO. Dentro do shadow root eles não existem, então este CSS não pode
//    morar no theme.css (que é adotado pelo shadow) — vai para o document.head,
//    mesma manobra do @font-face em lib/fonts.ts.
// 2. O callback do startViewTransition precisa deixar o DOM já atualizado
//    quando retorna. O setState do React é assíncrono, então sem `flushSync` o
//    snapshot "novo" sairia idêntico ao antigo e nada animaria.

const STYLE_ID = "gi-view-transition";

/** Marca a direção da varredura no <html>, para o CSS escolher o keyframe. */
const ATTR = "data-gi-theme-to";

const DURATION = "0.7s";

// Formato polygon: uma faixa a 45° que começa fora da tela como uma fatia de
// área zero e cresce até cobrir tudo. O escuro entra pela diagonal superior
// esquerda; o claro, pela inferior direita — cada tema vem do lado do seu ícone.
const CSS = `
::view-transition-old(root) {
  animation: none;
  z-index: -1;
}
::view-transition-new(root) {
  animation: gi-reveal-light ${DURATION} cubic-bezier(0.4, 0, 0.2, 1) forwards;
}
:root[${ATTR}="dark"]::view-transition-new(root) {
  animation-name: gi-reveal-dark;
}
@keyframes gi-reveal-dark {
  from { clip-path: polygon(50% -71%, -50% 71%, -50% 71%, 50% -71%); }
  to   { clip-path: polygon(50% -71%, -50% 71%, 50% 171%, 171% 50%); }
}
@keyframes gi-reveal-light {
  from { clip-path: polygon(171% 50%, 50% 171%, 50% 171%, 171% 50%); }
  to   { clip-path: polygon(171% 50%, 50% 171%, -50% 71%, 50% -71%); }
}
`;

function ensureCss() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  (document.head ?? document.documentElement).appendChild(style);
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/** Aplica `commit` dentro de uma view transition. Sem suporte no navegador ou
 *  com movimento reduzido, aplica direto — a troca acontece de qualquer jeito. */
export function withThemeTransition(next: "dark" | "light", commit: () => void) {
  const root = document.documentElement;

  if (typeof document.startViewTransition !== "function" || prefersReducedMotion()) {
    commit();
    return;
  }

  ensureCss();
  root.setAttribute(ATTR, next);

  const transition = document.startViewTransition(() => {
    flushSync(commit);
  });

  // `finished` rejeita quando a transição é pulada (outra começa por cima, aba
  // vai para segundo plano). O atributo tem que sair nos dois casos.
  void transition.finished
    .catch(() => {})
    .finally(() => root.removeAttribute(ATTR));
}
