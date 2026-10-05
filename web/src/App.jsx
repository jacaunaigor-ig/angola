import { useEffect, useMemo, useState } from "react";
import { api, getToken, setToken } from "./api.js";
import MapaTerritorio from "./Mapa.jsx";
import { classificar, fmtInt, fmtPct, priorizar, rotuloZona, serieParaGrafico } from "./territorio.js";

const ABAS = [
  ["comando", "Comando", "Prioridade territorial"],
  ["hondt", "Hondt", "Círculos provinciais"],
  ["planos", "Planos", "Contratação"],
  ["discurso", "Discursos", "Revisão humana"],
  ["diad", "Dia D", "Apuramento"],
  ["eleitor", "Eleitor", "WhatsApp"],
];

function GraficoSerie({ pontos }) {
  if (!pontos.length) return null;
  const width = 640;
  const height = 220;
  const pad = 28;
  const anos = pontos.map((p) => p.ano);
  const x = (i) => pad + (i * (width - pad * 2)) / Math.max(anos.length - 1, 1);
  const y = (v) => height - pad - (Number(v) / 100) * (height - pad * 2);
  const linha = (chave) => pontos.map((p, i) => `${x(i)},${y(p[chave])}`).join(" ");
  return (
    <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Série nacional 2012 a 2022">
      {[0, 25, 50, 75, 100].map((tick) => (
        <text key={tick} x="4" y={y(tick) + 4} fill="#93a4bd" fontSize="11">{tick}</text>
      ))}
      <polyline fill="none" stroke="#3d8fd1" strokeWidth="2.5" points={linha("mpla")} />
      <polyline fill="none" stroke="#e08a3c" strokeWidth="2.5" points={linha("unita")} />
      <polyline fill="none" stroke="#a8b0bb" strokeWidth="2" strokeDasharray="5 4" points={linha("abstencao")} />
      {pontos.map((p, i) => (
        <text key={p.ano} x={x(i)} y={height - 6} textAnchor="middle" fill="#e8eef8" fontSize="12">{p.ano}</text>
      ))}
    </svg>
  );
}

