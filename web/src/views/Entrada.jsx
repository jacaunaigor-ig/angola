import React, { useState } from "react";
import { IconeAngolaEmblema } from "../components/Icones.jsx";
import { Aviso } from "../components/ui.jsx";

const DEMO = {
  campanha_id: "a0000000-0000-0000-0000-000000000001",
  email: "analista@campanha.ao",
  senha: "senha-segura-2027",
};

export default function Entrada({ onEntrar, onConsulta }) {
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
        <div className="entrada-marca">
          <IconeAngolaEmblema size={36} />
          <div>
            <p className="eyebrow">Angola 2027</p>
            <h1>GPS Eleitoral</h1>
            <p className="lede">Sala de comando para campanhas. Cartografia CNE, Hondt e operação de campo.</p>
          </div>
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
            {aEnviar ? "A autenticar…" : "Entrar na sala de comando"}
          </button>
        </form>

        <div className="entrada-acoes">
          <button className="ghost" type="button" onClick={onConsulta}>
            Continuar em consulta CNE
          </button>
          <button className="ghost" type="button" onClick={() => setLogin(DEMO)}>
            Credenciais de demonstração
          </button>
        </div>
        <p className="muted entrada-nota">
          Demonstração: campanha a0000000-…001, analista@campanha.ao, senha-segura-2027 (sem PostgreSQL).
          A consulta CNE mostra só dados oficiais e estimados.
        </p>
      </div>
    </div>
  );
}
