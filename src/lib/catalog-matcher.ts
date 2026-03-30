import type {
  AtividadeImportada,
  AtividadeCatalogo,
  ItemNota,
  AtividadeNaoReconhecida,
} from "@/types/grades";
import { normalize } from "./normalize";
import catalogData from "@/data/catalog.json";

const catalog: AtividadeCatalogo[] = catalogData.activities as AtividadeCatalogo[];

function exactMatch(imported: string, catalogEntry: string): boolean {
  return normalize(imported) === normalize(catalogEntry);
}

function fuzzyMatch(imported: string, catalogEntry: string): boolean {
  const a = normalize(imported);
  const b = normalize(catalogEntry);
  return a.includes(b) || b.includes(a);
}

function findCatalogMatch(
  activity: AtividadeImportada,
  usedIndices: Set<number>
): number {
  // exact
  for (let i = 0; i < catalog.length; i++) {
    if (usedIndices.has(i)) continue;
    if (exactMatch(activity.nome, catalog[i].atividade)) return i;
  }
  // fuzzy
  for (let i = 0; i < catalog.length; i++) {
    if (usedIndices.has(i)) continue;
    if (fuzzyMatch(activity.nome, catalog[i].atividade)) return i;
  }
  return -1;
}

export interface MatchResult {
  items: ItemNota[];
  naoReconhecidas: AtividadeNaoReconhecida[];
}

export function matchActivities(
  imported: AtividadeImportada[],
  vinculosManuais: Record<string, number> = {}
): MatchResult {
  const items: ItemNota[] = [];
  const naoReconhecidas: AtividadeNaoReconhecida[] = [];
  const usedCatalogIndices = new Set<number>();
  const matchedImportIndices = new Set<number>();

  // first pass: apply manual bindings
  for (let i = 0; i < imported.length; i++) {
    const key = normalize(imported[i].nome);
    if (vinculosManuais[key] !== undefined) {
      const ci = vinculosManuais[key];
      const cat = catalog[ci];
      usedCatalogIndices.add(ci);
      matchedImportIndices.add(i);
      items.push({
        id: `cat-${ci}`,
        semana: cat.semana,
        tipo: cat.tipo,
        atividade: cat.atividade,
        peso: cat.peso,
        nota: imported[i].nota,
        origem: "manual",
        matchStatus: "manual",
        catalogIndex: ci,
      });
    }
  }

  // second pass: auto-match
  for (let i = 0; i < imported.length; i++) {
    if (matchedImportIndices.has(i)) continue;
    const ci = findCatalogMatch(imported[i], usedCatalogIndices);
    if (ci >= 0) {
      usedCatalogIndices.add(ci);
      matchedImportIndices.add(i);
      const cat = catalog[ci];
      items.push({
        id: `cat-${ci}`,
        semana: cat.semana,
        tipo: cat.tipo,
        atividade: cat.atividade,
        peso: cat.peso,
        nota: imported[i].nota,
        origem: "importado",
        matchStatus: "matched",
        catalogIndex: ci,
      });
    }
  }

  // unmatched imported
  for (let i = 0; i < imported.length; i++) {
    if (matchedImportIndices.has(i)) continue;
    naoReconhecidas.push({ importada: imported[i] });
  }

  // catalog entries not matched get their default nota
  for (let i = 0; i < catalog.length; i++) {
    if (usedCatalogIndices.has(i)) continue;
    const cat = catalog[i];
    items.push({
      id: `cat-${i}`,
      semana: cat.semana,
      tipo: cat.tipo,
      atividade: cat.atividade,
      peso: cat.peso,
      nota: cat.nota,
      origem: "catalogo",
      matchStatus: "unmatched",
      catalogIndex: i,
    });
  }

  items.sort((a, b) => (a.catalogIndex ?? 999) - (b.catalogIndex ?? 999));

  return { items, naoReconhecidas };
}

export function getCatalog(): AtividadeCatalogo[] {
  return catalog;
}
