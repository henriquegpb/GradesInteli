// Preferências pequenas e locais. Usa o storage da extensão quando existe e cai
// para localStorage no harness de dev, sem o caller precisar saber.

const PREFIX = "gi-adalove-ui:";
import { ext } from "~/lib/ext";



export async function getPref(key: string): Promise<string | null> {
  if (ext) {
    const res = await ext.storage.local.get(PREFIX + key);
    const value = res[PREFIX + key];
    return typeof value === "string" ? value : null;
  }
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export async function setPref(key: string, value: string): Promise<void> {
  if (ext) {
    await ext.storage.local.set({ [PREFIX + key]: value });
    return;
  }
  try {
    localStorage.setItem(PREFIX + key, value);
  } catch {
    /* modo privado, cota cheia: preferência é descartável */
  }
}

/** `navigator.clipboard` exige foco e pode ser bloqueado num content script;
 *  o textarea + execCommand é o fallback que funciona em qualquer caso.
 *
 *  A corrida com o timeout não é preciosismo: com o documento sem foco a
 *  promise do clipboard fica PENDENTE — não resolve nem rejeita —, e sem isso o
 *  `await` do chamador nunca voltava e o aviso nunca aparecia. */
const CLIPBOARD_TIMEOUT = 400;

export async function copyText(text: string): Promise<boolean> {
  try {
    await Promise.race([
      navigator.clipboard.writeText(text),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), CLIPBOARD_TIMEOUT)),
    ]);
    return true;
  } catch {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.cssText = "position:fixed;top:-1000px;opacity:0";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      el.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
