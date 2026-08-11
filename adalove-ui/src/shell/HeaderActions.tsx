import { Moon, Star, Sun } from "lucide-react";
import { REPO_URL } from "@/lib/starPrompt";
import { cn } from "~/lib/cn";
import { Logo } from "~/lib/logos";
import { withThemeTransition } from "~/lib/viewTransition";
import { Tooltip } from "~/ui/Tooltip";

export type Theme = "dark" | "light";

const BUTTON =
  "relative inline-flex size-9 items-center justify-center rounded-control border border-line bg-surface text-fg-soft transition-colors duration-150 hover:border-accent hover:text-fg";

/** Só o mark do GitHub e uma estrela, sem rótulo: mora numa fileira de ícones. */
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
}: {
  theme: Theme;
  onChange: (theme: Theme) => void;
}) {
  const next = theme === "dark" ? "light" : "dark";
  return (
    <Tooltip label={next === "light" ? "Mudar para o tema claro" : "Mudar para o tema escuro"}>
      <button
        type="button"
        onClick={() => withThemeTransition(next, () => onChange(next))}
        aria-label={next === "light" ? "Mudar para tema claro" : "Mudar para tema escuro"}
        className={BUTTON}
      >
        {theme === "dark" ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
      </button>
    </Tooltip>
  );
}
