import {
  ChevronsUpDown,
  ExternalLink as ExternalLinkIcon,
  LogOut,
  PanelLeftClose,
  Plus,
  Undo2,
  User,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { AdaloveUser } from "~/data/client";
import { cn } from "~/lib/cn";
import { Avatar } from "~/ui/Avatar";
import {
  ADALOVE_LINKS,
  NAV_ITEMS,
  PRIMARY_ITEMS,
  SECONDARY_ITEMS,
  type AdaloveLink,
  type NavItem,
  type RouteId,
} from "~/shell/nav";

function AdaloveLinkRow({ link, open }: { link: AdaloveLink; open: boolean }) {
  const Icon = link.icon;
  return (
    <a
      href={link.path}
      title={open ? undefined : link.label}
      className={cn(
        "flex h-9 items-center rounded-control text-sm text-fg-soft transition-colors duration-150 hover:bg-surface-hover hover:text-fg",
        open ? "gap-2 px-3" : "justify-center px-0",
      )}
    >
      <Icon size={16} aria-hidden className="opacity-50" />
      {open && (
        <>
          <span className="min-w-0 flex-1 truncate">{link.label}</span>
          <ExternalLinkIcon size={11} aria-hidden className="opacity-40" />
        </>
      )}
    </a>
  );
}

export function Sidebar({
  open,
  onOpenChange,
  route,
  onRoute,
  user,
  sectionCaption,
  onExit,
  onLogout,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route: RouteId;
  onRoute: (route: RouteId) => void;
  user: AdaloveUser | null;
  sectionCaption: string;
  onExit?: () => void;
  /** Encerra a sessão do Adalove. Ausente no harness de dev. */
  onLogout?: () => void;
}) {
  const [moreOpen, setMoreOpen] = useState(() => SECONDARY_ITEMS.some((i) => i.id === route));
  const [userMenu, setUserMenu] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);
  const userBtnRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const shakeRef = useRef<Animation | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const linkRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const animatedRef = useRef(false);

  // Telas de detalhe (kanban, grupo, perfil) não têm item próprio: mantêm
  // "Acadêmico" marcado, que é de onde se entra nelas.
  const navRoute: RouteId = NAV_ITEMS.some((i) => i.id === route) ? route : "overview";

  // Se a rota ativa mora no menu recolhido, ele abre — senão o item ativo
  // ficaria escondido e a barra indicadora não teria onde pousar.
  useEffect(() => {
    if (SECONDARY_ITEMS.some((i) => i.id === route)) setMoreOpen(true);
  }, [route]);
  const activeIndex = NAV_ITEMS.findIndex((i) => i.id === navRoute);

  // Barra indicadora deslizante, posicionada por medição (padrão nora/admin).
  useEffect(() => {
    if (!open) {
      animatedRef.current = false;
      return;
    }
    const nav = navRef.current;
    const bar = barRef.current;
    const link = linkRefs.current[activeIndex];
    if (!nav || !bar || !link) return;

    const update = () => {
      const navRect = nav.getBoundingClientRect();
      const linkRect = link.getBoundingClientRect();
      bar.style.top = `${linkRect.top - navRect.top + 4}px`;
      bar.style.height = `${linkRect.height - 8}px`;
    };

    bar.style.transitionDuration = animatedRef.current ? "300ms" : "0ms";
    update();

    const frame = requestAnimationFrame(() => {
      animatedRef.current = true;
      bar.style.transitionDuration = "300ms";
    });
    const observer = new ResizeObserver(update);
    observer.observe(nav);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [activeIndex, open, moreOpen]);

  // Com uma rota de dentro do menu ativa, recolher esconderia justamente o item
  // em que a pessoa está — e a barra indicadora ficaria sem onde pousar.
  const moreLocked = SECONDARY_ITEMS.some((i) => i.id === route);

  /** Chacoalha o botão para dizer "não dá", em vez de ignorar o clique em
   *  silêncio. Via `animate()` e não classe CSS: cada chamada cria uma animação
   *  nova, então cliques seguidos reiniciam o movimento sem truque de reflow.
   *  A anterior é cancelada para não empilhar movimento sobre movimento — e
   *  guardo a referência em vez de usar `getAnimations()`, que devolveria junto
   *  as transições de cor do próprio botão. */
  const rejectClose = () => {
    const el = moreBtnRef.current;
    if (!el || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    shakeRef.current?.cancel();
    shakeRef.current = el.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-4px)" },
        { transform: "translateX(4px)" },
        { transform: "translateX(-2px)" },
        { transform: "translateX(2px)" },
        { transform: "translateX(0)" },
      ],
      { duration: 320, easing: "ease-in-out" },
    );
  };

  // `composedPath` é o que enxerga através do shadow root — `event.target`
  // sozinho seria sempre o host da overlay.
  useEffect(() => {
    if (!userMenu) return;
    const onDown = (e: MouseEvent) => {
      if (userRef.current && !e.composedPath().includes(userRef.current)) setUserMenu(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setUserMenu(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [userMenu]);

  // Recolhida, a sidebar tem 4rem e `overflow-y-auto` — e um contêiner de
  // rolagem RECORTA o que sai dele, então um menu `absolute` ao lado da coluna
  // simplesmente não aparecia. `fixed`, medido do botão, escapa do recorte.
  //
  // Não precisa acompanhar a rolagem: a sidebar é `sticky top-0`, então o botão
  // fica parado na tela. Só o redimensionamento move as coisas de lugar.
  useLayoutEffect(() => {
    if (!userMenu || open) {
      setMenuPos(null);
      return;
    }
    const place = () => {
      const rect = userBtnRef.current?.getBoundingClientRect();
      if (rect) setMenuPos({ top: rect.top, left: rect.right + 8 });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [userMenu, open]);

  const firstName = user?.name?.trim().split(/\s+/)[0] ?? null;

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = navRoute === item.id;
    const index = NAV_ITEMS.findIndex((i) => i.id === item.id);
    return (
      <button
        key={item.id}
        ref={(el) => {
          linkRefs.current[index] = el;
        }}
        type="button"
        aria-current={active ? "page" : undefined}
        title={open ? undefined : item.label}
        onClick={() => onRoute(item.id)}
        className={cn(
          "flex h-9 w-full items-center rounded-control text-sm transition-colors duration-150",
          open ? "gap-2 px-3" : "justify-center px-0",
          active ? "bg-surface-hover text-fg" : "text-fg-soft hover:bg-surface-hover hover:text-fg",
        )}
      >
        <Icon size={16} aria-hidden className={active ? "" : "opacity-50"} />
        <span className={open ? "min-w-0 truncate" : "sr-only"}>{item.label}</span>
      </button>
    );
  };

  return (
    <aside
      className={cn(
        // `gi-sidebar` é o gancho do modo Super Tech (theme.css): lá ela escurece
        // e ganha luz interna na esquerda, no topo e embaixo.
        // `z-40`: item de flex com z-index automático pinta como bloco em linha,
        // ou seja, na ordem do documento — o <main> vinha depois e passava por
        // cima do menu da conta. Fica abaixo do modal (z-70) e do toast (z-100).
        "gi-sidebar sticky top-0 z-40 flex h-screen shrink-0 flex-col overflow-y-auto overscroll-contain border-r border-line bg-surface transition-[width] duration-150",
        open ? "w-64 p-3" : "w-16 p-3",
      )}
    >
      {/* Linha do usuário: abre o menu da conta (perfil e sair). O ChevronsUpDown
          sempre prometeu um menu — antes ele ia direto para o perfil, então a
          única saída da sessão era voltar para a UI original e sair por lá. */}
      <div
        ref={userRef}
        className={cn("relative mb-4 flex items-center gap-1", open ? "" : "justify-center")}
      >
        <button
          ref={userBtnRef}
          type="button"
          onClick={() => setUserMenu((v) => !v)}
          title={open ? undefined : (user?.name ?? "Perfil")}
          aria-expanded={userMenu}
          aria-haspopup="menu"
          aria-current={route === "perfil" ? "page" : undefined}
          className={cn(
            "flex min-w-0 items-center rounded-control transition-colors duration-150",
            open ? "flex-1 gap-2.5 p-1.5 hover:bg-surface-hover" : "p-0",
            ((route === "perfil" && open) || (userMenu && open)) && "bg-surface-hover",
          )}
        >
          <Avatar user={user} size={open ? 34 : 32} />
          {open && (
            <>
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-medium text-fg">
                  {firstName ?? "Perfil"}
                </span>
                <span className="block truncate text-xs text-fg-muted">
                  {user?.email ?? sectionCaption}
                </span>
              </span>
              <ChevronsUpDown size={14} aria-hidden className="shrink-0 text-fg-muted" />
            </>
          )}
        </button>

        {userMenu && (open || menuPos) && (
          <div
            role="menu"
            style={open ? undefined : { top: menuPos!.top, left: menuPos!.left }}
            className={cn(
              "z-50 overflow-hidden rounded-card border border-line bg-surface p-1 shadow-2xl",
              open ? "absolute left-0 right-0 top-full mt-1" : "fixed w-56",
            )}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setUserMenu(false);
                onRoute("perfil");
              }}
              className="flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-left text-sm text-fg-soft transition-colors duration-150 hover:bg-surface-hover hover:text-fg"
            >
              <User size={15} aria-hidden className="opacity-60" />
              Perfil
            </button>

            {onLogout && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setUserMenu(false);
                  onLogout();
                }}
                className="flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-left text-sm text-red transition-colors duration-150 hover:bg-red/10"
              >
                <LogOut size={15} aria-hidden />
                Sair
              </button>
            )}
          </div>
        )}

        {open && (
          <button
            type="button"
            aria-label="Recolher menu"
            title="Recolher menu"
            onClick={() => onOpenChange(false)}
            className="flex size-8 shrink-0 items-center justify-center rounded-control text-fg-muted transition-colors duration-150 hover:bg-surface-hover hover:text-fg"
          >
            <PanelLeftClose size={16} aria-hidden />
          </button>
        )}
      </div>

      {!open && (
        <button
          type="button"
          aria-label="Expandir menu"
          title="Expandir menu"
          onClick={() => onOpenChange(true)}
          className="mb-4 flex h-9 items-center justify-center rounded-control text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
        >
          <PanelLeftClose size={16} aria-hidden className="rotate-180" />
        </button>
      )}

      <nav ref={navRef} className="relative space-y-1">
        {open && (
          <span
            ref={barRef}
            aria-hidden
            className="pointer-events-none absolute left-0 w-0.5 rounded-sm bg-fg transition-[top,height] ease-[cubic-bezier(.4,0,.2,1)]"
            style={{ boxShadow: "2px 0 5px rgba(237,237,237,.8), 4px 0 11px rgba(237,237,237,.45)" }}
          />
        )}

        {PRIMARY_ITEMS.map((item) => renderItem(item))}

        {/* O resto do menu do Adalove, recolhido: são muitos itens e nenhum é
            de uso diário. */}
        <button
          ref={moreBtnRef}
          type="button"
          onClick={() => (moreLocked ? rejectClose() : setMoreOpen((v) => !v))}
          aria-expanded={moreOpen}
          aria-disabled={moreLocked || undefined}
          title={moreLocked ? "Uma página deste menu está aberta" : open ? undefined : "Mais"}
          className={cn(
            "flex h-9 w-full items-center rounded-control text-sm transition-colors duration-150",
            open ? "gap-2 px-3" : "justify-center px-0",
            moreLocked
              ? "cursor-default bg-surface-hover text-fg"
              : "text-fg-soft hover:bg-surface-hover hover:text-fg",
          )}
        >
          <Plus
            size={16}
            aria-hidden
            className={cn(
              "transition-transform duration-200",
              moreOpen && "rotate-45",
              moreLocked ? "opacity-100" : "opacity-50",
            )}
          />
          <span className={open ? "min-w-0 flex-1 truncate text-left" : "sr-only"}>
            Mais
          </span>
        </button>

        {moreOpen && (
          <div className={cn("space-y-1", open && "border-l border-line pl-2")}>
            {SECONDARY_ITEMS.map((item) => renderItem(item))}
            {ADALOVE_LINKS.map((link) => (
              <AdaloveLinkRow key={link.path} link={link} open={open} />
            ))}
          </div>
        )}
      </nav>

      {/* O botão de star vive no header (HeaderActions); duplicá-lo aqui só
          gastava o espaço do rodapé. */}
      <div className="mt-auto space-y-2 pt-4">
        {onExit && (
          <button
            type="button"
            onClick={onExit}
            title={open ? undefined : "Voltar para a UI original"}
            className={cn(
              "flex h-9 w-full items-center rounded-control border border-line text-xs text-fg-soft transition-colors duration-150 hover:border-accent hover:text-fg",
              open ? "gap-2 px-3" : "justify-center px-0",
            )}
          >
            <Undo2 size={14} aria-hidden />
            <span className={open ? "truncate" : "sr-only"}>UI original</span>
          </button>
        )}
      </div>
    </aside>
  );
}
