import { AlertCircle } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { useScrollLock } from "~/lib/scrollLock";
import { Button } from "~/ui/Button";

/** Confirmação curta para ação que não dá para desfazer. O `Modal` não serve
 *  aqui: ele é um painel de 85dvh com cabeçalho e rolagem, feito para o conteúdo
 *  do cartão — uma pergunta de duas linhas dentro dele fica perdida.
 *
 *  z-[80] fica acima do `Modal` (z-70) de propósito: mover um cartão pelo
 *  controle "Mover cartão" abre esta pergunta COM o modal aberto atrás. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useScrollLock(open);

  // Na captura, e engolindo o evento: o `Modal` também fecha no Escape, e sem
  // isso um Escape cancelava o movimento E fechava o cartão atrás do diálogo.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onCancel();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      {/* Clicar fora cancela: sair sem escolher nunca pode valer como confirmar. */}
      <button
        type="button"
        aria-label={cancelLabel}
        className="absolute inset-0 bg-black/70"
        onClick={onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        className="relative z-[81] w-full max-w-[26rem] rounded-card border border-line bg-surface p-5 text-center shadow-2xl"
      >
        <AlertCircle size={40} strokeWidth={1.75} aria-hidden className="mx-auto text-orange" />
        <h2 className="mt-3 text-base font-medium text-fg">{title}</h2>
        <div className="mt-2 text-sm leading-relaxed text-fg-soft">{message}</div>
        <div className="mt-5 flex gap-2">
          {/* O foco começa em Cancelar: um Enter reflexo não deve travar a
              resposta da atividade. */}
          <Button
            autoFocus
            className="flex-1 border-transparent bg-red text-white hover:opacity-90"
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button variant="outline" className="flex-1" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
