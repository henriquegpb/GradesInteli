// As páginas de conteúdo do Adalove (`/pages/slug/*`) vêm em Markdown com
// componentes próprios embutidos:
//
//   <Grid columns="4"><GridItem><Card link="..." center shadow>
//     ![AWS](/assets/tools/aws.svg)
//     ##### AWS
//   </Card></GridItem></Grid>
//
// Os oito componentes que aparecem nas quatro páginas capturadas: Grid,
// GridItem, LineBreak, Card, CardContent, Icon, Button, Accordion.
//
// A estratégia é converter tudo para HTML e reaproveitar os estilos de
// `.adalove-prose` + o sanitizador que o modal de atividade já usa. Escrever um
// parser de Markdown completo seria arriscado; aqui cobrimos exatamente o que as
// páginas usam — títulos, listas, links, imagens, ênfase e regra horizontal.

function attr(raw: string, name: string): string | null {
  const m = new RegExp(`${name}="([^"]*)"`).exec(raw);
  return m ? (m[1] ?? null) : null;
}

function hasFlag(raw: string, name: string): boolean {
  return new RegExp(`(^|\\s)${name}(\\s|=|/|$)`).test(raw);
}

/** Componentes → HTML com classes que o CSS de `.adalove-page` estiliza. */
function components(src: string): string {
  const cardStack: ("a" | "div")[] = [];
  return (
    src
      .replace(/<Grid(\s[^>]*|)>/g, (_, a: string) => {
        const cols = Number(attr(a, "columns") ?? 2) || 2;
        return `<div class="ad-grid" style="--ad-cols:${Math.min(Math.max(cols, 1), 6)}">`;
      })
      .replace(/<\/Grid>/g, "</div>")
      .replace(/<GridItem[^>]*>/g, '<div class="ad-grid-item">')
      .replace(/<\/GridItem>/g, "</div>")
      .replace(/<LineBreak([^>]*)\/?>/g, (_, a: string) => {
        const n = Math.min(Number(attr(a, "quantity") ?? 1) || 1, 8);
        return `<div class="ad-space" style="--ad-n:${n}"></div>`;
      })
      // `</Card>` precisa fechar na MESMA tag que `<Card>` abriu — um Card sem
      // `link` abre <div>, e fechar com </a> fazia o navegador reequilibrar
      // aninhando os irmãos seguintes dentro do card. Como os Cards podem se
      // aninhar, guardamos as aberturas numa pilha.
      .replace(/<Card(\s[^>]*|)>|<\/Card>/g, (tag: string, a: string | undefined) => {
        if (tag.startsWith("</")) return cardStack.pop() === "a" ? "</a>" : "</div>";
        const link = attr(a ?? "", "link");
        const cls = ["ad-card", hasFlag(a ?? "", "center") && "ad-center"]
          .filter(Boolean)
          .join(" ");
        cardStack.push(link ? "a" : "div");
        return link
          ? `<a class="${cls}" href="${link}" target="_blank" rel="noopener noreferrer">`
          : `<div class="${cls}">`;
      })
      .replace(/<CardContent[^>]*>/g, "<div>")
      .replace(/<\/CardContent>/g, "</div>")
      .replace(/<Button(\s[^>]*|)\/?>/g, (_, a: string) => {
        const link = attr(a, "link");
        const label = attr(a, "label") ?? "Abrir";
        // Sem `link`, o Button é só o rótulo de um <a> que o envolve. Emitir
        // outra âncora aqui criava âncoras aninhadas: o navegador desfazia o
        // par, o link real ficava vazio e o botão apontava para "#".
        return link
          ? `<a class="ad-btn" href="${link}" target="_blank" rel="noopener noreferrer">${label}</a>`
          : `<span class="ad-btn">${label}</span>`;
      })
      .replace(/<Accordion([^>]*)>/g, (_, a: string) => {
        const title = attr(a, "title") ?? attr(a, "label") ?? "Detalhes";
        return `<details class="ad-accordion"><summary>${title}</summary>`;
      })
      .replace(/<\/Accordion>/g, "</details>")
      // Ícones dependem do set deles; não temos os glifos, então somem.
      .replace(/<Icon[^>]*\/?>/g, "")
      .replace(/<\/?(Button|LineBreak|Icon)>/g, "")
  );
}