export default function App() {
  const [aba, setAba] = useState("comando");
  const [plano, setPlano] = useState("NACIONAL");
  const [versao, setVersao] = useState("DPA_2016_18P");
  const [bastiao, setBastiao] = useState(15);
  const [oposicao, setOposicao] = useState(-15);
  const [pesos, setPesos] = useState({ disputa: 4, volume: 3, abstencao: 3, jovens: 2 });
  const [unidades, setUnidades] = useState([]);
  const [features, setFeatures] = useState([]);
  const [contorno, setContorno] = useState(null);
  const [serie, setSerie] = useState(null);
  const [planos, setPlanos] = useState([]);
  const [erro, setErro] = useState("");
  const [selecionado, setSelecionado] = useState(null);
  const [tokenOn, setTokenOn] = useState(Boolean(getToken()));
  const [login, setLogin] = useState({ campanha_id: "", email: "", senha: "" });
  const [proposta, setProposta] = useState({ organizacao: "", contacto: "", email: "", telefone: "", notas: "" });
  const [protocolo, setProtocolo] = useState("");
  const [discurso, setDiscurso] = useState(null);
  const [municipio, setMunicipio] = useState("Luanda");
  const [apuramento, setApuramento] = useState(null);
  const [avisoAuth, setAvisoAuth] = useState("");
  const [queixas, setQueixas] = useState(null);
  const [textoEleitor, setTextoEleitor] = useState("MESA Talatona");
  const [respostaEleitor, setRespostaEleitor] = useState("");

  // Estados específicos para Simulação de Hondt
  const [hondtGeral, setHondtGeral] = useState(null);
  const [provinciaHondt, setProvinciaHondt] = useState("Huambo");
  const [choqueA, setChoqueA] = useState(0.0);
  const [choqueB, setChoqueB] = useState(0.0);
  const [simulacaoHondt, setSimulacaoHondt] = useState(null);
  const [carregandoSimulacao, setCarregandoSimulacao] = useState(false);

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      setErro("");
      try {
        const [hist, catalogo, hondt, limite] = await Promise.all([
          api("/api/eleicoes/serie-historica"),
          api("/api/planos"),
          api("/api/eleicoes/hondt-provincias").catch(() => null),
          api("/api/territorio/contorno-nacional").catch(() => null),
        ]);
        if (cancelado) return;
        setSerie(hist);
        setPlanos(catalogo.planos || []);
        if (hondt) setHondtGeral(hondt);
        if (limite?.type === "FeatureCollection") setContorno(limite);

        try {
          const geo = await api(`/api/territorio/unidades?versao=${versao}&formato=geojson&plano=${plano}`, { plano });
          if (cancelado) return;
          setFeatures(geo.features || []);
          setUnidades((geo.features || []).map((f) => f.properties || {}));
        } catch (exc) {
          if (!cancelado) {
            setFeatures([]);
            setUnidades([]);
            setErro(exc.status === 402 ? "A malha de 2016 no plano municipal exige upgrade. Use DPA 2024 ou um plano provincial." : exc.message);
          }
        }
      } catch (exc) {
        if (!cancelado) setErro(exc.message || "API indisponível.");
      }
    }
    carregar();
    return () => { cancelado = true; };
  }, [plano, versao]);

  // Efeito para rodar a simulação de Hondt sempre que a província ou choques mudarem
  useEffect(() => {
    let ativo = true;
    async function simular() {
      setCarregandoSimulacao(true);
      try {
        const resp = await api("/api/eleicoes/hondt-simulador", {
          method: "POST",
          body: {
            provincia: provinciaHondt,
            variacao_a_perc: Number(choqueA) || 0.0,
            variacao_b_perc: Number(choqueB) || 0.0,
            nome_partido_a: "MPLA",
            nome_partido_b: "UNITA",
            assentos: 5,
          },
        });
        if (ativo) setSimulacaoHondt(resp);
      } catch (err) {
        console.warn("Falha no simulador Hondt:", err);
      } finally {
        if (ativo) setCarregandoSimulacao(false);
      }
    }
    simular();
    return () => { ativo = false; };
  }, [provinciaHondt, choqueA, choqueB]);

  const linhas = useMemo(() => {
    const marcadas = unidades.map((u) => ({
      ...u,
      zonamento_activo: classificar(u.margem_apurada_perc, bastiao, oposicao),
    }));
    return priorizar(marcadas, pesos);
  }, [unidades, bastiao, oposicao, pesos]);

  const featuresActivas = useMemo(() => {
    const porNome = new Map(linhas.map((l) => [l.nome, l.zonamento_activo]));
    return features.map((f) => ({
      ...f,
      properties: {
        ...f.properties,
        zonamento_activo: porNome.get(f.properties?.nome) || f.properties?.zonamento,
      },
    }));
  }, [features, linhas]);

  const pontos = serieParaGrafico(serie?.serie?.eleicoes);
  const eleitores = linhas.reduce((s, r) => s + (Number(r.eleitores_cne) || 0), 0);
  const populacao = linhas.reduce((s, r) => s + (Number(r.populacao_total) || 0), 0);
  const contagem = linhas.reduce((acc, r) => {
    acc[r.zonamento_activo] = (acc[r.zonamento_activo] || 0) + 1;
    return acc;
  }, {});
  const foco = selecionado
    ? linhas.find((l) => l.nome === selecionado.nome) || selecionado
    : linhas[0];

  async function entrar(event) {
    event.preventDefault();
    setAvisoAuth("");
    try {
      const data = await api("/api/auth/token", { method: "POST", body: login });
      setToken(data.access_token);
      setTokenOn(true);
    } catch (exc) {
      setAvisoAuth(exc.message);
    }
  }

  function sair() {
    setToken("");
    setTokenOn(false);
    setDiscurso(null);
    setApuramento(null);
  }

  async function pedirProposta(event) {
    event.preventDefault();
    setProtocolo("");
    setAvisoAuth("");
    try {
      const data = await api("/api/propostas", {
        method: "POST",
        plano,
        body: { ...proposta, plano },
      });
      setProtocolo(data.pedido?.protocolo || data.protocolo || "registado");
    } catch (exc) {
      setAvisoAuth(exc.message);
    }
  }

  async function gerarDiscurso(event) {
    event.preventDefault();
    setAvisoAuth("");
    setDiscurso(null);
    try {
      const data = await api(`/api/discurso-territorializado/${encodeURIComponent(municipio)}`, { auth: true, plano });
      setDiscurso(data);
    } catch (exc) {
      setAvisoAuth(exc.status === 401 ? "Esta rota exige sessão de analista." : exc.message);
    }
  }

  async function reverDiscurso(status) {
    if (!discurso?.id) {
      setAvisoAuth("O rascunho heurístico ainda não tem id na base. Grave-o por POST /api/discursos/gerar com a sessão activa.");
      return;
    }
    try {
      const data = await api(`/api/discursos/${discurso.id}/status`, {
        method: "PATCH",
        auth: true,
        plano,
        body: { status, responsavel_revisao: "Comité", comentarios_revisao: "Revisão no war room React." },
      });
      setDiscurso(data);
    } catch (exc) {
      setAvisoAuth(exc.message);
    }
  }

  async function carregarQueixas() {
    setAvisoAuth("");
    try {
      const data = await api("/api/whatsapp/queixas");
      setQueixas(data);
    } catch (exc) {
      setAvisoAuth(exc.message);
    }
  }

  async function simularEleitor(event) {
    event.preventDefault();
    setAvisoAuth("");
    try {
      const data = await api("/api/whatsapp/simular", {
        method: "POST",
        body: { texto: textoEleitor, de: "244900000111" },
      });
      setRespostaEleitor(data.texto || "");
      await carregarQueixas();
    } catch (exc) {
      setAvisoAuth(exc.message);
    }
  }

  async function carregarDiaD() {
    setAvisoAuth("");
    try {
      const data = await api("/api/dia-d/apuramento-paralelo", { auth: true, plano });
      setApuramento(data);
    } catch (exc) {
      setApuramento(null);
      setAvisoAuth(exc.status === 402 ? "Dia D está fora do plano municipal." : exc.status === 401 ? "Inicie sessão para ler o apuramento." : exc.message);
    }
  }

  const abaActual = ABAS.find(([id]) => id === aba) || ABAS[0];

  return (
    <div className="shell">
      <aside className="rail">
        <div className="brand">
          <p className="eyebrow">Angola 2027</p>
          <strong>Sala de comando</strong>
        </div>
        <nav className="tabs">
          {ABAS.map(([id, nome, nota]) => (
            <button key={id} className={aba === id ? "active" : ""} onClick={() => setAba(id)}>
              <span>{nome}</span>
              <small>{nota}</small>
            </button>
          ))}
        </nav>
      </aside>
      <div className="workspace">
      <header className="top">
        <div>
          <p className="eyebrow">República de Angola · Pleito 2027</p>
          <h1>{abaActual[1]}</h1>
        </div>
        <p className="session">{tokenOn ? "Sessão activa" : "Sem sessão"}</p>
      </header>
      {erro && <div className="banner">Aviso da API: {erro}</div>}

      {/* ABA 1: COMANDO & PRIORIZAÇÃO */}
      {aba === "comando" && (
        <main className="page">
          <section className="kpis">
            <article className="kpi"><span>Eleitorado 2022</span><strong>{fmtInt(eleitores)}</strong></article>
            <article className="kpi"><span>População INE</span><strong>{fmtInt(populacao)}</strong></article>
            <article className="kpi"><span>Bastiões</span><strong>{contagem.BASTIAO || 0}</strong></article>
            <article className="kpi"><span>Em disputa</span><strong>{contagem.CAMPO_BATALHA || 0}</strong></article>
            <article className="kpi"><span>Oposição</span><strong>{contagem.OPOSICAO || 0}</strong></article>
          </section>

          <section className="row">
            <label>Malha Territorial
              <select value={versao} onChange={(e) => setVersao(e.target.value)}>
                <option value="DPA_2016_18P">DPA 2016 · 18 províncias (Base CNE 2022)</option>
                <option value="DPA_2024_21P">DPA 2024 · 21 províncias (Planeamento 2027)</option>
              </select>
            </label>
            <label>Plano Comercial
              <select value={plano} onChange={(e) => setPlano(e.target.value)}>
                <option value="NACIONAL">Nacional (21 Províncias)</option>
                <option value="PROVINCIAL">Provincial (1 Província)</option>
                <option value="MUNICIPAL">Municipal (1 Município)</option>
              </select>
            </label>
            <label>Limiar Bastião (Margem ≥ %)
              <input type="number" value={bastiao} onChange={(e) => setBastiao(Number(e.target.value))} />
            </label>
            <label>Limiar Oposição (Margem ≤ %)
              <input type="number" value={oposicao} onChange={(e) => setOposicao(Number(e.target.value))} />
            </label>
          </section>

          <section className="grid-2">
            <div className="card map-card">
              <div className="card-head">
                <h2>Território</h2>
                <p className="muted">Contorno geoBoundaries ADM0 · malha DPA por baixo</p>
              </div>
              <MapaTerritorio
                features={featuresActivas}
                contorno={contorno}
                onSelect={(props) => setSelecionado(props)}
              />
            </div>
            <div className="card">
              <h2>{foco?.nome || "Território"}</h2>
              {foco && (
                <>
                  <p className={`zona ${foco.zonamento_activo || foco.zonamento}`}>{rotuloZona(foco.zonamento_activo || foco.zonamento)}</p>
                  <p><strong>Margem 2022:</strong> {fmtPct(foco.margem_apurada_perc)}</p>
                  <p><strong>Eleitores Aptos:</strong> {fmtInt(foco.eleitores_cne)}</p>
                  <p><strong>Abstenção / Jovens:</strong> {fmtPct(foco.abstencao_perc)} / {fmtPct(foco.juventude_perc)}</p>
                  
                  {foco.custo_logistico_fator && (
                    <div style={{ margin: "10px 0" }}>
                      <strong>Custo Logístico de Alcance:</strong> {foco.custo_logistico_fator}x 
                      <span className={`badge badge-${foco.custo_logistico_dificuldade?.toLowerCase() || 'media'}`} style={{ marginLeft: 6 }}>
                        Acesso {foco.custo_logistico_dificuldade}
                      </span>
                      <br />
                      <span className="muted">{foco.custo_logistico_modal}: {foco.custo_logistico_descricao}</span>
                    </div>
                  )}

                  {foco.hondt_deputados && Object.keys(foco.hondt_deputados).length > 0 && (
                    <div style={{ margin: "10px 0" }}>
                      <strong>Distribuição de Deputados (Círculo de 5):</strong>
                      <div className="seats-display">
                        {Array.from({ length: foco.hondt_deputados["Nosso Partido"] || foco.hondt_deputados["MPLA"] || 0 }).map((_, i) => (
                          <span key={`a-${i}`} className="seat-circle seat-a" title="Partido A (MPLA)">A</span>
                        ))}
                        {Array.from({ length: foco.hondt_deputados["Oposição"] || foco.hondt_deputados["UNITA"] || 0 }).map((_, i) => (
                          <span key={`b-${i}`} className="seat-circle seat-b" title="Partido B (UNITA)">B</span>
                        ))}
                      </div>
                      {foco.hondt_votos_proxima_cadeira > 0 && (
                        <p className="muted">
                          Faltam <strong>{fmtInt(foco.hondt_votos_proxima_cadeira)}</strong> votos para virar a próxima cadeira.
                          <span className={`badge badge-${foco.hondt_volatilidade_cadeira?.toLowerCase() || 'media'}`} style={{ marginLeft: 6 }}>
                            Volatilidade {foco.hondt_volatilidade_cadeira}
                          </span>
                        </p>
                      )}
                    </div>
                  )}

                  <p><strong>Score de Prioridade Integrado:</strong> <span style={{ fontSize: "1.2em", color: "var(--accent)" }}>{foco.score ?? "—"} / 100</span></p>
                  <p className="muted" style={{ fontSize: "12px" }}>
                    {foco.formula_prioridade || "Fórmula: (Potencial de Voto × Competitividade Hondt) ÷ Custo Logístico de Alcance"}
                  </p>
                </>
              )}
              <table>
                <thead>
                  <tr><th>Território</th><th>Zona</th><th>Deputados</th><th>Custo Log.</th><th>Score</th></tr>
                </thead>
                <tbody>
                  {linhas.slice(0, 10).map((row) => (
                    <tr key={row.nome} style={{ cursor: "pointer" }} onClick={() => setSelecionado(row)}>
                      <td>{row.nome}</td>
                      <td className={`zona ${row.zonamento_activo}`}>{rotuloZona(row.zonamento_activo)}</td>
                      <td>
                        {row.hondt_deputados
                          ? `${row.hondt_deputados["Nosso Partido"] || row.hondt_deputados["MPLA"] || 0} - ${row.hondt_deputados["Oposição"] || row.hondt_deputados["UNITA"] || 0}`
                          : "—"}
                      </td>
                      <td>{row.custo_logistico_fator ? `${row.custo_logistico_fator}x` : "1.0x"}</td>
                      <td><strong>{row.score}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Série nacional 2012–2022</h2>
              <div className="legend">
                <span><i className="swatch mpla" /> MPLA</span>
                <span><i className="swatch unita" /> UNITA</span>
                <span><i className="swatch abs" /> Abstenção</span>
              </div>
            </div>
            <GraficoSerie pontos={pontos} />
            <table>
              <thead>
                <tr>
                  <th>Ano</th><th>Inscritos</th><th>Votantes</th><th>Abstenção</th><th>MPLA</th><th>UNITA</th><th>Deputados</th>
                </tr>
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
            <p className="muted">{(serie?.serie?.lacunas || []).join(" ")}</p>
          </section>
        </main>
      )}

      {/* ABA 2: SIMULADOR DE HONDT */}
      {aba === "hondt" && (
        <main className="page">
          <section className="card">
            <h2>Simulador do Método de Hondt (Círculos Provinciais de Angola)</h2>
            <p className="muted">
              Conforme a Lei Orgânica sobre as Eleições Gerais de Angola, cada província elege <strong>5 deputados</strong> pelo Método de Hondt.
              A eleição parlamentar e presidencial é decidida na <em>disputa da última cadeira</em> de cada círculo.
            </p>
            <div className="row" style={{ marginTop: 12 }}>
              <label>Selecione o Círculo Provincial
                <select value={provinciaHondt} onChange={(e) => setProvinciaHondt(e.target.value)}>
                  {["Luanda", "Huambo", "Benguela", "Huíla", "Cuanza Sul", "Bié", "Uíge", "Malanje", "Zaire", "Cunene", "Cabinda", "Lunda Norte", "Lunda Sul", "Moxico", "Cuando Cubango", "Namibe", "Bengo", "Cuanza Norte"].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label>Choque Votos Partido A (MPLA): {choqueA > 0 ? `+${choqueA}%` : `${choqueA}%`}
                <input type="range" min="-30" max="30" step="1" value={choqueA} onChange={(e) => setChoqueA(Number(e.target.value))} />
              </label>
              <label>Choque Votos Partido B (UNITA): {choqueB > 0 ? `+${choqueB}%` : `${choqueB}%`}
                <input type="range" min="-30" max="30" step="1" value={choqueB} onChange={(e) => setChoqueB(Number(e.target.value))} />
              </label>
              <button className="ghost" type="button" onClick={() => { setChoqueA(0); setChoqueB(0); }}>Redefinir Choques</button>
            </div>
          </section>

          {simulacaoHondt && simulacaoHondt.resultado && (
            <section className="grid-2">
              <div className="card">
                <h3>Projeção de Mandatos: {provinciaHondt} (5 Assentos)</h3>
                <div className="seats-display" style={{ margin: "16px 0" }}>
                  {Array.from({ length: simulacaoHondt.resultado.assentos?.MPLA || 0 }).map((_, i) => (
                    <span key={`sim-a-${i}`} className="seat-circle seat-a" style={{ width: 36, height: 36, fontSize: 14 }}>MPLA</span>
                  ))}
                  {Array.from({ length: simulacaoHondt.resultado.assentos?.UNITA || 0 }).map((_, i) => (
                    <span key={`sim-b-${i}`} className="seat-circle seat-b" style={{ width: 36, height: 36, fontSize: 14 }}>UNITA</span>
                  ))}
                </div>
                <p><strong>Resultado:</strong> {simulacaoHondt.resultado.resumo_verbal}</p>
                <p><strong>Quociente de Corte (Última Cadeira):</strong> <code>{fmtInt(simulacaoHondt.resultado.quociente_corte)}</code> (Levada por: {simulacaoHondt.resultado.ultimo_eleito})</p>
                
                <h4 style={{ marginTop: 16 }}>Análise da Disputa da Próxima Cadeira:</h4>
                {Object.entries(simulacaoHondt.resultado.disputa_proxima_cadeira || {}).map(([partido, info]) => (
                  <div key={partido} style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                    <strong>{partido}:</strong> {info.assentos} assentos.
                    {info.votos_para_proximo_assento > 0 ? (
                      <span> Precisa de <strong>+{fmtInt(info.votos_para_proximo_assento)}</strong> votos ({info.esforco_perc_validos}% dos válidos) para ganhar +1 deputado. 
                        <span className={`badge badge-${info.volatilidade_cadeira?.toLowerCase() || 'media'}`} style={{ marginLeft: 6 }}>
                          Volatilidade {info.volatilidade_cadeira}
                        </span>
                      </span>
                    ) : (
                      <span> Já conquistou a totalidade das vagas possíveis no cenário.</span>
                    )}
                    {info.folga_votos_manter_ultimo > 0 && (
                      <span className="muted" style={{ display: "block", fontSize: 12 }}>
                        Folga de segurança: pode perder até {fmtInt(info.folga_votos_manter_ultimo)} votos antes de ceder 1 deputado ao adversário.
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="card">
                <h3>Panorama Nacional dos 18 Círculos Provinciais (CNE 2022)</h3>
                <p className="muted">90 deputados provinciais distribuídos pelos 18 círculos.</p>
                {hondtGeral && (
                  <div className="kpis" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 12 }}>
                    <article className="kpi"><span>MPLA (Provincial)</span><strong>{hondtGeral.total_deputados_provinciais?.partido_a}</strong></article>
                    <article className="kpi"><span>UNITA (Provincial)</span><strong>{hondtGeral.total_deputados_provinciais?.partido_b}</strong></article>
                  </div>
                )}
                <table>
                  <thead>
                    <tr><th>Círculo</th><th>MPLA</th><th>UNITA</th><th>Corte (Q)</th><th>Virar Cadeira</th></tr>
                  </thead>
                  <tbody>
                    {(hondtGeral?.provincias || []).map((p) => {
                      const disp = p.disputa_proxima_cadeira?.MPLA || {};
                      return (
                        <tr key={p.provincia} style={{ cursor: "pointer" }} onClick={() => setProvinciaHondt(p.provincia)}>
                          <td><strong>{p.provincia}</strong></td>
                          <td><span className="seat-circle seat-a" style={{ display: "inline-flex", width: 20, height: 20, fontSize: 11 }}>{p.assentos?.MPLA || 0}</span></td>
                          <td><span className="seat-circle seat-b" style={{ display: "inline-flex", width: 20, height: 20, fontSize: 11 }}>{p.assentos?.UNITA || 0}</span></td>
                          <td>{fmtInt(p.quociente_corte)}</td>
                          <td>
                            {disp.votos_para_proximo_assento ? `+${fmtInt(disp.votos_para_proximo_assento)}` : "—"}
                            <span className={`badge badge-${disp.volatilidade_cadeira?.toLowerCase() || 'baixa'}`} style={{ marginLeft: 4 }}>
                              {disp.volatilidade_cadeira}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </main>
      )}

      {/* ABA 3: PLANOS */}
      {aba === "planos" && (
        <main className="page">
          <section className="plans">
            {planos.map((item) => (
              <article key={item.codigo} className="card plan">
                <h3>{item.nome}</h3>
                <p className="muted">{item.tagline}</p>
                <p className="price">{fmtInt(item.preco_tabela_aoa)} AOA</p>
                <p>{item.limites?.brigadistas} brigadistas · {item.limites?.contas_war_room} contas</p>
                <button className={plano === item.codigo ? "primary" : "ghost"} onClick={() => setPlano(item.codigo)}>Usar este plano</button>
              </article>
            ))}
          </section>
          <form className="card" onSubmit={pedirProposta}>
            <h2>Proposta Formal</h2>
            <div className="row">
              <label>Organização<input required value={proposta.organizacao} onChange={(e) => setProposta({ ...proposta, organizacao: e.target.value })} /></label>
              <label>Contacto<input required value={proposta.contacto} onChange={(e) => setProposta({ ...proposta, contacto: e.target.value })} /></label>
              <label>E-mail<input value={proposta.email} onChange={(e) => setProposta({ ...proposta, email: e.target.value })} /></label>
              <label>Telefone<input value={proposta.telefone} onChange={(e) => setProposta({ ...proposta, telefone: e.target.value })} /></label>
            </div>
            <label>Notas<textarea value={proposta.notas} onChange={(e) => setProposta({ ...proposta, notas: e.target.value })} /></label>
            <button className="primary" type="submit">Gerar protocolo · {plano}</button>
            {protocolo && <p className="ok">Protocolo {protocolo}</p>}
            {avisoAuth && <p className="banner">{avisoAuth}</p>}
          </form>
        </main>
      )}

      {/* ABA 4: DISCURSOS */}
      {aba === "discurso" && (
        <main className="page">
          <form className="card" onSubmit={entrar}>
            <h2>Sessão do War Room</h2>
            <p className="muted">Discursos e Dia D passam pelo JWT da campanha. Cartografia, Hondt e série histórica não exigem sessão.</p>
            <div className="row">
              <label>Campanha<input value={login.campanha_id} onChange={(e) => setLogin({ ...login, campanha_id: e.target.value })} placeholder="UUID" /></label>
              <label>E-mail<input value={login.email} onChange={(e) => setLogin({ ...login, email: e.target.value })} /></label>
              <label>Senha<input type="password" value={login.senha} onChange={(e) => setLogin({ ...login, senha: e.target.value })} /></label>
            </div>
            <div className="row">
              <button className="primary" type="submit">Entrar</button>
              <button className="ghost" type="button" onClick={sair}>Sair</button>
            </div>
          </form>
          <form className="card" onSubmit={gerarDiscurso}>
            <h2>Rascunho de Discurso por Município</h2>
            <div className="row">
              <label>Município<input value={municipio} onChange={(e) => setMunicipio(e.target.value)} /></label>
              <button className="primary" type="submit">Pedir rascunho à API</button>
            </div>
            {avisoAuth && <p className="banner">{avisoAuth}</p>}
            {discurso && (
              <div>
                <p>Estado: {discurso.status_aprovacao || discurso.status || "RASCUNHO"}</p>
                <p>{discurso.estrategia_discurso?.abertura_hook}</p>
                <ul>
                  {(discurso.estrategia_discurso?.compromissos_prioritarios || []).map((item) => (
                    <li key={item.proposta_chave}>{item.proposta_chave}</li>
                  ))}
                </ul>
                <div className="row">
                  <button type="button" onClick={() => reverDiscurso("EM_REVISAO")}>Enviar para revisão</button>
                  <button type="button" onClick={() => reverDiscurso("APROVADO")}>Aprovar</button>
                  <button type="button" onClick={() => reverDiscurso("REJEITADO")}>Rejeitar</button>
                </div>
              </div>
            )}
          </form>
        </main>
      )}

      {/* ABA 5: DIA D */}
      {aba === "diad" && (
        <main className="page">
          <section className="card">
            <h2>Apuramento paralelo</h2>
            <p className="muted">Geofence e SHA-256 continuam no contrato da ata. Esta vista lê o agregado que a API já calcula para o plano com Dia D.</p>
            <button className="primary" type="button" onClick={carregarDiaD}>Actualizar apuramento</button>
            {avisoAuth && <p className="banner">{avisoAuth}</p>}
            {apuramento && (
              <pre>{JSON.stringify(apuramento, null, 2)}</pre>
            )}
          </section>
        </main>
      )}

      {aba === "eleitor" && (
        <main className="page">
          <section className="card">
            <h2>Canal do eleitor</h2>
            <p className="muted">
              Consulta pública de assembleia e queixa de bairro. O número chega mascarado.
              A lista de mesas é o seed simulado do repositório, não o caderno da CNE.
            </p>
            <form onSubmit={simularEleitor}>
              <label>Mensagem
                <input value={textoEleitor} onChange={(e) => setTextoEleitor(e.target.value)} />
              </label>
              <div className="row">
                <button className="primary" type="submit">Simular mensagem</button>
                <button className="ghost" type="button" onClick={carregarQueixas}>Actualizar queixas</button>
              </div>
            </form>
            {avisoAuth && <p className="banner">{avisoAuth}</p>}
            {respostaEleitor && <p>{respostaEleitor}</p>}
            {queixas && (
              <ul>
                {(queixas.agregado || []).map((item) => (
                  <li key={`${item.municipio}-${item.categoria}`}>{item.municipio} · {item.categoria} · {item.total}</li>
                ))}
              </ul>
            )}
          </section>
        </main>
      )}
      </div>
    </div>
  );
}
