import type { KeyboardEvent } from "react";

// Card inteiro como atalho para a ação principal dele. Nasceu nos cards do topo
// da Visão geral (nota leva para Notas, falta leva para Faltas) e vale para
// qualquer card com UMA ação: mirar um botão de 8px de altura quando o cartão
// inteiro é o alvo óbvio é trabalho à toa.
//
// O hover é um cinza um pouco mais claro que a linha do card, não o accent: o
// accent competia com a barra colorida de categoria no topo de cada card.
// O foco continua no accent — ali o destaque forte é o ponto.
// `gi-shortcut` é o gancho do Super Tech: lá o contorno do card não existe, então
// o hover tem que vir da luz interna (theme.css) em vez da borda.
export const SHORTCUT_CLASS =
  "gi-shortcut cursor-pointer transition-colors duration-150 hover:border-fg-muted/50 focus-visible:border-accent focus-visible:outline-none";

/** Atalho como `div[role=button]` e não `<button>`: esses cards têm link dentro
 *  (o "Revisar" das faltas, o "Abrir pasta" do Drive), e link dentro de botão é
 *  HTML inválido. O teclado entra à mão porque `div` não responde a Enter/Espaço
 *  sozinha. */
export function shortcut(ariaLabel: string, onOpen?: () => void) {
  if (!onOpen) return {};
  return {
    onClick: onOpen,
    role: "button",
    tabIndex: 0,
    "aria-label": ariaLabel,
    onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      onOpen();
    },
  } as const;
}

/** Para controles DENTRO de um card-atalho: o clique deles não pode subir e
 *  disparar a ação do card também (copiar o link E abrir a pasta, por exemplo). */
export function stopCardClick(e: { stopPropagation: () => void }) {
  e.stopPropagation();
}
