// Namespace da extensão, resolvido uma vez.
//
// No Firefox o padrão é `browser`, que devolve PROMESSAS; o `chrome` existe lá
// como alias, mas na versão de callbacks — `await chrome.storage.local.get(k)`
// resolveria para `undefined` em vez de falhar, que é o pior tipo de quebra.
// No Chrome só existe `chrome`, e em MV3 ele já é baseado em promessas.
//
// No harness de dev não existe nenhum dos dois: por isso pode ser `undefined`,
// e quem usa precisa tratar (é o que `prefs.ts` faz, caindo no localStorage).

type ExtApi = typeof chrome;

export const ext: ExtApi | undefined =
  (globalThis as { browser?: ExtApi }).browser ??
  (typeof chrome !== "undefined" ? chrome : undefined);

/** Dentro da extensão isto é sempre verdadeiro; fora, nunca. */
export const inExtension = !!ext?.storage?.local;
