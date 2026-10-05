import { useMemo, useState } from "react";
import GraficoSerie from "../components/GraficoSerie.jsx";
import { Aviso, Cartao, Kpi, Selo } from "../components/ui.jsx";
import MapaTerritorio from "../Mapa.jsx";
import { classificar, fmtInt, fmtPct, priorizar, rotuloZona, serieParaGrafico } from "../territorio.js";

const PESOS_PADRAO = { disputa: 4, volume: 3, abstencao: 3, jovens: 2 };
const CAMADAS = [
  ["zona", "Zonamento"],
  ["margem", "Margem"],
  ["score", "Prioridade"],
  ["custo", "Logística"],
];

function deputados(hondt) {
  if (!hondt) return null;
  return [hondt["Nosso Partido"] ?? hondt.MPLA ?? 0, hondt["Oposição"] ?? hondt.UNITA ?? 0];
}

function PainelTerritorio({ foco }) {
  if (!foco) return <p className="vazio">Escolha um território no mapa ou na tabela.</p>;
  const zona = foco.zonamento_activo || foco.zonamento;
  const cadeiras = deputados(foco.hondt_deputados);
  const geomSimulada = foco.proveniencia_geometria === "SIMULADO";
  return (
    <div className="detalhe">
      <div className="detalhe-topo">
        <h2>{foco.nome}</h2>
        <span className={`zona ${zona}`}>{rotuloZona(zona)}</span>
      </div>
      {geomSimulada && (
        <p className="muted">Traçado <Selo tipo="SIMULADO" />: a DPA 2024 ainda não tem fronteira oficial neste mapa. O ponto marca o centróide estimado.</p>
      )}
      <dl className="factos">
        <div><dt>Margem 2022</dt><dd>{fmtPct(foco.margem_apurada_perc)}</dd></div>
        <div><dt>Eleitores aptos</dt><dd>{fmtInt(foco.eleitores_cne)}</dd></div>
        <div><dt>Abstenção</dt><dd>{fmtPct(foco.abstencao_perc)}</dd></div>
        <div><dt>Jovens</dt><dd>{fmtPct(foco.juventude_perc)}</dd></div>
      </dl>

      {foco.custo_logistico_fator && (
        <div className="bloco">
          <p>
            <strong>Custo logístico</strong> {foco.custo_logistico_fator}×
            <span className={`badge badge-${(foco.custo_logistico_dificuldade || "media").toLowerCase()}`}>
              Acesso {foco.custo_logistico_dificuldade}
            </span>
          </p>
          <p className="muted">{foco.custo_logistico_modal}: {foco.custo_logistico_descricao}</p>
        </div>
      )}

      {cadeiras && (
        <div className="bloco">
          <p><strong>Deputados do círculo</strong> <Selo tipo={foco.proveniencia_dados || "OFICIAL"} /></p>
          <div className="seats-display" aria-label={`${cadeiras[0]} para o partido A, ${cadeiras[1]} para o partido B`}>
            {Array.from({ length: cadeiras[0] }, (_, i) => <span key={`a${i}`} className="seat-circle seat-a">A</span>)}
            {Array.from({ length: cadeiras[1] }, (_, i) => <span key={`b${i}`} className="seat-circle seat-b">B</span>)}
          </div>
          {foco.hondt_votos_proxima_cadeira > 0 && (
            <p className="muted">
              Faltam <strong>{fmtInt(foco.hondt_votos_proxima_cadeira)}</strong> votos para virar a próxima cadeira.
              <span className={`badge badge-${(foco.hondt_volatilidade_cadeira || "media").toLowerCase()}`}>
                Volatilidade {foco.hondt_volatilidade_cadeira}
              </span>
            </p>
          )}
        </div>
      )}

      <div className="bloco destaque">
        <span className="muted">Prioridade integrada</span>
        <strong className="score">{foco.score ?? "—"}<small> / 100</small></strong>
        <p className="muted">
          {foco.formula_prioridade || "(Potencial × Competitividade Hondt) ÷ Custo logístico de alcance"}
        </p>
      </div>
    </div>
  );
}

