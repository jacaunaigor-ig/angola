import { useState } from "react";
import { api } from "../api.js";
import { IconeCheck } from "../components/Icones.jsx";
import { Aviso, Cartao, Selo } from "../components/ui.jsx";
import { fmtInt } from "../territorio.js";

const VAZIA = { organizacao: "", contacto: "", email: "", telefone: "", notas: "" };

const DESTAQUES_PLANO = {
  MUNICIPAL: ["Âmbito Restrito a 1 Município", "Priorização de Bairros", "Discursos Territoriais", "1 Conta War Room"],
  PROVINCIAL: ["Círculo Provincial Completo (5 Mandatos)", "Simulação de Hondt Provincial", "Módulo Dia D com Assinatura Ed25519", "5 Contas Operacionais"],
  NACIONAL: ["Acesso Irrestrito aos 18/21 Círculos", "Simulação Parlamentar Nacional (220 Deputados)", "Canal WhatsApp com Triagem de Queixas", "Contas Ilimitadas & Suporte VIP"],
};

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
      <section className="plans" aria-label="Catálogo de Planos Comerciais">
        {planos.map((item) => {
          const activo = plano === item.codigo;
          const destaques = DESTAQUES_PLANO[item.codigo] || [];
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

                <p style={{ fontSize: "12.5px", color: "var(--muted)", margin: "8px 0" }}>
                  Capacidade: <strong>{item.limites?.brigadistas || "—"}</strong> brigadistas de campo · <strong>{item.limites?.contas_war_room || "—"}</strong> contas
                </p>

                <ul style={{ listStyle: "none", padding: "0", margin: "12px 0", display: "grid", gap: "6px", fontSize: "12px" }}>
                  {destaques.map((d, i) => (
                    <li key={i} style={{ display: "flex", alignItems: "center", gap: "7px", color: "var(--text)" }}>
                      <IconeCheck size={13} style={{ color: "var(--ok)", flexShrink: 0 }} /> {d}
                    </li>
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

      <Cartao
        titulo="Solicitação Formal de Contratação / Upgrade"
        nota={`Gere um protocolo formal de contratação para o plano ${plano}. A nossa equipa entrará em contacto com a coordenação de campanha.`}
        acao={<Selo tipo="OFICIAL" />}
      >
        <form onSubmit={pedirProposta}>
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
              <input type="email" placeholder="coordenacao@partido.ao" {...campo("email")} />
            </label>
            <label>
              Telefone / WhatsApp
              <input type="tel" placeholder="+244 9..." {...campo("telefone")} />
            </label>
          </div>

          <label style={{ margin: "10px 0" }}>
            Especificidades do Território e Observações
            <textarea rows={3} placeholder="Província prioritária, número de brigadas de campo e requisitos especiais de segurança..." {...campo("notas")} />
          </label>

          <div className="row" style={{ marginTop: "12px" }}>
            <button className="primary" type="submit" disabled={aEnviar}>
              {aEnviar ? "A processar protocolo…" : "Submeter Proposta Formal"}
            </button>
          </div>

          {protocolo && (
            <Aviso tipo="ok">
              Protocolo registado com sucesso: <strong>{protocolo}</strong>. O SLA de validação comercial é de 24 horas úteis.
            </Aviso>
          )}
          <Aviso>{erro}</Aviso>
        </form>
      </Cartao>
    </main>
  );
}
