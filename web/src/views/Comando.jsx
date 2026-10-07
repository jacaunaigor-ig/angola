import React, { useMemo, useState } from "react";
import GraficoSerie from "../components/GraficoSerie.jsx";
import {
  IconeCentrar,
  IconeFiltro,
  IconeLogistica,
  IconeMalha,
  IconeMargem,
  IconePesquisa,
  IconePrioridade,
  IconeRuas,
  IconeSatelite,
  IconeZonamento,
} from "../components/Icones.jsx";
import BriefingDia from "../components/BriefingDia.jsx";
import { Aviso, Cartao, Kpi, Selo } from "../components/ui.jsx";
import MapaTerritorio from "../Mapa.jsx";
import { classificar, fmtInt, fmtPct, priorizar, rotuloZona, serieParaGrafico } from "../territorio.js";

const PESOS_PADRAO = { disputa: 4, volume: 3, abstencao: 3, jovens: 2 };
const CAMADAS = [
  ["zona", "Zonamento", IconeZonamento],
  ["margem", "Margem", IconeMargem],
  ["score", "Prioridade", IconePrioridade],
  ["custo", "Logística", IconeLogistica],
];
const FUNDOS_OPCOES = [
  ["ruas", "Ruas", IconeRuas],
  ["satelite", "Satélite", IconeSatelite],
  ["nenhum", "Só malha", IconeMalha],
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
  const mplaAssentos = cadeiras ? cadeiras[0] : 0;
  const unitaAssentos = cadeiras ? cadeiras[1] : 0;
  const totalAssentos = Math.max(mplaAssentos + unitaAssentos, 1);

  return (
    <div className="detalhe">
      <div className="detalhe-topo">
        <div>
          <span className="eyebrow">{foco.regiao || "Círculo Provincial"}</span>
          <h2>{foco.nome}</h2>
        </div>
        <span className={`zona ${zona}`}>{rotuloZona(zona)}</span>
      </div>

      {geomSimulada && (
        <p className="muted" style={{ fontSize: "11.5px" }}>
          Traçado <Selo tipo="SIMULADO" />: nova província DPA 2024. Ponto indica o centróide estimado.
        </p>
      )}

      <dl className="factos">
        <div>
          <dt>Margem 2022</dt>
          <dd style={{ color: foco.margem_apurada_perc >= 0 ? "var(--ok)" : "var(--bad)" }}>
            {fmtPct(foco.margem_apurada_perc)}
          </dd>
        </div>
        <div>
          <dt>Eleitores aptos</dt>
          <dd>{fmtInt(foco.eleitores_cne)}</dd>
        </div>
        <div>
          <dt>Abstenção</dt>
          <dd>{fmtPct(foco.abstencao_perc)}</dd>
        </div>
        <div>
          <dt>Jovens (18–35)</dt>
          <dd>{fmtPct(foco.juventude_perc)}</dd>
        </div>
      </dl>

      {cadeiras && (
        <div className="bloco">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "12px", fontWeight: "600" }}>Círculo Provincial (5 Deputados)</span>
            <Selo tipo={foco.proveniencia_dados || "OFICIAL"} />
          </div>

          <div className="seat-bar-container">
            <div className="seat-bar" aria-label={`MPLA: ${mplaAssentos}, UNITA: ${unitaAssentos}`}>
              <div className="seat-bar-fatia mpla" style={{ width: `${(mplaAssentos / totalAssentos) * 100}%` }} />
              <div className="seat-bar-fatia unita" style={{ width: `${(unitaAssentos / totalAssentos) * 100}%` }} />
            </div>
          </div>

          <div className="seats-display">
            <span className="seat-pill mpla">
              <i className="seat-dot mpla" /> {mplaAssentos} MPLA
            </span>
            <span className="seat-pill unita">
              <i className="seat-dot unita" /> {unitaAssentos} UNITA
            </span>
          </div>

          {foco.hondt_votos_proxima_cadeira > 0 && (
            <p className="muted" style={{ fontSize: "12px", marginTop: "6px" }}>
              Faltam <strong>+{fmtInt(foco.hondt_votos_proxima_cadeira)}</strong> votos para virar próxima cadeira.
              <span className={`badge badge-${(foco.hondt_volatilidade_cadeira || "media").toLowerCase()}`} style={{ marginLeft: "6px" }}>
                Volatilidade {foco.hondt_volatilidade_cadeira}
              </span>
            </p>
          )}
        </div>
      )}

      {foco.custo_logistico_fator && (
        <div className="bloco">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: "600" }}>Alcance Logístico</span>
            <span className={`badge badge-${(foco.custo_logistico_dificuldade || "media").toLowerCase()}`}>
              Acesso {foco.custo_logistico_dificuldade} · {foco.custo_logistico_fator}×
            </span>
          </div>
          <p className="muted" style={{ fontSize: "11.5px", marginTop: "4px" }}>
            <strong>{foco.custo_logistico_modal}</strong>: {foco.custo_logistico_descricao}
          </p>
        </div>
      )}

      <div className="bloco destaque">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span className="muted" style={{ fontWeight: "600", textTransform: "uppercase", fontSize: "11px" }}>Prioridade Integrada</span>
          <strong className="score">{foco.score ?? "—"}<small> / 100</small></strong>
        </div>

        {foco.potencial_voto !== undefined && (
          <div className="score-breakdown">
            <div className="score-item">
              <div className="score-item-header">
                <span>Potencial de Voto</span>
                <strong>{foco.potencial_voto}</strong>
              </div>
              <div className="score-bar">
                <i style={{ width: `${Math.min(foco.potencial_voto, 100)}%` }} />
              </div>
            </div>
            <div className="score-item">
              <div className="score-item-header">
                <span>Competitividade Hondt</span>
                <strong>{foco.competitividade}</strong>
              </div>
              <div className="score-bar">
                <i style={{ width: `${Math.min(foco.competitividade, 100)}%` }} />
              </div>
            </div>
          </div>
        )}
        <p className="muted" style={{ fontSize: "10.5px", margin: "4px 0 0" }}>
          Fórmula: (Potencial × Competitividade Hondt) ÷ (Custo Logístico)^0.65
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
  const [fundo, setFundo] = useState("ruas");
  const [recentralizar, setRecentralizar] = useState(0);

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
    zona: "Zonamento da margem apurada em 2022 com limiares estratégicos configuráveis.",
    margem: "Gradiente contínuo: azul/verde para vantagem do partido, vermelho para vantagem da oposição.",
    score: "Prioridade integrada: ponderação de potencial de votos, disputa Hondt e acessibilidade logística.",
    custo: "Classificação logística de acesso para deslocamento de brigadas e comícios.",
  }[camada];

  return (
    <main className="page">
      <Aviso>{territorio.erro}</Aviso>

      <BriefingDia linhas={linhas} onEscolher={setSelecionado} />

      <section className="kpis" aria-label="Indicadores nacionais">
        <Kpi rotulo="Eleitorado 2022" valor={fmtInt(soma("eleitores_cne"))} selo="OFICIAL" carregando={aCarregar} />
        <Kpi rotulo="População Total" valor={fmtInt(soma("populacao_total"))} selo="ESTIMADO" carregando={aCarregar} />
        <article className="kpi kpi-bastiao">
          <span>Bastiões <Selo tipo="OFICIAL" /></span>
          <strong className={aCarregar ? "skeleton" : ""}>{aCarregar ? "\u00a0" : contagem.BASTIAO || 0}</strong>
        </article>
        <article className="kpi kpi-batalha">
          <span>Em Disputa <Selo tipo="OFICIAL" /></span>
          <strong className={aCarregar ? "skeleton" : ""}>{aCarregar ? "\u00a0" : contagem.CAMPO_BATALHA || 0}</strong>
        </article>
        <article className="kpi kpi-oposicao">
          <span>Oposição <Selo tipo="OFICIAL" /></span>
          <strong className={aCarregar ? "skeleton" : ""}>{aCarregar ? "\u00a0" : contagem.OPOSICAO || 0}</strong>
        </article>
      </section>

      <section className="controlos" aria-label="Parâmetros do zonamento">
        <label>
          Malha Territorial
          <select value={versao} onChange={(e) => { setVersao(e.target.value); setSelecionado(null); }}>
            <option value="DPA_2016_18P">DPA 2016 · 18 Províncias (Eleições 2022 CNE)</option>
            <option value="DPA_2024_21P">DPA 2024 · 21 Províncias (Planeamento 2027)</option>
          </select>
        </label>
        <label>
          Plano Comercial
          <select value={plano} onChange={(e) => setPlano(e.target.value)}>
            <option value="NACIONAL">Nacional · 21 Províncias Irrestrito</option>
            <option value="PROVINCIAL">Provincial · Círculo Único</option>
            <option value="MUNICIPAL">Municipal · 1 Município</option>
          </select>
        </label>
        <label>
          Limiar Bastião (≥ % margem)
          <input type="number" value={bastiao} onChange={(e) => setBastiao(Number(e.target.value))} />
        </label>
        <label>
          Limiar Oposição (≤ % margem)
          <input type="number" value={oposicao} onChange={(e) => setOposicao(Number(e.target.value))} />
        </label>
      </section>

      <section className="palco">
        <Cartao
          className="map-card"
          titulo="Mapa Estratégico de Angola"
          nota={notaCamada}
          acao={
            <div className="legenda-zonas" aria-label="Legenda de zonas">
              <span><i className="ponto bastiao" /> Bastião</span>
              <span><i className="ponto batalha" /> Disputa</span>
              <span><i className="ponto oposicao" /> Oposição</span>
            </div>
          }
        >
          <div className="mapa-toolbar-wrapper">
            <div className="mapa-toolbar-seccao">
              <span>Camadas</span>
              <div className="btn-group">
                {CAMADAS.map(([id, rotulo, Icone]) => (
                  <button
                    key={id}
                    type="button"
                    className={camada === id ? "activa" : ""}
                    onClick={() => setCamada(id)}
                    style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
                  >
                    <Icone size={13} />
                    {rotulo}
                  </button>
                ))}
              </div>
            </div>

            <div className="mapa-toolbar-seccao">
              <span>Fundo</span>
              <div className="btn-group">
                {FUNDOS_OPCOES.map(([id, rotulo, Icone]) => (
                  <button
                    key={id}
                    type="button"
                    className={fundo === id ? "activa" : ""}
                    onClick={() => setFundo(id)}
                    style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
                  >
                    <Icone size={13} />
                    {rotulo}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="ghost"
              onClick={() => {
                setSelecionado(null);
                setRecentralizar((c) => c + 1);
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <IconeCentrar size={14} /> Centrar Angola
            </button>
          </div>

          <MapaTerritorio
            features={featuresActivas}
            contorno={dados.contorno}
            onSelect={setSelecionado}
            selecionado={selecionado?.nome}
            camada={camada}
            filtro={filtroZona}
            fundo={fundo}
            carregando={aCarregar}
            resetTrigger={recentralizar}
          />
        </Cartao>

        <Cartao className="lateral" titulo="Diagnóstico Territorial">
          <PainelTerritorio foco={foco} />

          <div className="row" style={{ marginTop: "10px", marginBottom: "4px" }}>
            <label className="cresce">
              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <IconePesquisa size={12} /> Filtrar por nome
              </span>
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Huambo, Luanda, Benguela…" />
            </label>
            <label>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <IconeFiltro size={12} /> Zona
              </span>
              <select value={filtroZona} onChange={(e) => setFiltroZona(e.target.value)}>
                <option value="">Todas</option>
                <option value="BASTIAO">Bastião</option>
                <option value="CAMPO_BATALHA">Disputa</option>
                <option value="OPOSICAO">Oposição</option>
              </select>
            </label>
          </div>

          <div className="table-responsive">
            <table>
              <caption className="sr-only">Territórios ordenados por prioridade</caption>
              <thead>
                <tr>
                  <th>Território</th>
                  <th>Zona</th>
                  <th>Dep.</th>
                  <th>Acesso</th>
                  <th className="num">Score</th>
                </tr>
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
                      <td><strong>{row.nome}</strong></td>
                      <td><span className={`zona ${row.zonamento_activo}`}>{rotuloZona(row.zonamento_activo)}</span></td>
                      <td>
                        {c ? (
                          <span style={{ fontSize: "11px", fontWeight: "600" }}>
                            <span style={{ color: "var(--mpla)" }}>{c[0]}</span>–<span style={{ color: "var(--unita)" }}>{c[1]}</span>
                          </span>
                        ) : "—"}
                      </td>
                      <td>
                        <span className={`badge badge-${(row.custo_logistico_dificuldade || "media").toLowerCase()}`}>
                          {row.custo_logistico_fator ? `${row.custo_logistico_fator}×` : "1×"}
                        </span>
                      </td>
                      <td className="num">
                        <strong style={{ color: "var(--accent)" }}>{row.score}</strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Cartao>
      </section>

      <Cartao
        titulo="Evolução da Campanha Nacional (2012–2022)"
        nota="Série histórica oficial CNE: votos válidos, abstenção e assentos na Assembleia Nacional (220 deputados)."
        acao={
          <div className="legend" aria-hidden="true">
            <span><i className="swatch mpla" /> MPLA</span>
            <span><i className="swatch unita" /> UNITA</span>
            <span><i className="swatch abs" /> Abstenção</span>
            <Selo tipo="OFICIAL" />
          </div>
        }
      >
        <div className="trend-pills">
          <div className="trend-pill down">
            <span>MPLA (2012–22): 71,8% → 51,2% (-20,6 p.p.)</span>
          </div>
          <div className="trend-pill up">
            <span>UNITA (2012–22): 18,7% → 44,0% (+25,3 p.p.)</span>
          </div>
          <div className="trend-pill neutral">
            <span>Abstenção recorde em 2022: 55,2% (7,9 milhões de ausências)</span>
          </div>
        </div>

        <GraficoSerie pontos={pontos} />

        <div className="table-responsive">
          <table>
            <caption className="sr-only">Resultados nacionais por eleição</caption>
            <thead>
              <tr>
                <th>Ano</th>
                <th className="num">Inscritos</th>
                <th className="num">Votantes</th>
                <th className="num">Abstenção</th>
                <th className="num">MPLA</th>
                <th className="num">UNITA</th>
                <th className="num">Deputados AN</th>
              </tr>
            </thead>
            <tbody>
              {pontos.map((p) => (
                <tr key={p.ano}>
                  <td><strong>{p.ano}</strong></td>
                  <td className="num">{fmtInt(p.inscritos)}</td>
                  <td className="num">{fmtInt(p.votantes)}</td>
                  <td className="num">{fmtPct(p.abstencao)}</td>
                  <td className="num" style={{ color: "var(--mpla)", fontWeight: "600" }}>{fmtPct(p.mpla)}</td>
                  <td className="num" style={{ color: "var(--unita)", fontWeight: "600" }}>{fmtPct(p.unita)}</td>
                  <td className="num">
                    <strong>{p.depMpla}</strong> <small className="muted">MPLA</small> / <strong>{p.depUnita}</strong> <small className="muted">UNITA</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <details className="lacunas">
          <summary>Critérios de Proveniência & Lacunas de Dados Históricos</summary>
          <p className="muted" style={{ marginTop: "6px" }}>{(dados.serie?.serie?.lacunas || []).join(" ")}</p>
        </details>
      </Cartao>
    </main>
  );
}
