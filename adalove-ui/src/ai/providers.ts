import type { LogoName } from "~/lib/logos";

export interface AiProvider {
  id: "chatgpt" | "claude" | "gemini";
  label: string;
  logo: LogoName;
  /** O Gemini não expõe parâmetro de pré-preenchimento; para ele o caminho é
   *  sempre copiar + abrir. Declarado em vez de escondido. */
  supportsPrefill: boolean;
  buildUrl: (prompt: string) => string;
}

export const AI_PROVIDERS: AiProvider[] = [
  {
    id: "chatgpt",
    label: "ChatGPT",
    logo: "openai",
    supportsPrefill: true,
    buildUrl: (p) => `https://chatgpt.com/?q=${encodeURIComponent(p)}`,
  },
  {
    id: "claude",
    label: "Claude",
    logo: "claude",
    supportsPrefill: true,
    buildUrl: (p) => `https://claude.ai/new?q=${encodeURIComponent(p)}`,
  },
  {
    id: "gemini",
    label: "Gemini",
    logo: "gemini",
    supportsPrefill: false,
    buildUrl: () => "https://gemini.google.com/app",
  },
];

/** Acima disso não tentamos a URL: o destino truncaria em silêncio, o que é
 *  pior do que copiar. */
export const MAX_URL_PROMPT_CHARS = 6000;

