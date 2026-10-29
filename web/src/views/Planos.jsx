import React, { useState } from "react";
import { api } from "../api.js";
import { IconeCheck } from "../components/Icones.jsx";
import { Aviso, Cartao } from "../components/ui.jsx";
import { fmtInt } from "../territorio.js";
import { resumoPlano } from "../catalogoPlanos.js";

const VAZIA = { organizacao: "", contacto: "", email: "", telefone: "", notas: "" };
const AMBIENTE_DEMO = import.meta.env.VITE_DEMO_MODE === "true";

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
    if (!proposta.email.trim() && !proposta.telefone.trim()) {
      setErro("Informe um e-mail ou telefone para receber retorno sobre a proposta.");
      return;
    }
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
      <section className="plans" aria-label="Catálogo de Planos Comerciais">
        {planos.map((item) => {
          const activo = plano === item.codigo;
          const resumo = resumoPlano(item);
          return (
            <article key={item.codigo} className={`card plan ${activo ? "escolhido" : ""}`}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <h3>{item.nome}</h3>
                  {activo && <span className="badge badge-baixa">Activo</span>}
                </div>
                <p className="muted" style={{ fontSize: "12.5px", marginTop: "4px" }}>{item.tagline}</p>
                <p className="price">
                  {fmtInt(item.preco_tabela_aoa)} <small>AOA / eleição</small>
                </p>

                <ul style={{ listStyle: "none", padding: "0", margin: "12px 0", display: "grid", gap: "6px", fontSize: "12px" }}>
                  {resumo.funcionalidades.map((d) => (
                    <li key={d} style={{ display: "flex", alignItems: "center", gap: "7px", color: "var(--text)" }}>
                      <IconeCheck size={13} style={{ color: "var(--ok)", flexShrink: 0 }} /> {d}
                    </li>
                  ))}
                </ul>
                <ul className="muted" style={{ listStyle: "none", padding: "0", margin: "12px 0", display: "grid", gap: "4px", fontSize: "12px" }}>
                  {resumo.limites.map(({ nome, valor }) => (
                    <li key={nome}>{nome}: <strong>{fmtInt(valor)}</strong></li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                className={activo ? "primary" : "ghost"}
                onClick={() => setPlano(item.codigo)}
                aria-pressed={activo}
                style={{ width: "100%", marginTop: "12px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
              >
                {activo ? (
                  <>
                    <IconeCheck size={14} /> Plano Seleccionado
                  </>
                ) : (
                  `Mudar para ${item.nome}`
                )}
              </button>
            </article>
          );
        })}
      </section>
      <p className="muted">
        Funcionalidades e limites são carregados do catálogo da API. O preço é de referência por ciclo eleitoral; a proposta formal define o âmbito e as condições finais.
      </p>

      <Cartao
        titulo="Solicitar proposta comercial"
        nota={`Peça uma proposta para o plano ${plano}. O protocolo confirma o envio do pedido, não constitui contrato nem reserva de serviço.`}
      >
        {AMBIENTE_DEMO && (
          <Aviso tipo="info">
            Ambiente de demonstração no Render gratuito: os pedidos ficam apenas em memória, não são encaminhados por e-mail e podem perder-se após reinícios. Não envie contactos reais.
          </Aviso>
        )}
        {!AMBIENTE_DEMO && (
          <Aviso tipo="info">
            O pedido é processado em memória e não é encaminhado por e-mail. Antes de recolher contactos reais, configure armazenamento persistente e um canal de atendimento.
          </Aviso>
        )}
        <form onSubmit={pedirProposta}>
          <p className="muted">
            Informe um e-mail ou telefone para retorno. Não inclua nomes, contactos, preferências políticas ou outros dados pessoais de eleitores.
          </p>
          <div className="row">
            <label>
              Organização / Partido / Coligação
              <input required placeholder="ex: MPLA, UNITA, PRS, Bloco..." {...campo("organizacao")} />
            </label>
            <label>
              Responsável / Mandatário
              <input required placeholder="Nome do coordenador..." {...campo("contacto")} />
            </label>
            <label>
              E-mail Oficial
              <input type="email" autoComplete="email" placeholder="coordenacao@partido.ao" {...campo("email")} />
            </label>
            <label>
              Telefone / WhatsApp
              <input type="tel" autoComplete="tel" placeholder="+244 9..." {...campo("telefone")} />
            </label>
          </div>

          <label style={{ margin: "10px 0" }}>
            Especificidades do Território e Observações
            <textarea rows={3} placeholder="Província prioritária, número de brigadas de campo e requisitos especiais de segurança..." {...campo("notas")} />
          </label>

          <div className="row" style={{ marginTop: "12px" }}>
            <button className="primary" type="submit" disabled={aEnviar}>
              {aEnviar ? "A processar pedido…" : "Enviar pedido de proposta"}
            </button>
          </div>

          {protocolo && (
            <Aviso tipo="ok">
              Pedido recebido. Guarde o protocolo <strong>{protocolo}</strong> para referência; a proposta final depende de confirmação comercial.
            </Aviso>
          )}
          <Aviso>{erro}</Aviso>
        </form>
      </Cartao>
    </main>
  );
}
