import { useState } from "react";
import { api } from "../api.js";
import { Aviso, Cartao } from "../components/ui.jsx";
import { fmtInt } from "../territorio.js";

const VAZIA = { organizacao: "", contacto: "", email: "", telefone: "", notas: "" };

export default function Planos({ planos, plano, setPlano }) {
  const [proposta, setProposta] = useState(VAZIA);
  const [protocolo, setProtocolo] = useState("");
  const [erro, setErro] = useState("");
  const [aEnviar, setAEnviar] = useState(false);

  const campo = (nome) => ({
    value: proposta[nome],
    onChange: (e) => setProposta({ ...proposta, [nome]: e.target.value }),
  });

  async function pedirProposta(event) {
    event.preventDefault();
    setProtocolo("");
    setErro("");
    setAEnviar(true);
    try {
      const data = await api("/api/propostas", { method: "POST", plano, body: { ...proposta, plano } });
      setProtocolo(data.pedido?.protocolo || data.protocolo || "registado");
      setProposta(VAZIA);
    } catch (exc) {
      setErro(exc.message);
    } finally {
      setAEnviar(false);
    }
  }

  return (
    <main className="page">
      <section className="plans" aria-label="Planos comerciais">
        {planos.map((item) => (
          <article key={item.codigo} className={`card plan ${plano === item.codigo ? "escolhido" : ""}`}>
            <h3>{item.nome}</h3>
            <p className="muted">{item.tagline}</p>
            <p className="price">{fmtInt(item.preco_tabela_aoa)} <small>AOA</small></p>
            <p>{item.limites?.brigadistas} brigadistas · {item.limites?.contas_war_room} contas</p>
            <button
              type="button"
              className={plano === item.codigo ? "primary" : "ghost"}
              onClick={() => setPlano(item.codigo)}
              aria-pressed={plano === item.codigo}
            >
              {plano === item.codigo ? "Plano em uso" : "Usar este plano"}
            </button>
          </article>
        ))}
      </section>

      <Cartao titulo="Pedir proposta formal" nota={`Plano seleccionado: ${plano}`}>
        <form onSubmit={pedirProposta}>
          <div className="row">
            <label>Organização<input required {...campo("organizacao")} /></label>
            <label>Contacto<input required {...campo("contacto")} /></label>
            <label>E-mail<input type="email" {...campo("email")} /></label>
            <label>Telefone<input type="tel" {...campo("telefone")} /></label>
          </div>
          <label>Notas<textarea rows={3} {...campo("notas")} /></label>
          <div className="row">
            <button className="primary" type="submit" disabled={aEnviar}>{aEnviar ? "A enviar…" : "Gerar protocolo"}</button>
          </div>
          {protocolo && <Aviso tipo="ok">Protocolo {protocolo}</Aviso>}
          <Aviso>{erro}</Aviso>
        </form>
      </Cartao>
    </main>
  );
}
