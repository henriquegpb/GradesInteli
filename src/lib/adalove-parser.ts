import type { TipoAtividade, AtividadeImportada, ParsedAdalovePayload } from "@/types/grades";
import { cleanHtml } from "./normalize";

const ICON_MAP: Record<string, TipoAtividade> = {
  "chalkboard-user-solido": "Aula",
  "book-open-reader-solido": "Ponderada",
  "square-code-solido": "Artefato",
  "user-pen-solido": "Grupo",
  "scroll-torah-solido": "Prova",
  "scroll-old-solido": "Prova",
  "user-group-solido": "Prova",
};

function inferTipo(iconName: string): TipoAtividade {
  return ICON_MAP[iconName] || "";
}

function parseWithRegex(html: string): AtividadeImportada[] {
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  const atividades: AtividadeImportada[] = [];
  let match: RegExpExecArray | null;

  while ((match = rowRegex.exec(html)) !== null) {
    const row = match[1];

    const iconMatch = row.match(/data-src="[^"]*\/([a-zA-Z0-9-]+)\.svg"/);
    const iconName = iconMatch ? iconMatch[1] : "";
    const tipo = inferTipo(iconName);

    const nomeMatch = row.match(
      /<span[^>]*class="[^"]*caption-activity[^"]*"[^>]*>(.*?)<\/span>/
    );
    const nome = nomeMatch ? cleanHtml(nomeMatch[1]) : "";

    const semanaMatch = row.match(
      /data-label="Semana"[^>]*>(?:.|\n)*?<span[^>]*>(.*?)<\/span>/
    );
    const pontosMatch = row.match(
      /data-label="Pontos"[^>]*>(?:.|\n)*?<span[^>]*>(.*?)<\/span>/
    );
    const notaMatch = row.match(
      /data-label="Notas"[^>]*>(?:.|\n)*?<span[^>]*>(.*?)<\/span>/
    );

    let semana = "";
    if (semanaMatch) {
      const semanaNum = parseInt(cleanHtml(semanaMatch[1]), 10);
      semana = semanaNum ? "S" + semanaNum.toString() : "";
    }

    let pontos = 0;
    if (pontosMatch) {
      const pontosRaw = parseFloat(
        cleanHtml(pontosMatch[1]).replace(",", ".")
      );
      pontos = isNaN(pontosRaw) ? 0 : pontosRaw / 100;
    }

    const nota = notaMatch
      ? parseFloat(cleanHtml(notaMatch[1]).replace(",", ".")) || 0
      : 0;

    if (nome) {
      atividades.push({ semana, tipo, nome, pontos, nota });
    }
  }

  return atividades;
}

function parseWithDOM(html: string): AtividadeImportada[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const rows = doc.querySelectorAll("tr");
  const atividades: AtividadeImportada[] = [];

  rows.forEach((row) => {
    const svgEl = row.querySelector("svg[data-src]");
    const iconName = svgEl
      ? (svgEl.getAttribute("data-src") || "").split("/").pop()?.replace(".svg", "") || ""
      : "";
    const tipo = inferTipo(iconName);

    const nomeEl = row.querySelector(".caption-activity");
    const nome = nomeEl ? (nomeEl.textContent || "").trim() : "";

    const semanaCell = row.querySelector('[data-label="Semana"]');
    const pontosCell = row.querySelector('[data-label="Pontos"]');
    const notaCell = row.querySelector('[data-label="Notas"]');

    let semana = "";
    if (semanaCell) {
      const span = semanaCell.querySelector("span");
      const num = parseInt((span?.textContent || "").trim(), 10);
      semana = num ? "S" + num : "";
    }

    let pontos = 0;
    if (pontosCell) {
      const span = pontosCell.querySelector("span");
      const raw = parseFloat(
        (span?.textContent || "").trim().replace(",", ".")
      );
      pontos = isNaN(raw) ? 0 : raw / 100;
    }

    let nota = 0;
    if (notaCell) {
      const span = notaCell.querySelector("span");
      nota =
        parseFloat((span?.textContent || "").trim().replace(",", ".")) || 0;
    }

    if (nome) {
      atividades.push({ semana, tipo, nome, pontos, nota });
    }
  });

  return atividades;
}

function extractStudentName(html: string): string | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Adalove stores the full name in the navigation avatar img alt
  const avatar = doc.querySelector("img.MuiAvatar-img");
  if (avatar) {
    const alt = (avatar.getAttribute("alt") || "").trim();
    if (alt.length > 2) return alt;
  }

  // fallback: regex for the same pattern (works without DOMParser)
  const avatarRegex = /MuiAvatar-img[^>]*alt="([^"]+)"/;
  const avatarMatch = html.match(avatarRegex);
  if (avatarMatch && avatarMatch[1].length > 2) return avatarMatch[1];

  // fallback: navigation-avatar span with first name
  const navSpan = doc.querySelector('[aria-label="navigation-avatar"] span');
  if (navSpan) {
    const name = (navSpan.textContent || "").trim();
    if (name.length > 1) return name;
  }

  const title = doc.title?.trim();
  if (title && title.toLowerCase() !== "adalove" && title.length > 2) {
    return title;
  }

  const headings = doc.querySelectorAll("h1, h2, h3");
  for (const h of headings) {
    const text = (h.textContent || "").trim();
    if (text.length > 2 && text.length < 80) return text;
  }

  return null;
}

export function parseAdaloveHtml(html: string): ParsedAdalovePayload {
  let activities = parseWithRegex(html);

  if (activities.length === 0) {
    activities = parseWithDOM(html);
  }

  if (activities.length === 0) {
    throw new Error(
      "Nenhuma atividade encontrada no HTML. Verifique se o arquivo é um export válido do Adalove."
    );
  }

  const studentName = extractStudentName(html);

  return { studentName, activities };
}
