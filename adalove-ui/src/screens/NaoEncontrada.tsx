import { ArrowLeft, Compass } from "lucide-react";
import { cn } from "~/lib/cn";
import { NAV_ITEMS, type RouteId } from "~/shell/nav";
import { Button } from "~/ui/Button";
import { DotField } from "~/ui/DotField";

// O Adalove manda todo endereço que ele não conhece para `/not-found` — link
// velho, URL digitada errada, tela que saiu do ar. Sem esta rota a overlay
// desmontava ali (o endereço não era nosso) e a pessoa caía no 404 deles no meio
// da navegação, como se a UI nova tivesse quebrado.
//
// Aqui o beco sem saída continua sendo nosso: sidebar no lugar, tema certo e —
// mais importante — uma saída à mão, porque o 404 do Adalove só oferece o botão
// de voltar do navegador.

/** Atalhos do próprio menu. Um 404 sem destino é só uma parede: quem chegou aqui
 *  por link quebrado quase sempre queria uma destas. Sem o Acadêmico — ele já é
 *  o botão principal, e repetir o mesmo destino a dois cliques de distância só
 *  divide a atenção. */
const SUGGESTED: RouteId[] = ["noticias", "financeiro", "cardapio", "historico"];

/** A malha apaga no meio, onde o texto fica: os pontos passando por trás das
 *  linhas deixavam a leitura suja — e um cartão opaco para tapá-los devolveria o
 *  retângulo no meio do nada que a malha existe para evitar. */
const FADE = "radial-gradient(58% 54% at 50% 46%, transparent 0%, #000 78%)";

export function NaoEncontrada({ onRoute }: { onRoute: (route: RouteId) => void }) {
  return (
    // `min-h` e não `h`: em tela curta o bloco só ocupa o que precisa e a página
    // rola normalmente, em vez de recortar o conteúdo no meio.
    <div className="relative flex min-h-[68vh] items-center justify-center overflow-hidden">
      {/* Mesma malha do login — a outra tela da overlay sem conteúdo próprio
          para preencher a página. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ maskImage: FADE, WebkitMaskImage: FADE }}
      >
        <DotField />
      </div>

      {/* `relative` para subir acima da malha, que é `absolute`. */}
      <div className="relative w-full max-w-[30rem] text-center">
        <span className="inline-flex items-center gap-2 rounded-control border border-line bg-surface/80 px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-fg-muted backdrop-blur-sm">
          <span aria-hidden className="size-1.5 rounded-full bg-orange" />
          Erro 404
        </span>

        <p
          aria-hidden
          className="mt-5 font-mono text-[4.5rem] font-medium leading-none text-fg"
          // Brilho no lugar de cor cheia: os dígitos são grandes e um accent
          // sólido nesse tamanho vira bloco de tinta na tela.
          style={{ textShadow: "0 0 42px rgba(110,123,242,.35)" }}
        >
          404
        </p>

        <h1 className="mt-5 text-xl font-medium text-fg">Página não encontrada</h1>
        <p className="mx-auto mt-2 max-w-[24rem] text-sm leading-relaxed text-fg-soft">
          O endereço que você abriu não existe no Adalove. Provavelmente é um link antigo ou
          uma tela que mudou de lugar.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button variant="primary" onClick={() => onRoute("overview")}>
            <Compass size={14} aria-hidden />
            Ir para o Acadêmico
          </Button>
          {/* Voltar do navegador, não uma rota nossa: o destino certo é a página
              de onde o link quebrado foi clicado, e só o histórico sabe qual é. */}
          <Button variant="outline" onClick={() => history.back()}>
            <ArrowLeft size={14} aria-hidden />
            Voltar
          </Button>
        </div>

        <div className="mt-8">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.06em] text-fg-muted">
            Ou vá direto para
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {SUGGESTED.map((id) => {
              const item = NAV_ITEMS.find((i) => i.id === id);
              if (!item) return null;
              const Icon = item.icon;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onRoute(id)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-control border border-line bg-surface/80 px-2.5 text-xs text-fg-soft backdrop-blur-sm",
                    "transition-colors duration-150 hover:border-accent hover:text-fg",
                  )}
                >
                  <Icon size={13} aria-hidden className="opacity-60" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
