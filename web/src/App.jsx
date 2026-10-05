import { useEffect, useState } from "react";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import {
  IconeAngolaEmblema,
  IconeAuto,
  IconeDashboard,
  IconeDesktop,
  IconeDiaD,
  IconeDiscursos,
  IconeEleitor,
  IconeFechar,
  IconeHondt,
  IconeMenu,
  IconeMobile,
  IconePlanos,
} from "./components/Icones.jsx";
import { Aviso, Selo } from "./components/ui.jsx";
import { useDadosGlobais, useTerritorio } from "./hooks/useDadosBase.js";
import { useSessao } from "./hooks/useSessao.js";
import Comando from "./views/Comando.jsx";
import DiaD from "./views/DiaD.jsx";
import Discursos from "./views/Discursos.jsx";
import Eleitor from "./views/Eleitor.jsx";
import Hondt from "./views/Hondt.jsx";
import Planos from "./views/Planos.jsx";

const DECISAO = [
  ["comando", "Dashboard", "Mapa e campanha", IconeDashboard],
  ["hondt", "Hondt", "Cadeiras provinciais", IconeHondt],
  ["diad", "Dia D", "Apuramento", IconeDiaD],
];
const APOIO = [
  ["planos", "Planos", "Contratação", IconePlanos],
  ["discurso", "Discursos", "Revisão humana", IconeDiscursos],
  ["eleitor", "Eleitor", "WhatsApp", IconeEleitor],
];
const ABAS = [...DECISAO, ...APOIO];

function abaInicial() {
  if (typeof window !== "undefined") {
    const hash = window.location.hash.replace("#", "");
    if (ABAS.some(([id]) => id === hash)) return hash;
    const salvo = sessionStorage.getItem("warroom_aba");
    if (ABAS.some(([id]) => id === salvo)) return salvo;
  }
  return "comando";
}

