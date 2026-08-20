import { Moon, Star, Sun } from "lucide-react";
import { useState } from "react";
import { REPO_URL } from "@/lib/starPrompt";
import { cn } from "~/lib/cn";
import { Logo } from "~/lib/logos";
import { withThemeTransition } from "~/lib/viewTransition";
import { Switch } from "~/ui/Switch";
import { Tooltip } from "~/ui/Tooltip";

export type Theme = "dark" | "light";

const BUTTON =
  "relative inline-flex size-9 items-center justify-center rounded-control border border-line bg-surface text-fg-soft transition-colors duration-150 hover:border-accent hover:text-fg";

/** O GitLab do Inteli — é onde os artefatos das sprints são entregues, então é
 *  atalho de uso diário e fica junto do GitHub, não no rodapé. */
export const INTELI_GITLAB_URL = "https://git.inteli.edu.br/";

/** Mono como o do GitHub, para a fileira não ter um ícone colorido só; a marca
 *  aparece na borda do hover. */
export function GitlabButton() {
  return (
    <Tooltip label="GitLab do Inteli">
      <a
        href={INTELI_GITLAB_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Abrir o GitLab do Inteli"
        className={cn(BUTTON, "hover:border-orange/60")}
      >
        <Logo name="gitlab" size={16} mono />
      </a>
    </Tooltip>
  );
}

/** Só o mark do GitHub e uma estrela, sem rótulo: mora numa fileira de ícones. */
/** Todo aluno do Inteli está só neste workspace, então o link genérico do
 *  cliente web já cai direto nele — sem precisar do subdomínio ou de um
 *  team ID fixo. */
export const INTELI_SLACK_URL = "https://app.slack.com/client/";

export function SlackButton() {
  return (
    <Tooltip label="Slack do Inteli">
      <a
        href={INTELI_SLACK_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Abrir o Slack do Inteli"
        className={cn(BUTTON, "hover:border-purple/60")}
      >
        <Logo name="slack" size={16} mono />
      </a>
    </Tooltip>
  );
}

export function GithubStarButton() {
  return (
    <Tooltip label="Star on Github">
      <a
        href={REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Star on Github"
        className={cn(BUTTON, "group/star hover:border-yellow/60")}
      >
        <Logo name="github" size={16} mono />
        <Star
          size={9}
          aria-hidden
          className="absolute -right-0.5 -top-0.5 fill-yellow text-yellow transition-transform duration-200 group-hover/star:rotate-[72deg] group-hover/star:scale-110"
        />
      </a>
    </Tooltip>
  );
}

export function ThemeToggle({
  theme,
  onChange,
  superTech,
  onSuperTech,
}: {
  theme: Theme;
  onChange: (theme: Theme) => void;
  superTech?: boolean;
  onSuperTech?: (on: boolean) => void;
}) {
  const next = theme === "dark" ? "light" : "dark";

  // O menu é variação do escuro, então não existe no claro — nem escondido, para
  // não haver estado invisível ligado.
  const hasMenu = theme === "dark" && !!onSuperTech;
  const [open, setOpen] = useState(false);

  return (
    // `focus-within` junto do hover: sem ele o menu seria inalcançável por
    // teclado, já que ele só nasce no mouse.
    <span
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <Tooltip
        label={next === "light" ? "Mudar para o tema claro" : "Mudar para o tema escuro"}
        // Com o menu aberto os dois apareceriam no mesmo canto, um sobre o outro.
        disabled={hasMenu && open}
      >
        <button
          type="button"
          onClick={() => withThemeTransition(next, () => onChange(next))}
          aria-label={next === "light" ? "Mudar para tema claro" : "Mudar para tema escuro"}
          className={BUTTON}
        >
          {theme === "dark" ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
        </button>
      </Tooltip>

      {hasMenu && open && (
        // Sem vão entre o botão e o painel: um `mt` de verdade faria o mouse
        // atravessar terra de ninguém e o menu fecharia no caminho. O respiro
        // vem do padding, dentro da área que conta como hover.
        <span className="absolute right-0 top-full z-50 pt-2">
          <span className="flex items-center gap-2 whitespace-nowrap rounded-card border border-line bg-surface px-3 py-2 shadow-2xl">
            <Switch
              checked={!!superTech}
              onChange={onSuperTech}
              label="Super Tech"
            />
          </span>
        </span>
      )}
    </span>
  );
}
