import React, { useState } from "react";
import { api } from "../api.js";
import { IconeCheck, IconeFechar } from "../components/Icones.jsx";
import { Aviso, Cartao, Selo, Vazio } from "../components/ui.jsx";

export default function Discursos({ plano, sessao }) {
  const [municipio, setMunicipio] = useState("Luanda");
  const [discurso, setDiscurso] = useState(null);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  function tratarErro(exc) {
    if (exc.status === 401) {
      sessao.sair();
      setErro("A sessão terminou. Entre novamente no canto superior direito.");
    } else {
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
      setAviso("Este rascunho ainda não foi persistido. Submeta por POST /api/discursos/gerar para rever.");
      return;
    }
    setErro("");
    try {
      setDiscurso(
        await api(`/api/discursos/${discurso.id}/status`, {
          method: "PATCH",
          auth: true,
          plano,
          body: { status, responsavel_revisao: "Comité de Comunicação", comentarios_revisao: "Revisão na sala de comando." },
        }),
      );
    } catch (exc) {
      tratarErro(exc);
    }
  }

  const estado = discurso?.status_aprovacao || discurso?.status || "RASCUNHO";

  return (
    <main className="page">
      {!sessao.ativa && (
        <Vazio>
          Discursos territoriais exigem sessão da campanha. Use Entrar no cabeçalho. Em consulta CNE este módulo fica fechado.
        </Vazio>
      )}

      <Cartao
        titulo="Geração Estratégica de Discurso Territorializado"
        nota="Todas as minutas são geradas como rascunho de trabalho. Promessas recebem selo [PROMESSA — REVISAR] e exigem homologação do comitê político."
        acao={<Selo tipo="RASCUNHO" />}
      >
        <form onSubmit={gerar}>
          <div className="row">
            <label className="cresce">
              Município Alvo
              <input required value={municipio} onChange={(e) => setMunicipio(e.target.value)} placeholder="Viana, Cazenga, Lobito, Huambo..." />
            </label>
            <button className="primary" type="submit" disabled={!sessao.ativa}>Gerar Rascunho Territorial</button>
          </div>
        </form>

        <Aviso>{erro}</Aviso>
        <Aviso tipo="info">{aviso}</Aviso>

        {discurso && (
          <div className="bloco">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: "600" }}>Minuta de Discurso Político</span>
              <span className={`badge ${estado === "APROVADO" ? "badge-baixa" : estado === "REJEITADO" ? "badge-alta" : "badge-media"}`}>
                {estado}
              </span>
            </div>

            <p style={{ fontSize: "14px", lineHeight: "1.6", color: "var(--text-bright)", background: "rgba(0,0,0,0.25)", padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)" }}>
              {discurso.estrategia_discurso?.abertura_hook || discurso.texto || "Discurso formulado para o público-alvo territorial."}
            </p>

            {discurso.estrategia_discurso?.compromissos_prioritarios?.length > 0 && (
              <div style={{ margin: "12px 0" }}>
                <span className="eyebrow" style={{ color: "var(--muted)" }}>Compromissos e Mensagens-Chave</span>
                <ul style={{ margin: "6px 0", paddingLeft: "18px", color: "var(--text)" }}>
                  {discurso.estrategia_discurso.compromissos_prioritarios.map((item, idx) => (
                    <li key={idx} style={{ margin: "4px 0" }}>
                      <strong>{item.eixo || item.proposta_chave}:</strong> {item.descricao || item.proposta_chave}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="row" style={{ marginTop: "14px" }}>
              <button className="ghost" type="button" onClick={() => rever("EM_REVISAO")}>
                Submeter para Revisão
              </button>
              <button
                className="primary"
                type="button"
                onClick={() => rever("APROVADO")}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <IconeCheck size={14} /> Homologar / Aprovar
              </button>
              <button
                className="ghost perigo"
                type="button"
                onClick={() => rever("REJEITADO")}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <IconeFechar size={14} /> Rejeitar
              </button>
            </div>
          </div>
        )}
      </Cartao>
    </main>
  );
}
