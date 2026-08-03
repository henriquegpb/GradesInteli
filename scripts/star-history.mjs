#!/usr/bin/env node
// Gera assets/img/star-history-{light,dark}.svg a partir dos stargazers do repo.
// O endpoint /stargazers exige autenticação, então rode com GITHUB_TOKEN no ambiente.

import { writeFile, mkdir } from "node:fs/promises";

const REPO = process.env.GITHUB_REPOSITORY || "henriquegpb/gradesinteli";
const TOKEN = process.env.GITHUB_TOKEN;
const OUT_DIR = "assets/img";

if (!TOKEN) {
  console.error("GITHUB_TOKEN não definido — /stargazers responde 401 sem token.");
  process.exit(1);
}

const THEMES = {
  light: { series: "#2a78d6", fill: "#2a78d6", text: "#52514e", title: "#0b0b0b", grid: "#e6e5e1" },
  dark: { series: "#3987e5", fill: "#3987e5", text: "#c3c2b7", title: "#ffffff", grid: "#383835" },
};

const W = 720;
const H = 320;
const PAD = { top: 44, right: 64, bottom: 40, left: 52 };

async function fetchStarredAt() {
  const dates = [];
  for (let page = 1; ; page++) {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/stargazers?per_page=100&page=${page}`,
      {
        headers: {
          Accept: "application/vnd.github.v3.star+json",
          Authorization: `Bearer ${TOKEN}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );
    if (!res.ok) throw new Error(`GET /stargazers page ${page}: ${res.status} ${await res.text()}`);
    const batch = await res.json();
    if (!batch.length) break;
    for (const entry of batch) dates.push(new Date(entry.starred_at).getTime());
    if (batch.length < 100) break;
  }
  return dates.sort((a, b) => a - b);
}

// Um ponto por star seria excessivo para milhares; reduz para no máximo 240 vértices
// preservando o primeiro e o último.
function downsample(points, max = 240) {
  if (points.length <= max) return points;
  const step = (points.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => points[Math.round(i * step)]);
}

function niceTicks(max, count = 4) {
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10;
  const ticks = [];
  for (let v = 0; v <= max + step / 2; v += step) ticks.push(Math.round(v));
  return ticks;
}

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const fmtDate = (ms) => {
  const d = new Date(ms);
  return `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`;
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function render(dates, theme, now) {
  const c = THEMES[theme];
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  // Série cumulativa, com o instante atual como último ponto para o platô mais recente.
  const series = dates.map((t, i) => ({ t, v: i + 1 }));
  const t0 = series[0].t;
  const t1 = Math.max(now, series[series.length - 1].t);
  const total = series.length;
  const yTicks = niceTicks(total);
  const yMax = yTicks[yTicks.length - 1];

  const x = (t) => PAD.left + (t1 === t0 ? plotW : ((t - t0) / (t1 - t0)) * plotW);
  const y = (v) => PAD.top + plotH - (v / yMax) * plotH;

  // Step-after: a contagem só sobe no instante da star, então mantém o patamar
  // até o próximo evento em vez de interpolar uma subida que não aconteceu.
  const pts = downsample(series);
  const step = [`${x(t0)},${y(0)}`];
  for (const p of pts) step.push(`${x(p.t)},${y(p.v - 1)}`, `${x(p.t)},${y(p.v)}`);
  step.push(`${x(t1)},${y(total)}`);

  const grid = yTicks
    .map(
      (v) =>
        `<line x1="${PAD.left}" y1="${y(v).toFixed(1)}" x2="${PAD.left + plotW}" y2="${y(v).toFixed(1)}" stroke="${c.grid}" stroke-width="1" />`,
    )
    .join("\n    ");

  const yLabels = yTicks
    .map(
      (v) =>
        `<text x="${PAD.left - 10}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="${c.text}">${v}</text>`,
    )
    .join("\n    ");

  const xTickCount = 5;
  const xLabels = Array.from({ length: xTickCount }, (_, i) => {
    const t = t0 + ((t1 - t0) * i) / (xTickCount - 1);
    const anchor = i === 0 ? "start" : i === xTickCount - 1 ? "end" : "middle";
    return `<text x="${x(t).toFixed(1)}" y="${PAD.top + plotH + 22}" text-anchor="${anchor}" font-size="11" fill="${c.text}">${fmtDate(t)}</text>`;
  }).join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Stars do ${esc(REPO)} ao longo do tempo: ${total} no total">
  <title>Stars do ${esc(REPO)} ao longo do tempo</title>
  <g font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif">
    <text x="${PAD.left - 10}" y="24" font-size="14" font-weight="600" fill="${c.title}">Stars ao longo do tempo</text>

    ${grid}
    ${yLabels}
    ${xLabels}

    <polygon points="${step.join(" ")} ${x(t1)},${y(0)}" fill="${c.fill}" fill-opacity="0.12" />
    <polyline points="${step.join(" ")}" fill="none" stroke="${c.series}" stroke-width="2" stroke-linejoin="round" />

    <circle cx="${x(t1).toFixed(1)}" cy="${y(total).toFixed(1)}" r="4" fill="${c.series}" />
    <text x="${(x(t1) + 10).toFixed(1)}" y="${(y(total) + 4).toFixed(1)}" font-size="12" font-weight="600" fill="${c.title}">${total}</text>
  </g>
</svg>
`;
}

const dates = await fetchStarredAt();
if (!dates.length) {
  console.error("Nenhum stargazer retornado — nada a gerar.");
  process.exit(1);
}

const now = Date.now();
await mkdir(OUT_DIR, { recursive: true });
for (const theme of Object.keys(THEMES)) {
  const path = `${OUT_DIR}/star-history-${theme}.svg`;
  await writeFile(path, render(dates, theme, now));
  console.log(`${path} — ${dates.length} stars`);
}
