/**
 * Serviço de Estatística Amostral para Pesquisas e Coleta de Terreno
 * Princípio: NUNCA exibir percentual (%) sem tamanho da amostra (n) e margem de erro.
 */

/**
 * Calcula a margem de erro estatística com nível de confiança de 95% (z = 1.96)
 * Utiliza o fator de correção para população finita (FPCF).
 * 
 * @param {number} n - Tamanho da amostra de visitas válidas
 * @param {number} [populacaoN=1000000] - Universo de eleitores aptos no território
 * @param {number} [proporcaoP=0.5] - Proporção esperada (0.5 para máxima variância conservadora)
 * @returns {Object} Metadados estatísticos e margem de erro em pontos percentuais
 */
function calcularMargemErroAmostral(n, populacaoN = 1000000, proporcaoP = 0.5) {
  const tamanhoAmostra = Math.max(0, parseInt(n || 0, 10));
  const universo = Math.max(tamanhoAmostra + 1, parseInt(populacaoN || 1000000, 10));

  if (tamanhoAmostra === 0) {
    return {
      n_amostra: 0,
      populacao_universo_N: universo,
      margem_erro_perc: null,
      nivel_confianca: '95%',
      representatividade: 'SEM_DADOS',
      aviso_metodologico: 'Nenhuma visita registrada no território. Sem base estatística.'
    };
  }

  if (tamanhoAmostra < 30) {
    // Amostras muito pequenas (n < 30) têm distribuição t de Student e alta volatilidade
    return {
      n_amostra: tamanhoAmostra,
      populacao_universo_N: universo,
      margem_erro_perc: null,
      nivel_confianca: 'INCONCLUSIVO',
      representatividade: 'AMOSTRA_EXPLORATORIA',
      aviso_metodologico: `Amostra preliminar reduzida (n = ${tamanhoAmostra} < 30). Dados puramente indicativos; margem de erro não aplicável.`
    };
  }

  // z = 1.96 para 95% de confiança
  const z = 1.96;
  const p = proporcaoP;
  const q = 1 - p;

  // Variância com correção de população finita
  const variancia = (p * q) / tamanhoAmostra;
  const fpcf = universo > 1 ? (universo - tamanhoAmostra) / (universo - 1) : 1.0;
  const erroPadrao = Math.sqrt(variancia * Math.max(0, fpcf));
  const margemErroPerc = Number((z * erroPadrao * 100).toFixed(1));

  let representatividade = 'REPRESENTATIVO';
  if (margemErroPerc > 7.0) representatividade = 'AMPLITUDE_ALTA';
  else if (margemErroPerc <= 3.5) representatividade = 'ALTA_PRECISAO';

  return {
    n_amostra: tamanhoAmostra,
    populacao_universo_N: universo,
    margem_erro_perc: margemErroPerc,
    nivel_confianca: '95%',
    representatividade,
    texto_formatado: `n = ${tamanhoAmostra.toLocaleString()} (±${margemErroPerc} p.p., 95% de confiança)`,
    aviso_metodologico: `Amostra de ${tamanhoAmostra} entrevistas. Margem de erro de ±${margemErroPerc} pontos percentuais para um intervalo de confiança de 95%.`
  };
}

module.exports = {
  calcularMargemErroAmostral
};