export default function Comando({ dados, territorio, plano, setPlano, versao, setVersao }) {
  const [bastiao, setBastiao] = useState(15);
  const [oposicao, setOposicao] = useState(-15);
  const [selecionado, setSelecionado] = useState(null);
  const [camada, setCamada] = useState("zona");
  const [filtroZona, setFiltroZona] = useState("");
  const [busca, setBusca] = useState("");
  const [nomes, setNomes] = useState(true);
  const [fundo, setFundo] = useState("ruas");

  const linhas = useMemo(() => {
    const marcadas = territorio.features.map((f) => ({
      ...(f.properties || {}),
      zonamento_activo: classificar(f.properties?.margem_apurada_perc, bastiao, oposicao),
    }));
    return priorizar(marcadas, PESOS_PADRAO);
  }, [territorio.features, bastiao, oposicao]);

  const featuresActivas = useMemo(() => {
    const porNome = new Map(linhas.map((l) => [l.nome, l]));
    return territorio.features.map((f) => {
      const linha = porNome.get(f.properties?.nome);
      return {
        ...f,
        properties: {
          ...f.properties,
          zonamento_activo: linha?.zonamento_activo || f.properties?.zonamento,
          score: linha?.score,
        },
      };
    });
  }, [territorio.features, linhas]);

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return linhas.filter((row) => {
      if (filtroZona && row.zonamento_activo !== filtroZona) return false;
      if (q && !(row.nome || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [linhas, filtroZona, busca]);

  const pontos = serieParaGrafico(dados.serie?.serie?.eleicoes);
  const soma = (campo) => linhas.reduce((s, r) => s + (Number(r[campo]) || 0), 0);
  const contagem = linhas.reduce((acc, r) => ({ ...acc, [r.zonamento_activo]: (acc[r.zonamento_activo] || 0) + 1 }), {});
  const foco = selecionado ? linhas.find((l) => l.nome === selecionado.nome) || selecionado : visiveis[0] || linhas[0];
  const aCarregar = territorio.carregando;
  const notaCamada = {
    zona: "Zonamento pela margem 2022, com limiares ajustáveis.",
    margem: "Verde = vantagem do partido A; vermelho = vantagem do oponente.",
    score: "Prioridade integrada (potencial × Hondt ÷ logística).",
    custo: "Dificuldade de alcance logístico do território.",
  }[camada];

  return (
    <main className="page">
      <Aviso>{territorio.erro}</Aviso>

      <section className="kpis" aria-label="Indicadores nacionais">
        <Kpi rotulo="Eleitorado 2022" valor={fmtInt(soma("eleitores_cne"))} selo="OFICIAL" carregando={aCarregar} />
        <Kpi rotulo="População" valor={fmtInt(soma("populacao_total"))} selo="ESTIMADO" carregando={aCarregar} />
        <Kpi rotulo="Bastiões" valor={contagem.BASTIAO || 0} carregando={aCarregar} />
        <Kpi rotulo="Em disputa" valor={contagem.CAMPO_BATALHA || 0} carregando={aCarregar} />
        <Kpi rotulo="Oposição" valor={contagem.OPOSICAO || 0} carregando={aCarregar} />
      </section>

      <section className="controlos" aria-label="Parâmetros do zonamento">
        <label>Malha territorial
          <select value={versao} onChange={(e) => { setVersao(e.target.value); setSelecionado(null); }}>
            <option value="DPA_2016_18P">DPA 2016 · 18 províncias (base CNE 2022)</option>
            <option value="DPA_2024_21P">DPA 2024 · 21 províncias (planeamento 2027)</option>
          </select>
        </label>
        <label>Plano comercial
          <select value={plano} onChange={(e) => setPlano(e.target.value)}>
            <option value="NACIONAL">Nacional · 21 províncias</option>
            <option value="PROVINCIAL">Provincial · 1 província</option>
            <option value="MUNICIPAL">Municipal · 1 município</option>
          </select>
        </label>
        <label>Bastião se margem ≥ (p.p.)
          <input type="number" value={bastiao} onChange={(e) => setBastiao(Number(e.target.value))} />
        </label>
        <label>Oposição se margem ≤ (p.p.)
          <input type="number" value={oposicao} onChange={(e) => setOposicao(Number(e.target.value))} />
        </label>
      </section>

      <section className="grid-2">
        <Cartao
          className="map-card"
          titulo="Território"
          nota={`${notaCamada} Leaflet + OpenStreetMap; pode afastar o zoom para ver RDC, Congo, Zâmbia e Namíbia.`}
          acao={
            <div className="legenda-zonas" aria-label="Legenda de zonas">
              <span><i className="ponto bastiao" /> Bastião</span>
              <span><i className="ponto batalha" /> Disputa</span>
              <span><i className="ponto oposicao" /> Oposição</span>
            </div>
          }
        >
          <div className="mapa-toolbar" role="toolbar" aria-label="Camadas do mapa">
            {CAMADAS.map(([id, rotulo]) => (
              <button key={id} type="button" className={camada === id ? "ghost activa" : "ghost"} onClick={() => setCamada(id)}>
                {rotulo}
              </button>
            ))}
            <button type="button" className={nomes ? "ghost activa" : "ghost"} onClick={() => setNomes((v) => !v)}>
              Nomes
            </button>
            <button type="button" className={fundo === "ruas" ? "ghost activa" : "ghost"} onClick={() => setFundo("ruas")}>Ruas</button>
            <button type="button" className={fundo === "satelite" ? "ghost activa" : "ghost"} onClick={() => setFundo("satelite")}>Satélite</button>
            <button type="button" className={fundo === "nenhum" ? "ghost activa" : "ghost"} onClick={() => setFundo("nenhum")}>Só malha</button>
            <button type="button" className="ghost" onClick={() => setSelecionado(null)}>Angola</button>
          </div>
          {aCarregar ? (
            <div className="mapa skeleton" aria-busy="true" />
          ) : (
            <MapaTerritorio
              features={featuresActivas}
              contorno={dados.contorno}
              onSelect={setSelecionado}
              selecionado={selecionado?.nome}
              camada={camada}
              filtro={filtroZona}
              mostrarNomes={nomes}
              fundo={fundo}
            />
          )}
        </Cartao>

        <Cartao className="lateral">
          <PainelTerritorio foco={foco} />
          <div className="controlos tabela-filtro">
            <label>Pesquisar
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Huambo, Luanda…" />
            </label>
            <label>Filtrar zona
              <select value={filtroZona} onChange={(e) => setFiltroZona(e.target.value)}>
                <option value="">Todas</option>
                <option value="BASTIAO">Bastião</option>
                <option value="CAMPO_BATALHA">Disputa</option>
                <option value="OPOSICAO">Oposição</option>
              </select>
            </label>
          </div>
          <table>
            <caption className="sr-only">Territórios ordenados por prioridade</caption>
            <thead>
              <tr><th>Território</th><th>Zona</th><th>Dep.</th><th>Custo</th><th>Score</th></tr>
            </thead>
            <tbody>
              {visiveis.slice(0, 12).map((row) => {
                const c = deputados(row.hondt_deputados);
                return (
                  <tr
                    key={row.nome}
                    className={foco?.nome === row.nome ? "activa" : ""}
                    onClick={() => setSelecionado(row)}
                    tabIndex={0}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelecionado(row)}
                  >
                    <td>{row.nome}</td>
                    <td className={`zona ${row.zonamento_activo}`}>{rotuloZona(row.zonamento_activo)}</td>
                    <td>{c ? `${c[0]}–${c[1]}` : "—"}</td>
                    <td>{row.custo_logistico_fator ? `${row.custo_logistico_fator}×` : "1,0×"}</td>
                    <td><strong>{row.score}</strong></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Cartao>
      </section>

      <Cartao
        titulo="Série nacional 2012–2022"
        acao={
          <div className="legend" aria-hidden="true">
            <span><i className="swatch mpla" /> MPLA</span>
            <span><i className="swatch unita" /> UNITA</span>
            <span><i className="swatch abs" /> Abstenção</span>
          </div>
        }
      >
        <GraficoSerie pontos={pontos} />
        <table>
          <caption className="sr-only">Resultados nacionais por eleição</caption>
          <thead>
            <tr><th>Ano</th><th>Inscritos</th><th>Votantes</th><th>Abstenção</th><th>MPLA</th><th>UNITA</th><th>Deputados</th></tr>
          </thead>
          <tbody>
            {pontos.map((p) => (
              <tr key={p.ano}>
                <td>{p.ano}</td>
                <td>{fmtInt(p.inscritos)}</td>
                <td>{fmtInt(p.votantes)}</td>
                <td>{fmtPct(p.abstencao)}</td>
                <td>{fmtPct(p.mpla)}</td>
                <td>{fmtPct(p.unita)}</td>
                <td>{p.depMpla} / {p.depUnita}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <details className="lacunas">
          <summary>O que este painel ainda não cobre</summary>
          <p className="muted">{(dados.serie?.serie?.lacunas || []).join(" ")}</p>
        </details>
      </Cartao>
    </main>
  );
}
