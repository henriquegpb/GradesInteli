import { ArrowLeft, UtensilsCrossed } from "lucide-react";
import { useApi } from "~/data/api";
import { Card, CardTitle } from "~/ui/Card";
import { Skeleton } from "~/ui/Skeleton";

interface TodaysMenu {
  protein_1: string | null;
  protein_2: string | null;
  vegan: string | null;
  alkaline: string | null;
  garnish: string | null;
  main_dish: string | null;
  salad: string | null;
  dessert: string | null;
}

const DISHES: { key: keyof TodaysMenu; label: string; wide?: boolean }[] = [
  { key: "protein_1", label: "Proteína 1" },
  { key: "protein_2", label: "Proteína 2" },
  { key: "vegan", label: "Vegano / Ovolacto" },
  { key: "garnish", label: "Guarnição" },
  { key: "alkaline", label: "Acompanhamentos", wide: true },
  { key: "salad", label: "Salada", wide: true },
  { key: "main_dish", label: "Bebida" },
  { key: "dessert", label: "Sobremesa" },
];

export function Cardapio({ onBack }: { onBack?: () => void }) {
  const { data, loading, error } = useApi<TodaysMenu>("/restaurant-menus/todays-menu");

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

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

      <div className="flex flex-wrap items-baseline gap-x-3">
        <h1 className="text-xl font-medium text-fg">Cardápio</h1>
        <span className="text-xs capitalize text-fg-muted">{today}</span>
      </div>

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      )}

      {error && (
        <Card className="p-6">
          <p className="text-sm text-red">{error.message}</p>
        </Card>
      )}

      {data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DISHES.filter((d) => data[d.key]).map((dish) => (
            <Card key={dish.key} className={dish.wide ? "p-4 sm:col-span-2 lg:col-span-1" : "p-4"}>
              <CardTitle>{dish.label}</CardTitle>
              <p className="mt-2 text-sm leading-relaxed text-fg">{data[dish.key]}</p>
            </Card>
          ))}
        </div>
      )}

      {data && !DISHES.some((d) => data[d.key]) && (
        <Card className="flex items-center gap-2 p-6">
          <UtensilsCrossed size={15} aria-hidden className="text-fg-muted" />
          <p className="text-sm text-fg-muted">Sem cardápio publicado para hoje.</p>
        </Card>
      )}
    </div>
  );
}
