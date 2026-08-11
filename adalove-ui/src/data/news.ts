import { htmlToText } from "~/lib/sanitize";

// GET /posts?limit=N alimenta o card "Notícias" do Adalove.
//
// Formato CONFIRMADO na captura de 2026-08-11:
//   { items: [{ title, slug, content (HTML), start_date, banner, user: {name},
//               categories: [{caption}], highlighted_post, uuid }],
//     meta: { totalItems, itemCount, itemsPerPage, totalPages, currentPage } }
//
// As listas de chaves abaixo continuam tolerantes de propósito: o mesmo
// normalizador atende o card resumido da Visão geral e a tela cheia, e um
// campo renomeado do lado deles degrada para vazio em vez de quebrar a tela.

export interface NewsItem {
  id: string;
  title: string;
  body: string;
  /** HTML original — o corpo da notícia vem como HTML no /posts. */
  html: string | null;
  author: string | null;
  categories: string[];
  date: Date | null;
  imageUrl: string | null;
  url: string | null;
}

type Raw = Record<string, unknown>;

const TITLE_KEYS = ["title", "post_title", "caption", "subject"];
const BODY_KEYS = ["description", "post_description", "body", "content", "text", "post_body"];
const AUTHOR_KEYS = ["user_name", "author", "authorName", "userName", "created_by", "professorName"];
const DATE_KEYS = ["created_at", "createdAt", "date", "post_date", "published_at", "start_date"];
const IMAGE_KEYS = ["image", "post_image", "imageUrl", "thumbnail", "storage_url", "filename"];
const URL_KEYS = ["url", "link", "post_url", "externalUrl"];
const ID_KEYS = ["uuid", "post_uuid", "id"];

function pick(raw: Raw, keys: string[]): string | null {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
}

/** Autor pode vir montado, partido em first/last, ou aninhado em `user`.
 *  Confirmado na captura de 2026-08-11: `/posts` devolve `user: {name, uuid}`. */
function pickAuthor(raw: Raw): string | null {
  const nested = raw.user;
  if (nested && typeof nested === "object") {
    const name = (nested as Raw).name;
    if (typeof name === "string" && name.trim()) return name.trim();
  }
  const direct = pick(raw, AUTHOR_KEYS);
  if (direct) return direct;
  const first = pick(raw, ["first_name", "firstName"]);
  const last = pick(raw, ["last_name", "lastName"]);
  return [first, last].filter(Boolean).join(" ") || null;
}

/** Categorias vêm como `[{caption, uuid}]`. */
function pickCategories(raw: Raw): string[] {
  const list = raw.categories;
  if (!Array.isArray(list)) return [];
  return list
    .map((c) => (c && typeof c === "object" ? (c as Raw).caption : c))
    .filter((c): c is string => typeof c === "string" && !!c.trim());
}

function toDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function normalizeNews(payload: unknown): NewsItem[] {
  // A API às vezes devolve o array direto, às vezes embrulhado em {data|rows|posts}.
  const list = Array.isArray(payload)
    ? payload
    : ((payload as Raw)?.data ??
      (payload as Raw)?.rows ??
      (payload as Raw)?.posts ??
      (payload as Raw)?.items);

  if (!Array.isArray(list)) return [];

  return list
    .map((entry, i): NewsItem | null => {
      if (!entry || typeof entry !== "object") return null;
      const raw = entry as Raw;

      const title = pick(raw, TITLE_KEYS);
      const bodyRaw = pick(raw, BODY_KEYS);
      const body = bodyRaw ? htmlToText(bodyRaw) : "";
      if (!title && !body) return null;

      const image = pick(raw, IMAGE_KEYS);
      return {
        id: pick(raw, ID_KEYS) ?? `post-${i}`,
        title: title ?? "",
        body,
        html: bodyRaw,
        author: pickAuthor(raw),
        categories: pickCategories(raw),
        date: toDate(pick(raw, DATE_KEYS)),
        imageUrl: image && /^https?:\/\//.test(image) ? image : null,
        url: pick(raw, URL_KEYS),
      };
    })
    .filter((n): n is NewsItem => n !== null);
}

/** "Há 2 meses", como o Adalove mostra. */
export function relativeTime(date: Date | null, now = new Date()): string | null {
  if (!date) return null;
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  const formatter = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
  }
  return "agora";
}
