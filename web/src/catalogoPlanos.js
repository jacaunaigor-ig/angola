const FUNCIONALIDADES = {
  cartografia: "Cartografia eleitoral no âmbito contratado",
  porta_a_porta: "Registo operacional de visitas de campo",
  discursos_ia: "Rascunhos de discursos com revisão humana",
  simulador_metas: "Simulação de metas eleitorais",
  telemetria_dores: "Agregação de carências comunitárias",
  anomalias_basicas: "Sinalização de anomalias básicas",
  invalidar_lote: "Invalidação de lotes de visitas",
  dia_d: "Operação de apuramento Dia D",
  casos_juridicos: "Registo de casos jurídicos",
  malha_dupla_dpa: "Malhas administrativas DPA 2016 e 2024",
  api_exportacao: "API e exportação de dados",
  hq_nacional: "Âmbito de comando nacional",
};

const LIMITES = [
  ["Contas War Room", "contas_war_room"],
  ["Brigadistas", "brigadistas"],
  ["Visitas por mês", "visitas_mes"],
  ["Rascunhos de discurso por mês", "discursos_ia_mes"],
  ["Assembleias Dia D por dia", "assembleias_dia_d"],
];

export function resumoPlano(plano) {
  const funcionalidades = Object.entries(plano?.funcionalidades || {})
    .filter(([chave, disponivel]) => disponivel === true && FUNCIONALIDADES[chave])
    .map(([chave]) => FUNCIONALIDADES[chave]);

  const limites = LIMITES
    .map(([nome, chave]) => ({ nome, valor: Number(plano?.limites?.[chave]) }))
    .filter(({ valor }) => Number.isFinite(valor) && valor > 0);

  return { funcionalidades, limites };
}
