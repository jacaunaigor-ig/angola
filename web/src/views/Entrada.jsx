import React, { useState } from "react";
import { IconeAngolaEmblema } from "../components/Icones.jsx";
import { Aviso } from "../components/ui.jsx";

const INDICADORES = [
  ["18", "círculos provinciais", "Resultados CNE · 2022"],
  ["5", "deputados provinciais por círculo", "Modelo eleitoral · CNE 2022"],
  ["2012–2022", "série histórica eleitoral", "Dados CNE disponíveis no painel"],
  ["18 → 21", "províncias nas malhas territoriais", "DPA 2016 e DPA 2024"],
];

export default function Entrada({ onEntrar, onConsulta, onFilme }) {
  const [login, setLogin] = useState({ campanha_id: "", email: "", senha: "" });
  const [erro, setErro] = useState("");
  const [aEnviar, setAEnviar] = useState(false);

  const campo = (nome) => ({
    value: login[nome],
    onChange: (e) => setLogin({ ...login, [nome]: e.target.value }),
  });

  async function submeter(event) {
    event.preventDefault();
    setErro("");
    setAEnviar(true);
    try {
      await onEntrar(login);
    } catch (exc) {
      setErro(exc.message || "Não foi possível autenticar. Verifique a API e as credenciais.");
    } finally {
      setAEnviar(false);
    }
  }

  return (
    <div className="entrada">
      <div className="entrada-painel">
        <section className="entrada-apresentacao" aria-labelledby="entrada-titulo">
          <div className="entrada-marca">
            <IconeAngolaEmblema size={36} />
            <div>
              <p className="eyebrow">Angola 2027 · War Room</p>
              <h1 id="entrada-titulo">GPS Eleitoral</h1>
              <p className="lede">
                Cartografia eleitoral e prioridades territoriais para orientar a próxima decisão da campanha.
              </p>
            </div>
          </div>

          <div className="entrada-indicadores" aria-label="Conteúdo disponível na plataforma">
            {INDICADORES.map(([valor, rotulo, fonte]) => (
              <article className="entrada-indicador" key={rotulo}>
                <strong>{valor}</strong>
                <span>{rotulo}</span>
                <small>{fonte}</small>
              </article>
            ))}
          </div>
          <p className="entrada-indicadores-nota">
            Indicadores do acervo histórico, não são métricas em tempo real.
          </p>

          <section className="entrada-transparencia" aria-labelledby="entrada-fontes-titulo">
            <h2 id="entrada-fontes-titulo">Fontes e proteção</h2>
            <p><strong>CNE e INE:</strong> dados oficiais identificados; estimativas e cenários recebem rótulos próprios.</p>
            <p><strong>Acesso de campanha:</strong> sessão JWT e permissões separadas por campanha.</p>
          </section>

          <div className="entrada-acoes">
            <button className="primary" type="button" onClick={onConsulta}>
              Explorar demonstração sem login
            </button>
            {onFilme && (
              <button className="ghost" type="button" onClick={onFilme}>
                Iniciar visita guiada
              </button>
            )}
          </div>
          <p className="muted entrada-nota">
            A consulta pública permite explorar os dados disponíveis sem abrir uma sessão de campanha.
          </p>
        </section>

        <section className="entrada-acesso" aria-labelledby="entrada-acesso-titulo">
          <div>
            <p className="eyebrow">Área reservada</p>
            <h2 id="entrada-acesso-titulo">Acesso de campanha</h2>
            <p className="muted">Use as credenciais institucionais fornecidas pela administração da campanha.</p>
          </div>

          <form className="entrada-form" onSubmit={submeter}>
            <label>
              Campanha (UUID)
              <input required autoComplete="off" placeholder="a0000000-…" {...campo("campanha_id")} />
            </label>
            <label>
              E-mail institucional
              <input required type="email" autoComplete="username" placeholder="coordenacao@campanha.ao" {...campo("email")} />
            </label>
            <label>
              Senha
              <input required type="password" autoComplete="current-password" {...campo("senha")} />
            </label>
            <Aviso>{erro}</Aviso>
            <button className="primary" type="submit" disabled={aEnviar}>
              {aEnviar ? "A autenticar…" : "Entrar na campanha"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
