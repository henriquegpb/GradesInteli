import type { ItemNota, MetricasModulo, SimulacaoConfig } from "@/types/grades";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function assumedNota(tipo: string, simulacao: SimulacaoConfig): number {
  if (tipo === "Ponderada") return simulacao.notaAssumidaPonderada;
  if (tipo === "Artefato") return simulacao.notaAssumidaArtefato;
  return simulacao.notaAssumida;
}

function isEvaluated(item: ItemNota): boolean {
  return item.nota !== null;
}

export function acumuladoPorTipo(items: ItemNota[], tipo: string): number {
  return items
    .filter((item) => item.tipo === tipo)
    .reduce((acc, item) => acc + item.peso * (item.nota ?? 0), 0);
}

export function mediaPonderadaAteOMomento(
  items: ItemNota[],
  tipo?: string
): number | null {
  const filtrados = items.filter((item) => {
    const okTipo = tipo ? item.tipo === tipo : true;
    return okTipo && isEvaluated(item);
  });

  const somaPesos = filtrados.reduce((acc, item) => acc + item.peso, 0);
  if (somaPesos === 0) return null;

  const soma = filtrados.reduce((acc, item) => acc + item.peso * (item.nota ?? 0), 0);
  return soma / somaPesos;
}

export function pontosNaoAvaliados(items: ItemNota[]): number {
  return items
    .filter((item) => !isEvaluated(item))
    .reduce((acc, item) => acc + item.peso, 0);
}

export function pontosAvaliados(items: ItemNota[]): number {
  return items
    .filter((item) => isEvaluated(item))
    .reduce((acc, item) => acc + item.peso, 0);
}

export function pesoTotalPorTipo(
  items: ItemNota[]
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of items) {
    if (!item.tipo) continue;
    result[item.tipo] = (result[item.tipo] || 0) + item.peso;
  }
  return result;
}

export function notaNecessariaNaProva(
  items: ItemNota[],
  metaFinal: number,
  mediaAtual: number | null,
  simulacao: SimulacaoConfig
): number {
  const pesoProva = items
    .filter((i) => i.tipo === "Prova")
    .reduce((acc, i) => acc + i.peso, 0);

  if (pesoProva === 0) return 0;

  const media = mediaAtual ?? simulacao.notaAssumida;

  const somaSemProva = items.reduce((acc, item) => {
    if (item.tipo === "Prova") return acc;
    const notaUsada = isEvaluated(item)
      ? (item.nota ?? 0)
      : simulacao.manterAteOMomento
        ? media
        : assumedNota(item.tipo, simulacao);
    return acc + item.peso * notaUsada;
  }, 0);

  const nota = (metaFinal - somaSemProva) / pesoProva;
  return clamp(nota, 0, 10);
}

export function acumuladoFinalProjetado(
  items: ItemNota[],
  mediaAtual: number | null,
  simulacao: SimulacaoConfig,
  notaProva: number
): number {
  const media = mediaAtual ?? simulacao.notaAssumida;

  return items.reduce((acc, item) => {
    let notaUsada: number;
    if (item.tipo === "Prova") {
      notaUsada = notaProva;
    } else if (isEvaluated(item)) {
      notaUsada = item.nota ?? 0;
    } else {
      notaUsada = simulacao.manterAteOMomento ? media : assumedNota(item.tipo, simulacao);
    }
    return acc + item.peso * notaUsada;
  }, 0);
}

export function calcularMetricas(
  items: ItemNota[],
  simulacao: SimulacaoConfig
): MetricasModulo {
  const acPonderadas = acumuladoPorTipo(items, "Ponderada");
  const acArtefatos = acumuladoPorTipo(items, "Artefato");
  const acAulas = acumuladoPorTipo(items, "Aula");
  const acGrupo = acumuladoPorTipo(items, "Grupo");
  const acProva = acumuladoPorTipo(items, "Prova");
  const acTotal = acPonderadas + acArtefatos + acAulas + acGrupo + acProva;

  const mediaTotalAtual = mediaPonderadaAteOMomento(items);

  const meta = simulacao.metaFinal;

  const notaProva = notaNecessariaNaProva(items, meta, mediaTotalAtual, simulacao);

  const notaProvaRaw = (() => {
    const pesoProva = items
      .filter((i) => i.tipo === "Prova")
      .reduce((acc, i) => acc + i.peso, 0);
    if (pesoProva === 0) return 0;
    const media = mediaTotalAtual ?? simulacao.notaAssumida;
    const somaSemProva = items.reduce((acc, item) => {
      if (item.tipo === "Prova") return acc;
      const notaUsada = isEvaluated(item)
        ? (item.nota ?? 0)
        : simulacao.manterAteOMomento
          ? media
          : assumedNota(item.tipo, simulacao);
      return acc + item.peso * notaUsada;
    }, 0);
    return (meta - somaSemProva) / pesoProva;
  })();

  let provaStatus: "aprovado" | "exigente" | "impossivel";
  if (notaProvaRaw <= 0) {
    provaStatus = "aprovado";
  } else if (notaProvaRaw > 10) {
    provaStatus = "impossivel";
  } else if (notaProvaRaw > 7) {
    provaStatus = "exigente";
  } else {
    provaStatus = "aprovado";
  }

  const finalProjetado = acumuladoFinalProjetado(
    items,
    mediaTotalAtual,
    simulacao,
    notaProva
  );

  return {
    acumuladoPonderadas: acPonderadas,
    acumuladoArtefatos: acArtefatos,
    acumuladoAulas: acAulas,
    acumuladoGrupo: acGrupo,
    acumuladoProva: acProva,
    acumuladoTotal: acTotal,
    mediaPonderadasAteOMomento: mediaPonderadaAteOMomento(items, "Ponderada"),
    mediaArtefatosAteOMomento: mediaPonderadaAteOMomento(items, "Artefato"),
    mediaAulasAteOMomento: mediaPonderadaAteOMomento(items, "Aula"),
    mediaGrupoAteOMomento: mediaPonderadaAteOMomento(items, "Grupo"),
    mediaProvaAteOMomento: mediaPonderadaAteOMomento(items, "Prova"),
    mediaTotalAteOMomento: mediaTotalAtual,
    notaNecessariaProva: notaProva,
    provaStatus,
    acumuladoFinalProjetado: finalProjetado,
    pontosNaoAvaliados: pontosNaoAvaliados(items),
    pontosAvaliados: pontosAvaliados(items),
    pesosPorTipo: pesoTotalPorTipo(items),
  };
}
