import { useEffect } from "react";

// Modal aberto trava a rolagem da PÁGINA. A overlay não tem contexto de rolagem
// próprio de propósito (ver `createHost` em mount.tsx: o host entra no fluxo
// normal e quem rola é o documento), então sem travar aqui a roda do mouse sobre
// o modal rolava a grade atrás dele.
//
// Contador em vez de booleano: o `ConfirmDialog` abre COM o modal do cartão
// aberto atrás, e o primeiro a fechar não pode destravar a página do outro.

let locks = 0;
let unapply: (() => void) | null = null;

function apply(): () => void {
  const html = document.documentElement;

  const overflow = html.style.getPropertyValue("overflow");
  const overflowPriority = html.style.getPropertyPriority("overflow");
  const padding = html.style.getPropertyValue("padding-right");
  const paddingPriority = html.style.getPropertyPriority("padding-right");

  // A barra de rolagem que vai sumir: sem compensar, a página inteira pula para
  // a direita ao abrir o modal. Em barra sobreposta (macOS) a conta dá 0 e nada
  // acontece — por isso é medida, não constante.
  const gutter = window.innerWidth - html.clientWidth;

  // `hideOriginalUi` (mount.tsx) solta html/body com `overflow:visible!important`
  // para matar o segundo contexto de rolagem do Adalove. Só um inline com
  // `important` vence aquela regra.
  html.style.setProperty("overflow", "hidden", "important");
  if (gutter > 0) html.style.setProperty("padding-right", `${gutter}px`, "important");

  return () => {
    if (overflow) html.style.setProperty("overflow", overflow, overflowPriority);
    else html.style.removeProperty("overflow");
    if (padding) html.style.setProperty("padding-right", padding, paddingPriority);
    else html.style.removeProperty("padding-right");
  };
}

/** Trava a rolagem da página enquanto `active` for verdadeiro. Empilhável. */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    if (locks++ === 0) unapply = apply();

    return () => {
      if (--locks > 0) return;
      unapply?.();
      unapply = null;
    };
  }, [active]);
}
