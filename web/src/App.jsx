import { useState } from "react";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { Aviso } from "./components/ui.jsx";
import { useDadosGlobais, useTerritorio } from "./hooks/useDadosBase.js";
import { useSessao } from "./hooks/useSessao.js";
import Comando from "./views/Comando.jsx";
import DiaD from "./views/DiaD.jsx";
import Discursos from "./views/Discursos.jsx";
import Eleitor from "./views/Eleitor.jsx";
import Hondt from "./views/Hondt.jsx";
import Planos from "./views/Planos.jsx";

const ABAS = [
  ["comando", "Comando", "Prioridade territorial"],
  ["hondt", "Hondt", "Círculos provinciais"],
  ["planos", "Planos", "Contratação"],
  ["discurso", "Discursos", "Revisão humana"],
  ["diad", "Dia D", "Apuramento"],
  ["eleitor", "Eleitor", "WhatsApp"],
];

export default function App() {
  const [aba, setAba] = useState("comando");
  const [plano, setPlano] = useState("NACIONAL");
  const [versao, setVersao] = useState("DPA_2016_18P");
  const sessao = useSessao();
  const dados = useDadosGlobais();
  const territorio = useTerritorio(plano, versao);
  const actual = ABAS.find(([id]) => id === aba) || ABAS[0];

  return (
    <div className="shell">
      <a className="salto" href="#conteudo">Saltar para o conteúdo</a>
      <aside className="rail">
        <div className="brand">
          <p className="eyebrow">Angola 2027</p>
          <strong>Sala de comando</strong>
        </div>
        <nav className="tabs" aria-label="Secções">
          {ABAS.map(([id, nome, nota]) => (
            <button key={id} type="button" className={aba === id ? "active" : ""} aria-current={aba === id ? "page" : undefined} onClick={() => setAba(id)}>
              <span>{nome}</span>
              <small>{nota}</small>
            </button>
          ))}
        </nav>
        <footer className="rail-pe">
          <p>Proveniência</p>
          <ul>
            <li><span className="selo selo-oficial">OFICIAL</span> CNE, INE</li>
            <li><span className="selo selo-estimado">ESTIMADO</span> projecção</li>
            <li><span className="selo selo-simulado">SIMULADO</span> demonstração</li>
          </ul>
        </footer>
      </aside>

      <div className="workspace" id="conteudo">
        <header className="top">
          <div>
            <p className="eyebrow">República de Angola · Pleito 2027</p>
            <h1>{actual[1]}</h1>
          </div>
          <p className={`session ${sessao.ativa ? "on" : ""}`}>{sessao.ativa ? "Sessão activa" : "Sem sessão"}</p>
        </header>

        {dados.erro && (
          <div className="faixa">
            <Aviso>{`A API não respondeu: ${dados.erro}`}</Aviso>
            <button className="ghost" type="button" onClick={dados.recarregar}>Tentar de novo</button>
          </div>
        )}

        <ErrorBoundary key={aba}>
          {aba === "comando" && (
            <Comando dados={dados} territorio={territorio} plano={plano} setPlano={setPlano} versao={versao} setVersao={setVersao} />
          )}
          {aba === "hondt" && <Hondt hondtGeral={dados.hondtGeral} contorno={dados.contorno} />}
          {aba === "planos" && <Planos planos={dados.planos} plano={plano} setPlano={setPlano} />}
          {aba === "discurso" && <Discursos plano={plano} sessao={sessao} />}
          {aba === "diad" && <DiaD plano={plano} sessao={sessao} />}
          {aba === "eleitor" && <Eleitor />}
        </ErrorBoundary>
      </div>
    </div>
  );
}
