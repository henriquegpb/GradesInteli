// `@font-face` declarado DENTRO de um shadow root não carrega no Chrome: o
// registro de fontes é do documento. Então injetamos no document.head, apontando
// para arquivos empacotados na extensão (web_accessible_resources) — nada de
// buscar em CDN, que a CSP da página bloquearia.

import { ext } from "~/lib/ext";

const STYLE_ID = "gi-adalove-fonts";

const FACES: { family: string; weight: number; file: string }[] = [
  { family: "Inter", weight: 400, file: "fonts/inter-400.woff2" },
  { family: "Inter", weight: 500, file: "fonts/inter-500.woff2" },
  { family: "Inter", weight: 600, file: "fonts/inter-600.woff2" },
  { family: "JetBrains Mono", weight: 400, file: "fonts/jetbrains-mono-400.woff2" },
  { family: "JetBrains Mono", weight: 500, file: "fonts/jetbrains-mono-500.woff2" },
];

export function ensureFonts() {
  if (document.getElementById(STYLE_ID)) return;
  // Capturado numa const: dentro do template o TS não estreita `ext?.`.
  const getURL = ext?.runtime?.getURL;
  if (!getURL) return;

  const css = FACES.map(
    ({ family, weight, file }) => `@font-face{
  font-family:"${family}";
  font-style:normal;
  font-weight:${weight};
  font-display:swap;
  src:url("${getURL(file)}") format("woff2");
}`,
  ).join("\n");

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = css;
  document.head.appendChild(style);
}
