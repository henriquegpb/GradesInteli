import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useApi } from "~/data/api";
import type { AdaloveUser } from "~/data/client";
import type { SectionView } from "~/data/viewmodel";
import { Avatar } from "~/ui/Avatar";
import { Card, CardTitle } from "~/ui/Card";
import { Skeleton, SkeletonHeader } from "~/ui/Skeleton";

// Perfil de leitura. O Adalove tem um formulário aqui, mas os campos são todos
// desabilitados — não dá para editar nada de fato, então não faz sentido mandar
// o aluno para lá. Mostramos os mesmos dados, direto do /users/details.

/** O que o /users/details devolve. Só o que a tela usa. */
interface UserDetails {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  cpf?: string | null;
  avatar_filename?: string | null;
  facial_recognition_active?: number | boolean | null;
  address?: {
    address?: string | null;
    address2?: string | null;
    address_number?: number | string | null;
    district?: string | null;
    city_name?: string | null;
    state?: string | null;
    postal_code?: string | null;
  } | null;
  course?: {
    ra?: string | null;
    name?: string | null;
    start_date?: string | null;
  } | null;
}

function Field({
  label,
  value,
  wide,
}: {
  label: string;
  value: string | null;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "min-w-0 sm:col-span-2" : "min-w-0"}>
      <div className="text-[0.58rem] uppercase tracking-[0.06em] text-fg-muted">{label}</div>
      <div className="mt-1 truncate text-sm text-fg" title={value ?? undefined}>
        {value ?? "—"}
      </div>
    </div>
  );
}

/** CPF nasce escondido: a tela é a que mais aparece em print, e o dado não muda
 *  de utilidade por estar a um clique de distância. */
function SecretField({ label, value }: { label: string; value: string | null }) {
  const [shown, setShown] = useState(false);
  if (!value) return <Field label={label} value={null} />;

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[0.58rem] uppercase tracking-[0.06em] text-fg-muted">
        {label}
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? `Ocultar ${label}` : `Mostrar ${label}`}
          className="text-fg-muted transition-colors duration-150 hover:text-fg"
        >
          {shown ? <EyeOff size={11} aria-hidden /> : <Eye size={11} aria-hidden />}
        </button>
      </div>
      <div className="mt-1 truncate font-mono text-sm text-fg tabular">
        {shown ? value : "•".repeat(value.length)}
      </div>
    </div>
  );
}

function formatCpf(cpf: string | null | undefined): string | null {
  const digits = (cpf ?? "").replace(/\D/g, "");
  if (digits.length !== 11) return cpf?.trim() || null;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatPhone(phone: string | null | undefined): string | null {
  const raw = (phone ?? "").trim();
  if (!raw) return null;
  // Vem como +5511987654321. Fora do padrão brasileiro, devolve como veio.
  const m = /^\+55(\d{2})(\d{4,5})(\d{4})$/.exec(raw.replace(/\s/g, ""));
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : raw;
}

function formatCep(cep: string | null | undefined): string | null {
  const digits = (cep ?? "").replace(/\D/g, "");
  if (digits.length !== 8) return cep?.trim() || null;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function formatMonthYear(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  // UTC de propósito: a data vem como meia-noite Z e o fuso local a jogaria
  // para o mês anterior.
  return `${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

export function Perfil({
  view,
  user,
  onBack,
}: {
  view: SectionView;
  user: AdaloveUser | null;
  onBack?: () => void;
}) {
  const { data, loading, error } = useApi<UserDetails>("/users/details");

  // O nome do /userdata é o do aluno na turma; o do localStorage é o da conta.
  const name = data?.name ?? user?.name ?? view.studentName;
  const email = data?.email ?? user?.email ?? null;
  const address = data?.address;

  const street = [address?.address, address?.address_number]
    .filter((p) => p !== null && p !== undefined && `${p}`.trim() !== "")
    .join(", ");

  return (
    <div className="space-y-4">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-fg-muted transition-colors hover:text-fg"
        >
          <ArrowLeft size={13} aria-hidden />
          Acadêmico
        </button>
      )}

      <h1 className="text-xl font-medium text-fg">Meu perfil</h1>

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar user={user ?? { name, email, uuid: null, avatar: null }} size={64} />

          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-medium text-fg">{name ?? "—"}</div>
            {email && <div className="truncate text-sm text-fg-muted">{email}</div>}
          </div>
        </div>
      </Card>

      {error && (
        <Card className="p-4">
          <p className="text-sm text-fg-muted">
            Não consegui carregar os dados cadastrais: {error.message}
          </p>
        </Card>
      )}

      {loading && (
        <Card className="p-5">
          <SkeletonHeader />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i}>
                <Skeleton className="h-2 w-16" />
                <Skeleton className="mt-2 h-3.5 w-28" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {data && (
        <>
          <Card className="p-5">
            <CardTitle>Contato</CardTitle>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Nome" value={name} wide />
              <Field label="E-mail" value={email} wide />
              <Field label="Telefone" value={formatPhone(data.phone)} />
              <SecretField label="CPF" value={formatCpf(data.cpf)} />
            </div>
          </Card>

          <Card className="p-5">
            <CardTitle>Endereço residencial</CardTitle>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="CEP" value={formatCep(address?.postal_code)} />
              <Field label="Endereço" value={street || null} wide />
              <Field label="Complemento" value={address?.address2?.trim() || null} />
              <Field label="Bairro" value={address?.district ?? null} />
              <Field label="Cidade" value={address?.city_name ?? null} />
              <Field label="Estado" value={address?.state ?? null} />
            </div>
          </Card>

          <Card className="p-5">
            <CardTitle>Informações acadêmicas</CardTitle>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="RA" value={data.course?.ra ?? null} />
              <Field label="Curso" value={data.course?.name ?? view.section.type} wide />
              <Field label="Ingresso" value={formatMonthYear(data.course?.start_date)} />
              <Field
                label="Reconhecimento facial"
                value={
                  data.facial_recognition_active === null ||
                  data.facial_recognition_active === undefined
                    ? null
                    : data.facial_recognition_active
                      ? "Ativo"
                      : "Inativo"
                }
              />
            </div>
          </Card>
        </>
      )}

      <Card className="p-5">
        <CardTitle>Vida acadêmica</CardTitle>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Turma" value={view.section.caption} />
          <Field
            label="Ano"
            value={view.section.academicYear ? `${view.section.academicYear}º ano` : null}
          />
          <Field label="Tipo" value={view.section.type} />
          <Field label="Grupo" value={view.group.caption} />
          <Field label="Orientação" value={view.section.advisor} />
          <Field label="Projeto" value={view.section.project} />
          <Field
            label="Faltas"
            value={view.attendance ? `${view.attendance.percentFaltas.toFixed(2)}%` : null}
          />
          <Field
            label="Acumulado"
            value={view.metrics ? view.metrics.acumuladoTotal.toFixed(2) : null}
          />
        </div>
      </Card>
    </div>
  );
}
