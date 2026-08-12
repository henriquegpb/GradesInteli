import { cn } from "~/lib/cn";

/** Toggle estilo iOS. Trilho 36×20, botão 16, folga de 2 de cada lado.
 *
 *  O botão anda por `left`, não por `translate`: a versão anterior usava
 *  `translate-x-[14px]` num trilho de 28×16 e o botão passava da borda, colando
 *  no rótulo. Com `left` as duas posições são o mesmo tipo de conta — 2 e
 *  `trilho − botão − 2` — então não existe deslocamento que "sobre" do trilho.
 *
 *  As medidas também saem de números redondos (múltiplos de 4) para que o botão
 *  fique óptico no centro do trilho nas duas pontas. */
export function Switch({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  className?: string;
}) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2", className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-150",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          checked ? "bg-accent" : "bg-line",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-[left] duration-150",
            checked ? "left-[18px]" : "left-0.5",
          )}
        />
      </button>
      {/* `whitespace-nowrap`: em coluna estreita o rótulo quebrava embaixo do
          trilho e a linha do filtro ficava com duas alturas. */}
      <span className="whitespace-nowrap text-xs text-fg-soft">{label}</span>
    </label>
  );
}
