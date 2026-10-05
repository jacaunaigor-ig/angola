import { useEffect, useMemo, useState } from "react";
import { api, getToken, setToken } from "./api.js";
import MapaTerritorio from "./Mapa.jsx";
import { classificar, fmtInt, fmtPct, priorizar, rotuloZona, serieParaGrafico } from "./territorio.js";

const ABAS = [
  ["comando", "Comando"],
  ["planos", "Planos"],
  ["discurso", "Discursos"],
  ["diad", "Dia D"],
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
      <polyline fill="none" stroke="#38bdf8" strokeWidth="2.5" points={linha("mpla")} />
      <polyline fill="none" stroke="#f97316" strokeWidth="2.5" points={linha("unita")} />
      <polyline fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5 4" points={linha("abstencao")} />
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

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      setErro("");
      try {
        const [hist, catalogo] = await Promise.all([
          api("/api/eleicoes/serie-historica"),
          api("/api/planos"),
        ]);
        if (cancelado) return;
        setSerie(hist);
        setPlanos(catalogo.planos || []);
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

  return (
    <div className="app">
      <header className="top">
        <div>
          <p className="eyebrow">REPÚBLICA DE ANGOLA · PLEITO 2027</p>
          <h1>Sala de comando</h1>
          <p className="sub">Cliente React sobre a API FastAPI. O Streamlit fica como protótipo.</p>
        </div>
        <div className="chips">
          <span className="chip">Plano {plano}</span>
          <span className="chip">{tokenOn ? "Sessão activa" : "Sem sessão"}</span>
          <span className="chip">API /api</span>
        </div>
      </header>
      {erro && <div className="banner">A API não respondeu: {erro}. Arranque o FastAPI em :8000.</div>}
      <nav className="tabs">
        {ABAS.map(([id, nome]) => (
          <button key={id} className={aba === id ? "active" : ""} onClick={() => setAba(id)}>{nome}</button>
        ))}
      </nav>

      {aba === "comando" && (
        <main className="page">
          <section className="kpis">
            <article className="kpi"><span>Eleitorado 2022</span><strong>{fmtInt(eleitores)}</strong></article>
            <article className="kpi"><span>População INE</span><strong>{fmtInt(populacao)}</strong></article>
            <article className="kpi"><span>Bastiões</span><strong>{contagem.BASTIAO || 0}</strong></article>
            <article className="kpi"><span>Em disputa</span><strong>{contagem.CAMPO_BATALHA || 0}</strong></article>
            <article className="kpi"><span>Oposição</span><strong>{contagem.OPOSICAO || 0}</strong></article>
          </section>
          <section className="card">
            <h2>Série nacional 2012–2022</h2>
            <p className="muted">Azul MPLA, laranja UNITA, tracejado abstenção. Nível nacional oficial. O mapa usa a margem provincial de 2022.</p>
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
          <section className="row">
            <label>Malha
              <select value={versao} onChange={(e) => setVersao(e.target.value)}>
                <option value="DPA_2016_18P">DPA 2016 · 18 províncias</option>
                <option value="DPA_2024_21P">DPA 2024 · 21 províncias</option>
              </select>
            </label>
            <label>Plano
              <select value={plano} onChange={(e) => setPlano(e.target.value)}>
                <option value="NACIONAL">Nacional</option>
                <option value="PROVINCIAL">Provincial</option>
                <option value="MUNICIPAL">Municipal</option>
              </select>
            </label>
            <label>Bastião ≥
              <input type="number" value={bastiao} onChange={(e) => setBastiao(Number(e.target.value))} />
            </label>
            <label>Oposição ≤
              <input type="number" value={oposicao} onChange={(e) => setOposicao(Number(e.target.value))} />
            </label>
          </section>
          <section className="grid-2">
            <div className="card">
              <MapaTerritorio
                features={featuresActivas}
                onSelect={(props) => setSelecionado(props)}
              />
            </div>
            <div className="card">
              <h2>{foco?.nome || "Território"}</h2>
              {foco && (
                <>
                  <p className={`zona ${foco.zonamento_activo || foco.zonamento}`}>{rotuloZona(foco.zonamento_activo || foco.zonamento)}</p>
                  <p>Margem 2022: {fmtPct(foco.margem_apurada_perc)}</p>
                  <p>Eleitores: {fmtInt(foco.eleitores_cne)}</p>
                  <p>Abstenção: {fmtPct(foco.abstencao_perc)}</p>
                  <p>Jovens: {fmtPct(foco.juventude_perc)}</p>
                  <p>Prioridade: {foco.score ?? "—"} / 100</p>
                  <p className="muted">O score pondera disputa, volume, abstenção e juventude. Não inclui custo de alcance.</p>
                </>
              )}
              <table>
                <thead><tr><th>Território</th><th>Zona</th><th>Score</th></tr></thead>
                <tbody>
                  {linhas.slice(0, 8).map((row) => (
                    <tr key={row.nome}>
                      <td>{row.nome}</td>
                      <td className={`zona ${row.zonamento_activo}`}>{rotuloZona(row.zonamento_activo)}</td>
                      <td>{row.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      )}

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
            <h2>Proposta</h2>
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

      {aba === "discurso" && (
        <main className="page">
          <form className="card" onSubmit={entrar}>
            <h2>Sessão</h2>
            <p className="muted">Discursos e Dia D passam pelo JWT da campanha. Cartografia e série histórica não exigem sessão.</p>
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
            <h2>Rascunho por município</h2>
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
    </div>
  );
}
