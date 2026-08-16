import { ArrowRight, ChevronDown, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ADALOVE_FORGOT_URL,
  ADALOVE_LOGIN_URL,
  goToAdaloveLogin,
  LoginError,
  signIn,
  signInWithGoogle,
} from "~/data/auth";
import { cn } from "~/lib/cn";
import { InteliSymbol, Logo } from "~/lib/logos";
import { getPref } from "~/lib/prefs";
import type { Theme } from "~/shell/HeaderActions";
import { DotField } from "~/ui/DotField";

// Tela de entrada da UI nova. Antes, sair da conta devolvia a pessoa para o
// login do Adalove — e a primeira coisa que se via depois de escolher a UI nova
// era justamente a UI antiga. Aqui o ciclo inteiro (entrar, usar, sair) fica na
// mesma casa.
//
// O Google vem primeiro e sozinho no cartão porque é como praticamente todo
// aluno entra; e-mail e senha existem, mas são a exceção — ficam recolhidos num
// segundo cartão, na mesma hierarquia que a tela do Adalove usa.
//
// O login em si é o do Adalove: `data/auth.ts` fala com o Cognito da Inteli, o
// mesmo endpoint que a página deles chama. Esta tela não vê nada além do que o
// formulário deles veria.

const FIELD =
  "h-11 w-full rounded-control border border-line bg-bg px-3 text-sm text-fg outline-none transition-colors duration-150 placeholder:text-fg-muted focus:border-accent";

const CARD = "rounded-card border border-line bg-surface/80 backdrop-blur-sm";

/** Quanto esperar pelo botão do Adalove antes de desistir e mandar para a tela
 *  deles: a UI original monta junto com a nossa e, num carregamento lento, pode
 *  ainda não ter pintado o cartão de login. */
const GOOGLE_TRIES = 3;
const GOOGLE_WAIT = 350;

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[0.68rem] font-medium uppercase tracking-[0.06em] text-fg-muted">
          {label}
        </span>
        {hint}
      </span>
      {children}
    </label>
  );
}

