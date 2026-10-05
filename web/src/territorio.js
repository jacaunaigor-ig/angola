export function fmtInt(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString("pt-PT");
}

export function fmtPct(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString("pt-PT", { maximumFractionDigits: 2 })}%`;
}

export function classificar(margem, bastiao, oposicao) {
  const m = Number(margem);
  if (!Number.isFinite(m)) return "CAMPO_BATALHA";
  if (m >= bastiao) return "BASTIAO";
  if (m <= oposicao) return "OPOSICAO";
  return "CAMPO_BATALHA";
}

export function rotuloZona(zona) {
  if (zona === "BASTIAO") return "Bastião";
  if (zona === "OPOSICAO") return "Oposição";
  return "Campo de batalha";
}

export function corZona(zona) {
  if (zona === "BASTIAO") return "#10B981";
  if (zona === "OPOSICAO") return "#EF4444";
  return "#F97316";
}

export function priorizar(unidades, pesos) {
  const maxEleitores = Math.max(...unidades.map((u) => Number(u.eleitores_cne) || 0), 1);
  const soma = pesos.disputa + pesos.volume + pesos.abstencao + pesos.jovens;
  return unidades
    .map((row) => {
      const margem = Math.abs(Number(row.margem_apurada_perc) || 0);
      const disputa = Math.max(0, 100 - margem * 2);
      const volume = ((Number(row.eleitores_cne) || 0) / maxEleitores) * 100;
      const abstencao = Number(row.abstencao_perc) || 0;
      const jovens = Number(row.juventude_perc) || 0;
      const score =
        (disputa * pesos.disputa +
          volume * pesos.volume +
          abstencao * pesos.abstencao +
          jovens * pesos.jovens) /
        Math.max(soma, 1);
      return { ...row, score: Math.round(score * 10) / 10 };
    })
    .sort((a, b) => b.score - a.score);
}

export function serieParaGrafico(eleicoes) {
  return (eleicoes || []).map((eleicao) => {
    const partidos = Object.fromEntries((eleicao.partidos || []).map((p) => [p.sigla, p]));
    return {
      ano: eleicao.ano,
      mpla: partidos.MPLA?.percentagem_validos ?? null,
      unita: partidos.UNITA?.percentagem_validos ?? null,
      abstencao: eleicao.abstencao_perc ?? null,
      inscritos: eleicao.eleitores_inscritos,
      votantes: eleicao.votantes,
      depMpla: partidos.MPLA?.deputados,
      depUnita: partidos.UNITA?.deputados,
      proveniencia: eleicao.proveniencia,
    };
  });
}
