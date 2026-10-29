import React, { useMemo } from "react";
import { Aviso, Cartao, Selo } from "../components/ui.jsx";
import { projetarCorridaPresidencial } from "../projecaoPresidencial.js";

const formatarPercentual = (valor) => `${Number(valor).toLocaleString("pt-PT", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})}%`;
const formatarPontos = (valor) => `${Number(valor).toLocaleString("pt-PT", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})} p.p.`;

function BarraCenario({ votos }) {
  return (
    <div
      className="presidencial-barra"
      role="img"
      aria-label={`MPLA ${formatarPercentual(votos.MPLA)}, UNITA ${formatarPercentual(votos.UNITA)}, outras forças ${formatarPercentual(votos["Outras forças"])}`}
    >
      <span className="presidencial-barra-mpla" style={{ width: `${votos.MPLA}%` }} />
      <span className="presidencial-barra-unita" style={{ width: `${votos.UNITA}%` }} />
      <span className="presidencial-barra-outras" style={{ width: `${votos["Outras forças"]}%` }} />
    </div>
  );
}

export default function Presidencial({ serie }) {
  const projecao = useMemo(() => projetarCorridaPresidencial(serie), [serie]);

  if (!projecao) {
    return (
      <main className="page">
        <Cartao titulo="Corrida presidencial · cenários nacionais" acao={<Selo tipo="SIMULADO" />}>
          <Aviso tipo="info">
            Projeção indisponível: são necessários resultados nacionais comparáveis de pelo menos três eleições.
          </Aviso>
        </Cartao>
      </main>
    );
  }

  const fontes = projecao.eleicoes.filter((eleicao) => eleicao.fonte);

  return (
    <main className="page">
      <Cartao
        titulo={`Corrida presidencial · cenários nacionais para ${projecao.ano_alvo}`}
        nota={`Voto nacional por lista, usando MPLA e UNITA como séries comparáveis. Referência: CNE ${projecao.ano_base}.`}
        acao={<Selo tipo="SIMULADO" />}
      >
        <div className="presidencial-cenarios">
          {projecao.cenarios.map((cenario) => (
            <article className="presidencial-cenario" key={cenario.id}>
              <header>
                <div>
                  <h3>{cenario.nome}</h3>
                  <span className="muted">{cenario.natureza}</span>
                </div>
                {cenario.id === "referencia" ? <Selo tipo="OFICIAL" /> : <Selo tipo="SIMULADO" />}
              </header>
              <BarraCenario votos={cenario.votos} />
              <div className="presidencial-valores">
                <span><i className="presidencial-ponto mpla" /> MPLA <strong>{formatarPercentual(cenario.votos.MPLA)}</strong></span>
                <span><i className="presidencial-ponto unita" /> UNITA <strong>{formatarPercentual(cenario.votos.UNITA)}</strong></span>
                <span><i className="presidencial-ponto outras" /> Outras <strong>{formatarPercentual(cenario.votos["Outras forças"])}</strong></span>
              </div>
              <p className="presidencial-lider">
                Maior votação no cenário: <strong>{cenario.votos.lider}</strong>
                {cenario.votos.lider !== "Empate" && ` · diferença ${formatarPontos(cenario.votos.diferenca_pp)} entre MPLA e UNITA`}
              </p>
            </article>
          ))}
        </div>

        <div className="presidencial-metodo">
          <h3>Como interpretar</h3>
          <ul>
            <li>Não há sondagens incorporadas no projeto; estes valores não são intenção de voto.</li>
            <li>Quota MPLA = MPLA ÷ (MPLA + UNITA). As tendências extrapolam essa quota até {projecao.ano_alvo} e mantêm constante a quota conjunta das outras forças observada em {projecao.ano_base}.</li>
            <li>O modelo linear é extrapolação histórica, sem intervalo de confiança: não prevê participação, novas coligações, candidaturas ou mudanças de contexto.</li>
            <li>“Maior votação” descreve apenas o cenário calculado; não é previsão oficial nem probabilidade de vitória.</li>
          </ul>
        </div>

        {fontes.length > 0 && (
          <div className="presidencial-fontes">
            <strong>Resultados históricos usados:</strong>
            {fontes.map((eleicao) => (
              <a key={eleicao.ano} href={eleicao.fonte} target="_blank" rel="noreferrer">
                Fonte {eleicao.ano}
              </a>
            ))}
          </div>
        )}
      </Cartao>
    </main>
  );
}