export function Login({ onDone }: { onDone: () => void }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [google, setGoogle] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<LoginError | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // Mesmo tema do resto da UI: entrar no claro e cair numa tela escura (ou o
  // contrário) faria a overlay parecer outro produto.
  useEffect(() => {
    let alive = true;
    void getPref("theme").then((stored) => {
      if (alive && (stored === "light" || stored === "dark")) setTheme(stored);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Abrir o cartão e ainda ter que clicar no campo seria um passo a mais para
  // quem já disse que vai digitar a senha.
  useEffect(() => {
    if (open) emailRef.current?.focus();
  }, [open]);

  async function withGoogle() {
    if (google) return;
    setGoogle(true);
    setError(null);

    for (let attempt = 0; attempt < GOOGLE_TRIES; attempt++) {
      if (signInWithGoogle()) return; // o Adalove assume e redireciona
      await new Promise((r) => setTimeout(r, GOOGLE_WAIT));
    }
    // Sem o botão deles à mão, a tela de login original faz o mesmo trabalho.
    goToAdaloveLogin();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      onDone();
    } catch (e: unknown) {
      setError(
        e instanceof LoginError
          ? e
          : new LoginError(
              e instanceof Error ? e.message : "Não consegui falar com o Adalove.",
              true,
            ),
      );
      setBusy(false);
    }
  }

  return (
    <div
      data-theme={theme}
      className="adalove-ui-root relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-bg px-4 py-10 text-fg"
    >
      <DotField />

      {/* `relative` para o conteúdo subir acima da malha, que é `absolute`. */}
      <div className="relative w-full max-w-[26rem]">
        <div className="mb-6 flex items-center gap-2">
          <InteliSymbol size={26} />
          <span className="text-xl font-medium">Adalove</span>
          <span className="ml-auto font-mono text-[0.6rem] uppercase tracking-[0.08em] text-fg-muted">
            UI nova
          </span>
        </div>

        <div className={cn(CARD, "p-6")}>
          <h1 className="text-lg font-medium text-fg">Entrar</h1>
          <p className="mt-1 text-xs text-fg-muted">Use sua conta Inteli.</p>

          <button
            type="button"
            onClick={() => void withGoogle()}
            disabled={google}
            className="mt-5 flex h-11 w-full items-center justify-center gap-2.5 rounded-control border border-line bg-bg text-sm font-medium text-fg transition-colors duration-150 hover:border-accent hover:bg-surface-hover disabled:cursor-wait"
          >
            {google ? (
              <Loader2 size={15} aria-hidden className="animate-spin text-fg-muted" />
            ) : (
              <Logo name="google" size={17} />
            )}
            {google ? "Abrindo o Google…" : "Entrar com o Google"}
          </button>

          <div className="mt-4 flex items-center justify-center gap-4 text-[0.68rem] text-fg-muted">
            <a
              href={ADALOVE_FORGOT_URL}
              className="underline-offset-2 transition-colors hover:text-fg hover:underline"
            >
              Esqueci a senha
            </a>
            <span aria-hidden className="size-0.5 rounded-full bg-fg-muted/60" />
            <a
              href={ADALOVE_LOGIN_URL}
              onClick={(e) => {
                e.preventDefault();
                goToAdaloveLogin();
              }}
              className="underline-offset-2 transition-colors hover:text-fg hover:underline"
            >
              Problemas com acesso
            </a>
          </div>
        </div>

        {/* Segundo cartão, recolhido: e-mail e senha são o caminho da exceção. */}
        <div className={cn(CARD, "mt-3 overflow-hidden")}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm text-fg-soft transition-colors duration-150 hover:bg-surface-hover hover:text-fg"
          >
            Acessar com login e senha
            <ChevronDown
              size={14}
              aria-hidden
              className={cn("shrink-0 transition-transform duration-300", open && "rotate-180")}
            />
          </button>

          {/* `grid-rows` de 0fr para 1fr: anima até a altura real do conteúdo,
              que um `max-height` chutado não sabe — e um `max-h` folgado demais
              faz a abertura parecer atrasada e o fechamento, apressado. */}
          <div
            className={cn(
              "grid transition-[grid-template-rows] duration-300 ease-out",
              open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            )}
          >
            <div className="overflow-hidden">
              <form onSubmit={(e) => void submit(e)} className="space-y-4 px-4 pb-4">
                <Field label="E-mail">
                  <input
                    ref={emailRef}
                    type="email"
                    // Só obrigatório com o cartão aberto: um campo exigido dentro
                    // de uma seção fechada bloquearia o envio sem nada visível
                    // para corrigir.
                    required={open}
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@sou.inteli.edu.br"
                    className={FIELD}
                    // Fora do alcance do Tab enquanto fechado: campo invisível
                    // que recebe foco é um beco sem saída.
                    tabIndex={open ? undefined : -1}
                  />
                </Field>

                <Field
                  label="Senha"
                  hint={
                    <a
                      href={ADALOVE_FORGOT_URL}
                      tabIndex={open ? undefined : -1}
                      className="text-[0.68rem] text-fg-muted underline-offset-2 transition-colors hover:text-fg hover:underline"
                    >
                      Esqueci a senha
                    </a>
                  }
                >
                  <span className="relative block">
                    <input
                      type={reveal ? "text" : "password"}
                      required={open}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={cn(FIELD, "pr-11")}
                      tabIndex={open ? undefined : -1}
                    />
                    <button
                      type="button"
                      onClick={() => setReveal((v) => !v)}
                      aria-label={reveal ? "Esconder senha" : "Mostrar senha"}
                      tabIndex={open ? undefined : -1}
                      className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-control text-fg-muted transition-colors hover:text-fg"
                    >
                      {reveal ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />}
                    </button>
                  </span>
                </Field>

                {error && (
                  <div
                    role="alert"
                    className="rounded-control border border-red/40 bg-red/10 px-3 py-2.5 text-xs text-fg-soft"
                  >
                    {error.message}
                    {error.useAdalove && (
                      <a
                        href={ADALOVE_LOGIN_URL}
                        onClick={(e) => {
                          e.preventDefault();
                          goToAdaloveLogin();
                        }}
                        className="mt-1.5 flex items-center gap-1 text-red transition-opacity hover:opacity-80"
                      >
                        Entrar pela tela do Adalove
                        <ArrowRight size={12} aria-hidden />
                      </a>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  tabIndex={open ? undefined : -1}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-control bg-accent text-sm font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy && <Loader2 size={14} aria-hidden className="animate-spin" />}
                  {busy ? "Entrando…" : "Entrar"}
                </button>

                <p className="flex items-start gap-2 text-[0.66rem] leading-relaxed text-fg-muted">
                  <ShieldCheck size={13} aria-hidden className="mt-px shrink-0" />
                  <span>
                    E-mail e senha vão direto para o login da Inteli, o mesmo que a página do
                    Adalove usa. A extensão não guarda sua senha nem manda nada para servidor
                    nosso.
                  </span>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
