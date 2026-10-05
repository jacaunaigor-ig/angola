import { useState } from "react";
import { api } from "../api.js";
import { Aviso, Cartao, Selo } from "../components/ui.jsx";

export default function Discursos({ plano, sessao }) {
  const [login, setLogin] = useState({ campanha_id: "", email: "", senha: "" });
  const [municipio, setMunicipio] = useState("Luanda");
  const [discurso, setDiscurso] = useState(null);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  const campoLogin = (nome) => ({
    value: login[nome],
    onChange: (e) => setLogin({ ...login, [nome]: e.target.value }),
  });

  function tratarErro(exc) {
    if (exc.status === 401) {
      sessao.sair();
      setErro("A sessão terminou ou não existe. Entre de novo.");
    } else {
      setErro(exc.message);
    }
  }

  async function entrar(event) {
    event.preventDefault();
    setErro("");
    try {
      await sessao.entrar(login);
      setLogin({ ...login, senha: "" });
    } catch (exc) {
      setErro(exc.message);
    }
  }

  async function gerar(event) {
    event.preventDefault();
    setErro("");
    setAviso("");
    setDiscurso(null);
    try {
      setDiscurso(await api(`/api/discurso-territorializado/${encodeURIComponent(municipio)}`, { auth: true, plano }));
    } catch (exc) {
      tratarErro(exc);
    }
  }

  async function rever(status) {
    if (!discurso?.id) {
      setAviso("Este rascunho ainda não foi gravado. Grave-o por POST /api/discursos/gerar com a sessão activa antes de o rever.");
      return;
    }
    setErro("");
    try {
      setDiscurso(
        await api(`/api/discursos/${discurso.id}/status`, {
          method: "PATCH",
          auth: true,
          plano,
          body: { status, responsavel_revisao: "Comité", comentarios_revisao: "Revisão na sala de comando." },
        }),
      );
    } catch (exc) {
      tratarErro(exc);
    }
  }

  const estado = discurso?.status_aprovacao || discurso?.status || "RASCUNHO";

  return (
    <main className="page">
      <Cartao titulo="Sessão da campanha" nota="Discursos e Dia D usam o JWT da campanha. Cartografia, Hondt e série histórica não exigem sessão.">
        {sessao.ativa ? (
          <div className="row">
            <p className="ok">Sessão activa neste navegador.</p>
            <button className="ghost" type="button" onClick={sessao.sair}>Terminar sessão</button>
          </div>
        ) : (
          <form onSubmit={entrar}>
            <div className="row">
              <label>Campanha<input required placeholder="UUID" {...campoLogin("campanha_id")} /></label>
              <label>E-mail<input required type="email" autoComplete="username" {...campoLogin("email")} /></label>
              <label>Senha<input required type="password" autoComplete="current-password" {...campoLogin("senha")} /></label>
              <button className="primary" type="submit">Entrar</button>
            </div>
          </form>
        )}
      </Cartao>

      <Cartao
        titulo="Rascunho de discurso por município"
        nota="Todo o texto é rascunho. Promessas saem marcadas [PROMESSA — REVISAR] e exigem aprovação do comité."
        acao={<Selo tipo="RASCUNHO" />}
      >
        <form onSubmit={gerar}>
          <div className="row">
            <label>Município<input required value={municipio} onChange={(e) => setMunicipio(e.target.value)} /></label>
            <button className="primary" type="submit">Pedir rascunho</button>
          </div>
        </form>
        <Aviso>{erro}</Aviso>
        <Aviso tipo="info">{aviso}</Aviso>
        {discurso && (
          <div className="bloco">
            <p><strong>Estado</strong> <span className="badge badge-log">{estado}</span></p>
            <p>{discurso.estrategia_discurso?.abertura_hook}</p>
            <ul>
              {(discurso.estrategia_discurso?.compromissos_prioritarios || []).map((item) => (
                <li key={item.proposta_chave}>{item.proposta_chave}</li>
              ))}
            </ul>
            <div className="row">
              <button className="ghost" type="button" onClick={() => rever("EM_REVISAO")}>Enviar para revisão</button>
              <button className="primary" type="button" onClick={() => rever("APROVADO")}>Aprovar</button>
              <button className="ghost perigo" type="button" onClick={() => rever("REJEITADO")}>Rejeitar</button>
            </div>
          </div>
        )}
      </Cartao>
    </main>
  );
}
