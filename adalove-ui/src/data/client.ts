import type { ActivityStatus, RawUserdata } from "~/data/types";

// O content script roda no mundo ISOLADO, mas na ORIGEM do Adalove — então lê
// o localStorage da página direto. O token nunca sai do navegador: não vai para
// chrome.storage, não vai para servidor nenhum. Mesma postura da extensão atual.

const API_BASE = "https://apiv2.inteli.edu.br";

const TOKEN_KEY = "@buzz:token";
const MFA_KEY = "@buzz:token-mfa";
const SECTION_KEY = "@buzz:currentSection";

/** Valores do Adalove vêm JSON-stringificados às vezes, crus outras. */
function readLocal(key: string): string | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "string") return parsed;
      if (parsed && typeof parsed === "object") return null;
    } catch {
      /* não era JSON: usa cru */
    }
    return raw;
  } catch {
    return null;
  }
}

function readLocalObject(key: string): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export class AdaloveAuthError extends Error {}

/** Réplica do `getAvatarSrc` do Adalove: o nome do arquivo vira URL no bucket
 *  deles, e sem arquivo eles chutam `{uuid}.jpg`. Sem o cache-buster `?t=` do
 *  original — aqui só lemos, e ele impediria o navegador de cachear. */
const S3_URL = "https://buzz-prod.s3.us-east-1.amazonaws.com/";

export function avatarUrl(filename: string | null, uuid: string | null): string | null {
  const name = filename?.trim();
  if (name) {
    if (/^https?:\/\//.test(name)) return name;
    return `${S3_URL}${name.startsWith("users/") ? name : `users/avatar/${name}`}`;
  }
  return uuid ? `${S3_URL}users/avatar/${uuid}.jpg` : null;
}

export interface AdaloveUser {
  name: string | null;
  email: string | null;
  uuid: string | null;
  avatar: string | null;
}

/** O Adalove guarda o usuário logado em `@buzz:user` (JSON) e a foto em
 *  `@buzz:avatar`. Os nomes exatos dos campos não dão para confirmar no bundle
 *  minificado, então aceitamos as grafias plausíveis e devolvemos null no que
 *  não reconhecer — melhor um campo vazio que um card errado. */
export function currentUser(): AdaloveUser | null {
  const raw = readLocalObject("@buzz:user");
  const avatar = readLocal("@buzz:avatar");
  if (!raw && !avatar) return null;

  const pick = (keys: string[]): string | null => {
    for (const key of keys) {
      const value = raw?.[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return null;
  };

  const first = pick(["first_name", "firstName"]);
  const last = pick(["last_name", "lastName"]);
  const uuid = pick(["uuid", "user_uuid", "id"]);

  return {
    name: pick(["name", "full_name", "fullName"]) ?? ([first, last].filter(Boolean).join(" ") || null),
    email: pick(["email", "mail", "login"]),
    uuid,
    // `@buzz:avatar` já guarda a URL pronta; do `@buzz:user` vem só o arquivo.
    avatar:
      avatar && /^https?:\/\//.test(avatar)
        ? avatar
        : avatarUrl(pick(["avatar_filename", "avatar", "avatar_url"]), uuid),
  };
}

export function getToken(): string | null {
  return readLocal(TOKEN_KEY);
}

/** O Adalove guarda a turma ora como uuid cru, ora como objeto. Aceita os dois. */
export function currentSectionUuid(): string | null {
  const direct = readLocal(SECTION_KEY);
  if (direct) return direct;

  const obj = readLocalObject(SECTION_KEY);
  if (!obj) return null;
  for (const key of ["sectionUuid", "uuid", "id", "value"]) {
    const v = obj[key];
    if (typeof v === "string" && v) return v;
  }
  return null;
}

async function adaloveFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  if (!token) {
    throw new AdaloveAuthError("Sessão do Adalove não encontrada. Faça login novamente.");
  }

  const mfa = readLocal(MFA_KEY);
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(mfa ? { "X-MFA-Token": `Bearer ${mfa}` } : {}),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (res.status === 401 || res.status === 403) {
    throw new AdaloveAuthError("Sessão expirada. Recarregue o Adalove.");
  }
  if (!res.ok) {
    throw new Error(`Adalove respondeu ${res.status} em ${path}`);
  }

  // As escritas do Adalove respondem sem corpo: `PUT /notifications` devolve 204
  // e `POST /sections/{uuid}/absences-limit` devolve 200 com corpo vazio. Um
  // `res.json()` direto lança SyntaxError aí — e quem chamou leria isso como
  // falha da escrita, mesmo com o servidor já tendo aceitado (era o que fazia o
  // "marcar todas como lidas" mostrar erro e desmarcar o sino de volta).
  if (res.status === 204) return null as T;
  const text = await res.text();
  return (text ? (JSON.parse(text) as T) : (null as T));
}

/** GET genérico para as telas novas. */
export function adaloveGet<T>(path: string): Promise<T> {
  return adaloveFetch<T>(path);
}

/** PUT genérico para as telas novas (marcar notificações como lidas, etc.). */
export function adalovePut(path: string, body?: unknown): Promise<unknown> {
  return adaloveFetch(path, {
    method: "PUT",
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

export function fetchUserdata(sectionUuid: string): Promise<RawUserdata> {
  return adaloveFetch<RawUserdata>(`/sections/${sectionUuid}/userdata`);
}

/** Notícias do Adalove. Formato da resposta normalizado em data/news.ts. */
export function fetchNews(limit = 4): Promise<unknown> {
  return adaloveFetch<unknown>(`/posts?limit=${limit}`);
}

/** Baixa o PDF do boleto. O Adalove faz `GET {endpoint}/{bankSlipId}`, monta um
 *  Blob e dispara um `<a download>` — replicado aqui.
 *
 *  A resposta pode vir como PDF binário ou como Buffer serializado em JSON
 *  (`{type:"Buffer",data:[...]}`); tratamos os dois, senão o arquivo salvo
 *  seria o JSON com extensão .pdf. */
export async function downloadBankSlip(bankSlipId: string | number, filename: string) {
  const token = getToken();
  if (!token) throw new AdaloveAuthError("Sessão do Adalove não encontrada.");

  const res = await fetch(`${API_BASE}/students/btgpactual/bank-slips/${bankSlipId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Adalove respondeu ${res.status} ao baixar o boleto.`);

  const type = res.headers.get("content-type") ?? "";
  let blob: Blob;
  if (type.includes("json")) {
    const payload = (await res.json()) as { data?: number[] } | number[];
    const bytes = Array.isArray(payload) ? payload : (payload.data ?? []);
    blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  } else {
    blob = new Blob([await res.arrayBuffer()], { type: "application/pdf" });
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** O único write do v1 — o mesmo que a UI original dispara ao arrastar um card. */
export function putActivityStatus(
  studentActivityUuid: string,
  status: ActivityStatus,
  sort: number,
): Promise<unknown> {
  return adaloveFetch(`/student-activities/${studentActivityUuid}/status`, {
    method: "PUT",
    body: JSON.stringify({ sort, status: String(status) }),
  });
}