export default function App() {
  const [aba, setAba] = useState(abaInicial);
  const [plano, setPlano] = useState(() => {
    return sessionStorage.getItem("warroom_plano") || "NACIONAL";
  });
  const [versao, setVersao] = useState("DPA_2016_18P");

  // Modo de visualização: 'auto' | 'desktop' | 'mobile'
  const [modoDispositivo, setModoDispositivo] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("warroom_device_mode") || "auto";
    }
    return "auto";
  });
  const [isMobileScreen, setIsMobileScreen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 960;
    }
    return false;
  });
  const [menuAberto, setMenuAberto] = useState(false);

  const sessao = useSessao();
  const dados = useDadosGlobais();
  const territorio = useTerritorio(plano, versao);

  useEffect(() => {
    function aoMudarHash() {
      const hash = window.location.hash.replace("#", "");
      if (ABAS.some(([id]) => id === hash)) {
        setAba(hash);
      }
    }
    function aoRedimensionar() {
      setIsMobileScreen(window.innerWidth < 960);
    }
    window.addEventListener("hashchange", aoMudarHash);
    window.addEventListener("resize", aoRedimensionar);
    return () => {
      window.removeEventListener("hashchange", aoMudarHash);
      window.removeEventListener("resize", aoRedimensionar);
    };
  }, []);

  const isMobileView = modoDispositivo === "mobile" || (modoDispositivo === "auto" && isMobileScreen);
  const actual = ABAS.find(([id]) => id === aba) || ABAS[0];
  const abaDeApoioActiva = APOIO.some(([id]) => id === aba);

  const mudarAba = (novaAba) => {
    setAba(novaAba);
    setMenuAberto(false);
    if (typeof window !== "undefined") {
      window.location.hash = novaAba;
      sessionStorage.setItem("warroom_aba", novaAba);
    }
  };

  const mudarPlano = (novoPlano) => {
    setPlano(novoPlano);
    sessionStorage.setItem("warroom_plano", novoPlano);
  };

  const alternarModo = (novoModo) => {
    setModoDispositivo(novoModo);
    if (typeof window !== "undefined") {
      localStorage.setItem("warroom_device_mode", novoModo);
    }
  };

  return (
    <div className={`shell ${isMobileView ? "modo-mobile" : "modo-desktop"}`}>
      <a className="salto" href="#conteudo">Saltar para o conteúdo</a>

      {/* Sidebar Desktop (Oculta no modo Mobile) */}
      {!isMobileView && (
        <aside className="rail">
          <div className="brand">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <IconeAngolaEmblema size={26} />
              <div>
                <p className="eyebrow">Angola 2027</p>
                <strong>Sala de comando</strong>
              </div>
            </div>
          </div>

          <nav className="tabs" aria-label="Secções">
            <p className="nav-rotulo">Decisão</p>
            {DECISAO.map(([id, nome, nota, Icone]) => (
              <button
                key={id}
                type="button"
                className={aba === id ? "active chefe" : "chefe"}
                aria-current={aba === id ? "page" : undefined}
                onClick={() => mudarAba(id)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Icone size={18} />
                  <div>
                    <span>{nome}</span>
                    <small>{nota}</small>
                  </div>
                </div>
              </button>
            ))}

            <p className="nav-rotulo">Apoio</p>
            {APOIO.map(([id, nome, nota, Icone]) => (
              <button
                key={id}
                type="button"
                className={aba === id ? "active" : ""}
                aria-current={aba === id ? "page" : undefined}
                onClick={() => mudarAba(id)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Icone size={18} />
                  <div>
                    <span>{nome}</span>
                    <small>{nota}</small>
                  </div>
                </div>
              </button>
            ))}
          </nav>

          <footer className="rail-pe">
            <p>Proveniência dos Dados</p>
            <ul>
              <li><Selo tipo="OFICIAL" /> <span>CNE, INE Projeções</span></li>
              <li><Selo tipo="ESTIMADO" /> <span>Agregações de base</span></li>
              <li><Selo tipo="SIMULADO" /> <span>Cenários de teste</span></li>
            </ul>
          </footer>
        </aside>
      )}

      {/* Área Central / Workspace */}
      <div className="workspace" id="conteudo">
        {/* Cabeçalho */}
        <header className="top">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {isMobileView && (
                <IconeAngolaEmblema size={20} style={{ marginRight: "4px" }} />
              )}
              <p className="eyebrow">República de Angola · Pleito 2027</p>
            </div>
            <h1>{actual[1]}</h1>
            <p className="lede">{actual[2]}</p>
          </div>

          <div className="top-acoes">
            {/* Alternador de Modo Desktop / Mobile */}
            <div className="btn-group modo-switch" title="Alterne entre visualização Desktop e Mobile">
              <button
                type="button"
                className={modoDispositivo === "desktop" ? "activa" : ""}
                onClick={() => alternarModo("desktop")}
                title="Forçar visualização em ecrã largo (Desktop)"
              >
                <IconeDesktop size={14} /> Desktop
              </button>
              <button
                type="button"
                className={modoDispositivo === "mobile" ? "activa" : ""}
                onClick={() => alternarModo("mobile")}
                title="Forçar modo compacto (Mobile Touch)"
              >
                <IconeMobile size={14} /> Mobile
              </button>
              <button
                type="button"
                className={modoDispositivo === "auto" ? "activa" : ""}
                onClick={() => alternarModo("auto")}
                title="Adaptar automaticamente ao tamanho da janela"
              >
                <IconeAuto size={14} /> Auto
              </button>
            </div>

            <span className="badge badge-media">
              Plano {plano}
            </span>

            <div className={`session ${sessao.ativa ? "on" : ""}`}>
              <i />
              <span>{sessao.ativa ? "Sessão Activa" : "Modo Consulta"}</span>
            </div>
          </div>
        </header>

        {dados.erro && (
          <div className="faixa">
            <Aviso>{`A API não respondeu: ${dados.erro}`}</Aviso>
            <button className="ghost" type="button" onClick={dados.recarregar}>Tentar de novo</button>
          </div>
        )}

        {/* Conteúdo Dinâmico das Abas */}
        <ErrorBoundary key={aba}>
          {aba === "comando" && (
            <Comando dados={dados} territorio={territorio} plano={plano} setPlano={mudarPlano} versao={versao} setVersao={setVersao} />
          )}
          {aba === "hondt" && (
            <Hondt hondtGeral={dados.hondtGeral} contorno={dados.contorno} territorio={territorio} />
          )}
          {aba === "diad" && <DiaD plano={plano} sessao={sessao} />}
          {aba === "planos" && <Planos planos={dados.planos} plano={plano} setPlano={mudarPlano} />}
          {aba === "discurso" && <Discursos plano={plano} sessao={sessao} />}
          {aba === "eleitor" && <Eleitor />}
        </ErrorBoundary>
      </div>

      {/* Barra de Navegação Inferior (Mobile Dock) */}
      {isMobileView && (
        <nav className="mobile-dock" aria-label="Navegação móvel principal">
          <button
            type="button"
            className={aba === "comando" ? "dock-item activa" : "dock-item"}
            onClick={() => mudarAba("comando")}
          >
            <span className="dock-icon"><IconeDashboard size={20} /></span>
            <span className="dock-label">Dashboard</span>
          </button>

          <button
            type="button"
            className={aba === "hondt" ? "dock-item activa" : "dock-item"}
            onClick={() => mudarAba("hondt")}
          >
            <span className="dock-icon"><IconeHondt size={20} /></span>
            <span className="dock-label">Hondt</span>
          </button>

          <button
            type="button"
            className={aba === "diad" ? "dock-item activa" : "dock-item"}
            onClick={() => mudarAba("diad")}
          >
            <span className="dock-icon"><IconeDiaD size={20} /></span>
            <span className="dock-label">Dia D</span>
          </button>

          <button
            type="button"
            className={menuAberto || abaDeApoioActiva ? "dock-item activa" : "dock-item"}
            onClick={() => setMenuAberto((v) => !v)}
          >
            <span className="dock-icon"><IconeMenu size={20} /></span>
            <span className="dock-label">{abaDeApoioActiva ? actual[1] : "Mais"}</span>
          </button>
        </nav>
      )}

      {/* Drawer Móvel de Apoio / Configurações */}
      {isMobileView && menuAberto && (
        <div className="mobile-drawer-overlay" onClick={() => setMenuAberto(false)}>
          <div className="mobile-drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer-header">
              <div>
                <p className="eyebrow">Menu de Apoio</p>
                <h3>Módulos & Configuração</h3>
              </div>
              <button
                type="button"
                className="aviso-fechar"
                onClick={() => setMenuAberto(false)}
                aria-label="Fechar menu móvel"
              >
                <IconeFechar size={18} />
              </button>
            </div>

            <div className="mobile-drawer-grid">
              <p className="nav-rotulo">Módulos de Apoio</p>
              {APOIO.map(([id, nome, nota, Icone]) => (
                <button
                  key={id}
                  type="button"
                  className={`mobile-menu-card ${aba === id ? "activa" : ""}`}
                  onClick={() => mudarAba(id)}
                >
                  <span className="menu-card-icon"><Icone size={20} /></span>
                  <div>
                    <strong>{nome}</strong>
                    <p className="muted">{nota}</p>
                  </div>
                </button>
              ))}

              <p className="nav-rotulo" style={{ marginTop: "12px" }}>Modo de Visualização</p>
              <div className="btn-group" style={{ width: "100%", justifyContent: "center" }}>
                <button
                  type="button"
                  className={modoDispositivo === "desktop" ? "activa" : ""}
                  onClick={() => alternarModo("desktop")}
                  style={{ flex: 1, padding: "8px" }}
                >
                  <IconeDesktop size={14} /> Desktop
                </button>
                <button
                  type="button"
                  className={modoDispositivo === "mobile" ? "activa" : ""}
                  onClick={() => alternarModo("mobile")}
                  style={{ flex: 1, padding: "8px" }}
                >
                  <IconeMobile size={14} /> Mobile
                </button>
                <button
                  type="button"
                  className={modoDispositivo === "auto" ? "activa" : ""}
                  onClick={() => alternarModo("auto")}
                  style={{ flex: 1, padding: "8px" }}
                >
                  <IconeAuto size={14} /> Auto
                </button>
              </div>

              <div style={{ marginTop: "16px", padding: "12px", background: "rgba(0,0,0,0.3)", borderRadius: "var(--radius-sm)" }}>
                <p style={{ fontSize: "11px", color: "var(--muted)", margin: "0 0 6px" }}>PROVENIÊNCIA DOS DADOS</p>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <Selo tipo="OFICIAL" />
                  <Selo tipo="ESTIMADO" />
                  <Selo tipo="SIMULADO" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
