const SIGLAS = ["MPLA", "UNITA"];
const ALVO_ANO = 2027;

function votoValido(eleicao, sigla) {
  const partido = (eleicao.partidos || []).find((item) => item.sigla === sigla);
  if (!partido) return null;

  const votos = Number(partido.votos);
  const total = Number(eleicao.votos_validos);
  if (Number.isFinite(votos) && votos >= 0 && Number.isFinite(total) && total > 0) {
    return (votos / total) * 100;
  }

  const percentual = Number(partido.percentagem_validos);
  return Number.isFinite(percentual) && percentual >= 0 ? percentual : null;
}

function limitarQuota(valor) {
  return Math.min(1, Math.max(0, valor));
}

function regressaoLinear(pontos, anoAlvo) {
  const mediaAno = pontos.reduce((soma, ponto) => soma + ponto.ano, 0) / pontos.length;
  const mediaQuota = pontos.reduce((soma, ponto) => soma + ponto.quota, 0) / pontos.length;
  const variacaoAno = pontos.reduce((soma, ponto) => soma + (ponto.ano - mediaAno) ** 2, 0);
  if (variacaoAno === 0) return mediaQuota;

  const covariacao = pontos.reduce(
    (soma, ponto) => soma + (ponto.ano - mediaAno) * (ponto.quota - mediaQuota),
    0,
  );
  const inclinacao = covariacao / variacaoAno;
  return mediaQuota + inclinacao * (anoAlvo - mediaAno);
}

function montarCenario(quotaMpla, pesoDuasListas, pesoOutras) {
  const pesoMpla = Math.round(pesoDuasListas * limitarQuota(quotaMpla) * 10) / 10;
  const pesoUnita = Math.round((pesoDuasListas - pesoMpla) * 10) / 10;
  return {
    MPLA: pesoMpla,
    UNITA: pesoUnita,
    "Outras forças": Math.round(pesoOutras * 10) / 10,
    lider: pesoMpla === pesoUnita ? "Empate" : pesoMpla > pesoUnita ? "MPLA" : "UNITA",
    diferenca_pp: Math.round(Math.abs(pesoMpla - pesoUnita) * 10) / 10,
  };
}

export function projetarCorridaPresidencial(dados, anoAlvo = ALVO_ANO) {
  const eleicoes = (dados?.eleicoes || [])
    .map((eleicao) => ({
      ano: Number(eleicao.ano),
      fonte: eleicao.url_fonte,
      descricao_fonte: eleicao.fonte,
      mpla: votoValido(eleicao, SIGLAS[0]),
      unita: votoValido(eleicao, SIGLAS[1]),
    }))
    .filter((eleicao) =>
      Number.isInteger(eleicao.ano)
      && eleicao.ano <= anoAlvo
      && eleicao.mpla !== null
      && eleicao.unita !== null
      && eleicao.mpla + eleicao.unita > 0,
    )
    .sort((a, b) => a.ano - b.ano);

  if (eleicoes.length < 3) return null;

  const ultima = eleicoes[eleicoes.length - 1];
  const anterior = eleicoes[eleicoes.length - 2];
  const quotaMpla = (eleicao) => eleicao.mpla / (eleicao.mpla + eleicao.unita);
  const pontos = eleicoes.map((eleicao) => ({ ano: eleicao.ano, quota: quotaMpla(eleicao) }));
  const pesoDuasListas = ultima.mpla + ultima.unita;
  const pesoOutras = Math.max(0, 100 - pesoDuasListas);
  const variacaoRecente = (quotaMpla(ultima) - quotaMpla(anterior))
    / (ultima.ano - anterior.ano);
  const quotaTendenciaRecente = quotaMpla(ultima) + variacaoRecente * (anoAlvo - ultima.ano);

  return {
    ano_base: ultima.ano,
    ano_alvo: anoAlvo,
    eleicoes: eleicoes.map(({ ano, fonte, descricao_fonte }) => ({
      ano,
      fonte,
      descricao_fonte,
    })),
    cenarios: [
      {
        id: "referencia",
        nome: `Referência CNE ${ultima.ano}`,
        natureza: "Resultado oficial",
        votos: montarCenario(quotaMpla(ultima), pesoDuasListas, pesoOutras),
      },
      {
        id: "tendencia_historica",
        nome: `Tendência linear ${eleicoes[0].ano}–${ultima.ano}`,
        natureza: "Simulação",
        votos: montarCenario(regressaoLinear(pontos, anoAlvo), pesoDuasListas, pesoOutras),
      },
      {
        id: "tendencia_recente",
        nome: `Continuação da variação ${anterior.ano}–${ultima.ano}`,
        natureza: "Simulação",
        votos: montarCenario(quotaTendenciaRecente, pesoDuasListas, pesoOutras),
      },
    ],
  };
}
