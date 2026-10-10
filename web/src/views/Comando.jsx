import React, { useEffect, useMemo, useState } from "react";
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
import { PUBLICOS, fraseLado } from "../campanha.js";
import { useCampo } from "../hooks/useCampo.js";
import { useLeitura } from "../hooks/useLeitura.js";
import { useMalhaLocal, useMalhaMunicipios } from "../hooks/useDadosBase.js";
import { classificar, fmtInt, fmtPct, priorizar, rotuloZona, serieParaGrafico, tracarEstrategia } from "../territorio.js";

const CHAVE_ZONAS = "warroom_zonas_analista";
const ZONAS_ANALISTA = [
  ["BASTIAO", "Bastião"],
  ["CAMPO_BATALHA", "Disputa"],
  ["OPOSICAO", "Oposição"],
];

function lerAjustes() {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE_ZONAS) || "{}");
    return bruto && typeof bruto === "object" ? bruto : {};
  } catch {
    return {};
  }
}

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

function PainelTerritorio({ foco, aoAbrirMunicipio, onDecidir, onNota }) {
  if (!foco) return <p className="vazio">Escolha um território no mapa ou na tabela.</p>;
  if (foco.proveniencia_votos === "AUSENTE") {
    const seloGeom = foco.nivel === "bairro" ? "OSM" : "OFICIAL";
    return (
      <div className="detalhe">
        <div className="detalhe-topo">
          <div>
            <span className="eyebrow">{foco.provincia || "Angola"} · {foco.municipio || foco.nivel}</span>
            <h2>{foco.nome}</h2>
          </div>
          <Selo tipo={seloGeom} />
        </div>
        <p>Sem apuramento da CNE neste nível. A disputa de bairro vê-se no mapa; o voto deste sítio não foi publicado.</p>
        {foco.margem_circulo_perc != null && (
          <p>
            O círculo provincial de <strong>{foco.provincia}</strong> teve margem {fmtPct(foco.margem_circulo_perc)} em 2022.
            Esse número é da província inteira.
          </p>
        )}
        {foco.nivel === "municipio" && (
          <button className="primary" type="button" onClick={() => aoAbrirMunicipio(foco.nome)}>
            Ver comunas e bairros
          </button>
        )}
      </div>
    );
  }
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

        {foco.potencial_voto != null && (
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
                <strong>{foco.competitividade ?? "—"}</strong>
              </div>
              <div className="score-bar">
                <i style={{ width: `${Math.min(foco.competitividade || 0, 100)}%` }} />
              </div>
            </div>
          </div>
        )}
        <p className="muted" style={{ fontSize: "10.5px", margin: "4px 0 0" }}>
          {foco.formula_prioridade || "Fórmula: (Potencial × Competitividade Hondt) ÷ 100 ÷ (Custo Logístico)^0.65"}
          {foco.proveniencia_prioridade ? " " : ""}
          {foco.proveniencia_prioridade && <Selo tipo={foco.proveniencia_prioridade} />}
        </p>
        {Array.isArray(foco.componentes_ausentes) && foco.componentes_ausentes.length > 0 && (
          <p className="muted" style={{ fontSize: "10.5px", margin: "4px 0 0" }}>
            Em falta: {foco.componentes_ausentes.join(", ")}. Esses termos não entram no score.
          </p>
        )}
      </div>

      <DecisaoAnalista foco={foco} onDecidir={onDecidir} onNota={onNota} />
    </div>
  );
}

