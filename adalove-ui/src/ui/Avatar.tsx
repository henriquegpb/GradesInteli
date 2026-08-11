import { useState } from "react";
import type { AdaloveUser } from "~/data/client";
import { gradientFor, initials } from "~/lib/avatar";
import { cn } from "~/lib/cn";

/** Anel em gradiente com miolo na cor do fundo. Com foto, ela ocupa o miolo;
 *  sem foto (ou se a imagem falhar), ficam as iniciais. */
export function Avatar({
  user,
  size,
  className,
}: {
  user: AdaloveUser | null;
  size: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const name = user?.name ?? null;
  const photo = !failed ? user?.avatar : null;

  // O anel tem espessura proporcional para ficar igual em 32px e em 64px.
  const ring = Math.max(2, Math.round(size * 0.07));

  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full", className)}
      style={{ width: size, height: size, background: gradientFor(name), padding: ring }}
    >
      {photo ? (
        <img
          src={photo}
          alt=""
          // Dois motivos legítimos para falhar, e nos dois as iniciais são a
          // resposta certa — não um erro:
          //
          //  1. Sem foto cadastrada: o Adalove chuta `{uuid}.jpg`, que dá 404.
          //  2. No harness de dev: o bucket S3 deles só serve com
          //     `Referer: https://adalove.inteli.edu.br/`, então localhost leva
          //     403. Na extensão o navegador manda esse Referer sozinho, porque
          //     a overlay roda naquele domínio — lá a foto aparece.
          onError={() => setFailed(true)}
          className="size-full rounded-full object-cover"
        />
      ) : (
        <span
          className="flex size-full items-center justify-center rounded-full bg-bg font-medium text-fg"
          style={{ fontSize: size * 0.34 }}
        >
          {initials(name)}
        </span>
      )}
    </span>
  );
}
