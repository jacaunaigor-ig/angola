/**
 * Serviço de Cálculo Transparente e Configurável de Zonamento Político
 * Elimina classificações manuais ou opiniões subjetivas.
 * Baseado em métricas eleitorais auditáveis e fórmulas matemáticas explícitas.
 */

const REGRAS_PADRAO = {
  codigo: 'MARGEM_BIDIRECIONAL_CNE_V1',
  nome: 'Regra Padrão por Margem de Votos Válidos CNE',
  descricao: 'Compara a diferença percentual entre os dois principais concorrentes sobre os votos válidos.',
  limiar_bastiao_margem: 15.0,   // Margem >= +15.0% -> Bastião Seguro
  limiar_oposicao_margem: -15.0, // Margem <= -15.0% -> Oposição Consolidada
  formula_texto: 'Margem = (% Votos Partido - % Votos Principal Oponente). ' +
                 'Se Margem >= +15.00% => BASTIAO; ' +
                 'Se Margem <= -15.00% => OPOSICAO; ' +
                 'Caso contrário => CAMPO_BATALHA'
};

/**
 * Calcula o zonamento eleitoral de forma determinística
 * @param {Object} params
 * @param {number} params.votos_partido - Votos nominais do partido da campanha
 * @param {number} params.votos_oposicao - Votos nominais do principal oponente
 * @param {number} params.total_validos - Total de votos válidos computados
 * @param {Object} [config] - Limiares configuráveis da campanha
 */
function calcularZonamento({ votos_partido, votos_oposicao, total_validos }, config = {}) {
  const limiarBastiao = Number(config.limiar_bastiao_margem ?? REGRAS_PADRAO.limiar_bastiao_margem);
  const limiarOposicao = Number(config.limiar_oposicao_margem ?? REGRAS_PADRAO.limiar_oposicao_margem);

  if (!total_validos || total_validos <= 0) {
    return {
      zonamento: 'CAMPO_BATALHA',
      margem_perc: 0.0,
      votos_partido_perc: 0.0,
      votos_oposicao_perc: 0.0,
      classificacao_label: '🟡 CAMPO DE BATALHA (Sem Votos Válidos Computados)',
      formula_aplicada: 'Sem dados de votação válidos; classificado por precaução como disputa.',
      parametros_utilizados: { limiarBastiao, limiarOposicao }
    };
  }

  const percPartido = Number(((votos_partido / total_validos) * 100).toFixed(2));
  const percOposicao = Number(((votos_oposicao / total_validos) * 100).toFixed(2));
  const margem = Number((percPartido - percOposicao).toFixed(2));

  let zonamento = 'CAMPO_BATALHA';
  let rotulo = '🟡 CAMPO DE BATALHA (Zona em Disputa)';

  if (margem >= limiarBastiao) {
    zonamento = 'BASTIAO';
    rotulo = '🟢 BASTIÃO SEGURO (Vantagem Consolidada)';
  } else if (margem <= limiarOposicao) {
    zonamento = 'OPOSICAO';
    rotulo = '🔴 ZONA DE OPOSIÇÃO (Desvantagem Consolidada)';
  }

  return {
    zonamento,
    rotulo,
    margem_perc: margem,
    votos_partido_perc: percPartido,
    votos_oposicao_perc: percOposicao,
    formula_aplicada: `Margem de ${margem > 0 ? '+' : ''}${margem}% calculada por: (${percPartido}% - ${percOposicao}%). ` +
                      `Limiares de corte: Bastião >= +${limiarBastiao}% | Oposição <= ${limiarOposicao}%.`,
    parametros_utilizados: {
      limiar_bastiao_margem: limiarBastiao,
      limiar_oposicao_margem: limiarOposicao,
      codigo_regra: config.codigo || REGRAS_PADRAO.codigo
    }
  };
}

module.exports = {
  REGRAS_PADRAO,
  calcularZonamento
};