function inline(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" loading="lazy" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|\W)_([^_]+)_(?=\W|$)/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

const BLOCK_TAG = /^\s*<\/?(div|a|details|summary|img|section|ul|ol|li|p|h[1-6])\b/i;

/** Markdown → HTML, linha a linha. Linhas que já são HTML passam intactas. */
function markdown(src: string): string {
  const out: string[] = [];
  let list: "ul" | "ol" | null = null;

  const closeList = () => {
    if (list) {
      out.push(`</${list}>`);
      list = null;
    }
  };

  for (const rawLine of src.split("\n")) {
    const line = rawLine.trim();

    if (!line) {
      closeList();
      continue;
    }
    if (BLOCK_TAG.test(line)) {
      closeList();
      out.push(line);
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      closeList();
      const level = heading[1]!.length;
      out.push(`<h${level}>${inline(heading[2]!)}</h${level}>`);
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      closeList();
      out.push("<hr />");
      continue;
    }

    const bullet = /^[-*+]\s+(.*)$/.exec(line);
    if (bullet) {
      if (list !== "ul") {
        closeList();
        out.push("<ul>");
        list = "ul";
      }
      out.push(`<li>${inline(bullet[1]!)}</li>`);
      continue;
    }

    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (numbered) {
      if (list !== "ol") {
        closeList();
        out.push("<ol>");
        list = "ol";
      }
      out.push(`<li>${inline(numbered[1]!)}</li>`);
      continue;
    }

    closeList();
    out.push(`<p>${inline(line)}</p>`);
  }

  closeList();
  return out.join("\n");
}

/** As páginas referenciam imagens por caminho absoluto do site deles
 *  (`/assets/tools/aws.svg`). Na extensão isso resolveria sozinho — estamos na
 *  origem do Adalove —, mas no harness de dev quebraria. Absolutizar faz os dois
 *  funcionarem, e os assets são públicos. */
const ADALOVE_ORIGIN = "https://adalove.inteli.edu.br";

function absolutizeAssets(html: string): string {
  return html.replace(/(<img[^>]*\ssrc=")(\/[^"]*)"/g, `$1${ADALOVE_ORIGIN}$2"`);
}

/** O conteúdo vem com `{{url}}` no lugar da origem — o front deles substitui na
 *  hora de renderizar. Sem isto, os 36 links das Normas institucionais viram
 *  `href="{{url}}/files/view?..."`, que o navegador trata como caminho relativo
 *  e não abre nada. */
function resolveUrlPlaceholder(html: string): string {
  return html.replace(/\{\{\s*url\s*\}\}/g, ADALOVE_ORIGIN);
}

/** Títulos inteiramente em caixa alta (GERAL, GRADUAÇÃO, PÓS GRADUAÇÃO) são
 *  divisores de seção, não títulos de peso. Marcá-los aqui deixa o CSS
 *  tratá-los como rótulo sem depender do nível (h1 numa página, h3 na outra). */
function markSectionHeadings(html: string): string {
  // Só h1–h3: os títulos de card são h5 ("##### AWS"), e um nome de ferramenta
  // em caixa alta não é divisor de seção.
  return html.replace(/<h([1-3])>([^<]+)<\/h\1>/g, (tag, level: string, text: string) => {
    const letters = text.replace(/[^\p{L}]/gu, "");
    const caixaAlta = letters.length >= 3 && letters === letters.toLocaleUpperCase("pt-BR");
    return caixaAlta ? `<h${level} class="ad-section">${text}</h${level}>` : tag;
  });
}

/** Links para PDF ganham uma classe para o CSS transformá-los em cartões. */
function markPdfLinks(html: string): string {
  // Só dentro de <li>: nas outras páginas os PDFs moram em Cards, que já têm
  // aparência própria e viravam cartão dentro de cartão.
  return html.replace(
    /<li>(\s*)<a\s([^>]*href="[^"]*\.pdf[^"]*"[^>]*)>/g,
    '<li>$1<a class="ad-doc" $2>',
  );
}

export function renderAdalovePage(content: string): string {
  return markSectionHeadings(
    markPdfLinks(resolveUrlPlaceholder(absolutizeAssets(markdown(components(content))))),
  );
}