function DecisaoAnalista({ foco, onDecidir, onNota }) {
  const [campo] = useCampo();
  const { leitura } = useLeitura();
  const plano = tracarEstrategia(foco);
  if (!plano) return null;
  const registosAqui = campo.registos.filter(
    (r) => (r.provincia || "").toLowerCase() === (foco.nome || "").toLowerCase(),
  );
  return (
    <>
      <div className="bloco">
        <span style={{ fontSize: "12px", fontWeight: "600" }}>Zona de operação</span>
        <p className="muted" style={{ fontSize: "11.5px", margin: "4px 0 8px" }}>
          A fórmula lê a margem de 2022. A decisão do analista muda onde a campanha disputa e não altera o apuramento.
          {foco.decisao_analista
            ? ` Fórmula: ${rotuloZona(foco.zonamento_formula)}. Operação: ${rotuloZona(foco.zonamento_activo)}.`
            : ` Em vigor: ${rotuloZona(foco.zonamento_activo)}, pela fórmula.`}
        </p>
        <div className="zona-escolha">
          {ZONAS_ANALISTA.map(([id, rotulo]) => (
            <button
              key={id}
              type="button"
              className={`ghost${foco.decisao_analista && foco.zonamento_activo === id ? " activa" : ""}`}
              onClick={() => onDecidir(id)}
            >
              {rotulo}
            </button>
          ))}
          {foco.decisao_analista && (
            <button type="button" className="ghost" onClick={() => onDecidir(null)}>
              Usar a fórmula
            </button>
          )}
        </div>
        {foco.decisao_analista && (
          <label className="nota-analista">
            Nota da decisão
            <textarea
              rows={2}
              value={foco.nota_analista || ""}
              placeholder="Porque esta zona muda a operação"
              onChange={(e) => onNota(e.target.value)}
            />
          </label>
        )}
      </div>

      <div className="bloco">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" }}>
          <span style={{ fontSize: "12px", fontWeight: "600" }}>Estratégia · {plano.titulo}</span>
          <Selo tipo={foco.decisao_analista ? "RASCUNHO" : "OFICIAL"} />
        </div>
        <p className="muted" style={{ fontSize: "12px", margin: "6px 0 0" }}>
          {fraseLado(campo)} O plano usa a margem publicada neste círculo, seja qual for o cliente.
        </p>
        <ol className="estrategia">
          {plano.movimentos.map((passo) => (
            <li key={passo.fase}>
              <strong>{passo.fase}</strong>
              <span>{passo.acao}</span>
            </li>
          ))}
          <li>
            <strong>Públicos</strong>
            <span>{PUBLICOS.map((p) => `${p.nome} (${p.canal})`).join(" · ")}</span>
          </li>
          {registosAqui.length > 0 && (
            <li>
              <strong>Redes</strong>
              <span>{registosAqui.slice(0, 2).map((r) => `${r.canal}: ${r.texto}`).join(" ")}</span>
            </li>
          )}
          {leitura?.temas?.[0] && (
            <li>
              <strong>Semana</strong>
              <span>
                Nas manchetes públicas, o tema mais citado é {leitura.temas[0].nome.toLowerCase()} ({leitura.temas[0].manchetes}).
              </span>
            </li>
          )}
        </ol>
        <button type="button" className="ghost" style={{ marginTop: "8px" }} onClick={() => { window.location.hash = "redes"; }}>
          Abrir redes e o lado da sala
        </button>
      </div>
    </>
  );
}

