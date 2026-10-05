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
  if (zona === "BASTIAO") return "#3dbe8b";
  if (zona === "OPOSICAO") return "#e15b5b";
  return "#e08a3c";
}

export function corMargem(margem) {
  const m = Number(margem);
  if (!Number.isFinite(m)) return "#4a5563";
  if (m >= 25) return "#1f8a62";
  if (m >= 15) return "#3dbe8b";
  if (m >= 5) return "#7dd3b0";
  if (m > -5) return "#d6b25e";
  if (m > -15) return "#e08a3c";
  if (m > -25) return "#e15b5b";
  return "#a33b3b";
}

export function corScore(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return "#4a5563";
  if (n >= 80) return "#d6b25e";
  if (n >= 60) return "#c49a4a";
  if (n >= 40) return "#8a7348";
  if (n >= 20) return "#4d5a6a";
  return "#343d4a";
}

export function corLogistica(dificuldade) {
  if (dificuldade === "BAIXA") return "#3dbe8b";
  if (dificuldade === "BAIXA_MEDIA" || dificuldade === "MEDIA") return "#5aa7e0";
  if (dificuldade === "MEDIA_ALTA" || dificuldade === "ALTA") return "#e08a3c";
  return "#e15b5b";
}

export function corCamada(camada, props) {
  if (camada === "margem") return corMargem(props?.margem_apurada_perc);
  if (camada === "score") return corScore(props?.score_prioridade ?? props?.score);
  if (camada === "custo") return corLogistica(props?.custo_logistico_dificuldade);
  return corZona(props?.zonamento_activo || props?.zonamento);
}

export function priorizar(unidades, pesos) {
  const maxEleitores = Math.max(...unidades.map((u) => Number(u.eleitores_cne) || 0), 1);
  return unidades
    .map((row) => {
      // Se a API já calculou o índice integrado completo (com custo logístico e Hondt):
      if (row.score_prioridade !== undefined && row.score_prioridade !== null) {
        return { ...row, score: Number(row.score_prioridade) };
      }
      const margem = Math.abs(Number(row.margem_apurada_perc) || 0);
      const disputa = Math.max(0, 100 - margem * 2);
      const volume = ((Number(row.eleitores_cne) || 0) / maxEleitores) * 100;
      const abstencao = Number(row.abstencao_perc) || 0;
      const jovens = Number(row.juventude_perc) || 0;
      const soma = pesos.disputa + pesos.volume + pesos.abstencao + pesos.jovens;
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