export default function Comando({ dados, territorio, plano, setPlano, versao, setVersao, pedidoEscala }) {
  const [bastiao, setBastiao] = useState(15);
  const [oposicao, setOposicao] = useState(-15);
  const [selecionado, setSelecionado] = useState(null);
  const [camada, setCamada] = useState("zona");
  const [filtroZona, setFiltroZona] = useState("");
  const [busca, setBusca] = useState("");
  const [fundo, setFundo] = useState("ruas");
  const [recentralizar, setRecentralizar] = useState(0);
  const [escala, setEscala] = useState("provincias");
  const [municipioAberto, setMunicipioAberto] = useState("");
  const [ajustes, setAjustes] = useState(lerAjustes);

  function gravarAjustes(seguinte) {
    setAjustes(seguinte);
    localStorage.setItem(CHAVE_ZONAS, JSON.stringify(seguinte));
  }

  function decidirZona(nome, zona) {
    const seguinte = { ...ajustes };
    if (!zona) delete seguinte[nome];
    else seguinte[nome] = { zona, nota: ajustes[nome]?.nota || "", em: new Date().toISOString() };
    gravarAjustes(seguinte);
  }

  function notarZona(nome, nota) {
    if (!ajustes[nome]) return;
    gravarAjustes({ ...ajustes, [nome]: { ...ajustes[nome], nota } });
  }

  useEffect(() => {
    if (!pedidoEscala) return;
    setEscala(pedidoEscala);
    setMunicipioAberto("");
    setSelecionado(null);
  }, [pedidoEscala]);

  const linhas = useMemo(() => {
    const marcadas = territorio.features.map((f) => {
      const props = f.properties || {};
      const formula = classificar(props.margem_apurada_perc, bastiao, oposicao);
      const ajuste = ajustes[props.nome];
      return {
        ...props,
        zonamento_formula: formula,
        zonamento_activo: ajuste?.zona || formula,
        decisao_analista: Boolean(ajuste?.zona),
        nota_analista: ajuste?.nota || "",
      };
    });
    return priorizar(marcadas, PESOS_PADRAO);
  }, [territorio.features, bastiao, oposicao, ajustes]);

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

  const verMunicipios = escala !== "provincias";
  const malhaMunicipios = useMalhaMunicipios(verMunicipios);
  const malhaLocal = useMalhaLocal(escala === "local" ? municipioAberto : "");

  function abrirMunicipio(nome) {
    setMunicipioAberto(nome);
    setEscala("local");
    setSelecionado(null);
    setBusca("");
  }

  const featuresMapa = useMemo(() => {
    if (escala === "municipios") return malhaMunicipios.features;
    if (escala === "local") return [...malhaLocal.comunas, ...malhaLocal.bairros];
    return featuresActivas;
  }, [escala, featuresActivas, malhaMunicipios.features, malhaLocal.comunas, malhaLocal.bairros]);

  const linhasLocais = useMemo(() => {
    return featuresMapa.map((f) => f.properties || {}).filter((p) => p.nome);
  }, [featuresMapa]);

  const visiveis = useMemo(() => {
    const base = escala === "provincias" ? linhas : linhasLocais;
    const q = busca.trim().toLowerCase();
    return base.filter((row) => {
      if (escala === "provincias" && filtroZona && row.zonamento_activo !== filtroZona) return false;
      if (q && !(row.nome || "").toLowerCase().includes(q) && !(row.provincia || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [linhas, linhasLocais, escala, filtroZona, busca]);

  const pontos = serieParaGrafico(dados.serie?.serie?.eleicoes);
  const soma = (campo) => linhas.reduce((s, r) => s + (Number(r[campo]) || 0), 0);
  const contagem = linhas.reduce((acc, r) => ({ ...acc, [r.zonamento_activo]: (acc[r.zonamento_activo] || 0) + 1 }), {});
  const foco = selecionado
    ? (escala === "provincias" ? linhas : linhasLocais).find((l) => l.nome === selecionado.nome) || selecionado
    : visiveis[0] || (escala === "provincias" ? linhas[0] : linhasLocais[0]);
  const aCarregar = territorio.carregando || (verMunicipios && malhaMunicipios.carregando) || (escala === "local" && malhaLocal.carregando);
  const notaMalha = escala === "local" ? malhaLocal.nota : malhaMunicipios.nota;

  const notaCamada = {
    zona: "A cor segue a margem de 2022, salvo quando o analista fixa a zona de operação.",
    margem: "Gradiente contínuo: azul/verde para vantagem do partido, vermelho para vantagem da oposição.",
    score: "Prioridade: (potencial × competitividade) ÷ 100 ÷ custo^0,65. Sem abstenção ou juventude, esses termos saem.",
    custo: "Classificação logística de acesso para deslocamento de brigadas e comícios.",
  }[camada];

  return (
    <main className="page">
      <Aviso>{territorio.erro || malhaMunicipios.erro || malhaLocal.erro}</Aviso>
      {escala !== "provincias" && notaMalha && <p className="nota-malha">{notaMalha}</p>}

      <BriefingDia linhas={linhas} onEscolher={setSelecionado} />

      {escala === "provincias" && (
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
      )}

      {escala === "provincias" && (
      <Cartao
        titulo="Frentes de disputa"
        nota="Círculos em conflito depois dos limiares e das decisões do analista. A margem continua a ser a da CNE em 2022."
      >
        <ul className="plano-lista">
          {linhas.filter((r) => r.zonamento_activo === "CAMPO_BATALHA").slice(0, 6).map((row) => (
            <li key={row.nome}>
              <button type="button" className="plano-item" onClick={() => setSelecionado(row)}>
                <strong>{row.nome}</strong>
                <span>{tracarEstrategia(row)?.titulo} · margem {fmtPct(row.margem_apurada_perc)}</span>
                {row.decisao_analista && <em>decisão</em>}
              </button>
            </li>
          ))}
        </ul>
        {linhas.every((r) => r.zonamento_activo !== "CAMPO_BATALHA") && (
          <p className="muted">Nenhum círculo está em disputa com estes limiares.</p>
        )}
      </Cartao>
      )}

      {escala === "provincias" && (
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
      )}

      <section className="palco">
        <Cartao
          className="map-card"
          titulo={escala === "local" ? `Comunas e bairros · ${municipioAberto}` : escala === "municipios" ? "Municípios" : "Mapa Estratégico de Angola"}
          nota={escala === "provincias" ? notaCamada : "Geometria para a operação. A cor distingue vizinhos; não é a margem de 2022."}
          acao={
            escala === "provincias" ? (
            <div className="legenda-zonas" aria-label="Legenda de zonas">
              <span><i className="ponto bastiao" /> Bastião</span>
              <span><i className="ponto batalha" /> Disputa</span>
              <span><i className="ponto oposicao" /> Oposição</span>
            </div>
            ) : (
              <Selo tipo={escala === "local" ? "OSM" : "OFICIAL"} />
            )
          }
        >
          <div className="mapa-toolbar-wrapper">
            <div className="mapa-toolbar-seccao">
              <span>Escala</span>
              <div className="btn-group">
                <button type="button" className={escala === "provincias" ? "activa" : ""} onClick={() => { setEscala("provincias"); setMunicipioAberto(""); setSelecionado(null); }}>
                  Províncias
                </button>
                <button type="button" className={escala === "municipios" ? "activa" : ""} onClick={() => { setEscala("municipios"); setMunicipioAberto(""); setSelecionado(null); }}>
                  Municípios
                </button>
                {escala === "local" && (
                  <button type="button" className="activa" onClick={() => { setEscala("municipios"); setSelecionado(null); }}>
                    Voltar · {municipioAberto}
                  </button>
                )}
              </div>
            </div>

            {escala === "provincias" && (
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
            )}

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
            features={featuresMapa}
            contorno={escala === "provincias" ? dados.contorno : null}
            onSelect={(props) => {
              if (escala === "municipios" && props?.nivel === "municipio") abrirMunicipio(props.nome);
              else setSelecionado(props);
            }}
            selecionado={selecionado?.nome}
            camada={camada}
            filtro={escala === "provincias" ? filtroZona : ""}
            fundo={fundo}
            carregando={aCarregar}
            resetTrigger={recentralizar}
            tetoZoom={escala === "local" ? 15 : escala === "municipios" ? 11 : 8}
          />
        </Cartao>

        <Cartao className="lateral" titulo="Diagnóstico Territorial">
          <PainelTerritorio
            foco={foco}
            aoAbrirMunicipio={abrirMunicipio}
            onDecidir={(zona) => foco?.nome && decidirZona(foco.nome, zona)}
            onNota={(nota) => foco?.nome && notarZona(foco.nome, nota)}
          />

          <div className="row" style={{ marginTop: "10px", marginBottom: "4px" }}>
            <label className="cresce">
              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <IconePesquisa size={12} /> Filtrar por nome
              </span>
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Huambo, Luanda, Benguela…" />
            </label>
            {escala === "provincias" && (
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
            )}
          </div>

          <div className="table-responsive">
            <table>
              <caption className="sr-only">Territórios ordenados por prioridade</caption>
              <thead>
                <tr>
                  {escala === "provincias" ? (
                    <>
                      <th>Território</th>
                      <th>Zona</th>
                      <th>Dep.</th>
                      <th>Acesso</th>
                      <th className="num">Score</th>
                    </>
                  ) : (
                    <>
                      <th>Nome</th>
                      <th>Nível</th>
                      <th>Província</th>
                      <th className="num">Círculo 2022</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {visiveis.slice(0, 16).map((row, indice) => {
                  if (escala !== "provincias") {
                    return (
                      <tr
                        key={`${row.nivel}-${row.nome}-${indice}`}
                        className={foco?.nome === row.nome ? "activa" : ""}
                        onClick={() => (row.nivel === "municipio" ? abrirMunicipio(row.nome) : setSelecionado(row))}
                      >
                        <td><strong>{row.nome}</strong></td>
                        <td>{row.nivel}</td>
                        <td>{row.provincia || "—"}</td>
                        <td className="num">{fmtPct(row.margem_circulo_perc)}</td>
                      </tr>
                    );
                  }
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
                      <td>
                        <span className={`zona ${row.zonamento_activo}`}>{rotuloZona(row.zonamento_activo)}</span>
                        {row.decisao_analista && <em className="marca-decisao">decisão</em>}
                      </td>
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
