import React, { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { IconeRefresh } from "../components/Icones.jsx";
import { Aviso, Cartao, Selo, Vazio } from "../components/ui.jsx";

const ATALHOS = [
  "MESA Talatona",
  "MESA Cazenga",
  "QUEIXA agua Viana falta de água na torneira",
  "QUEIXA energia Cazenga cortes diários de luz",
  "AJUDA",
];

export default function Eleitor() {
  const [texto, setTexto] = useState("MESA Talatona");
  const [conversa, setConversa] = useState([]);
  const [queixas, setQueixas] = useState(null);
  const [erro, setErro] = useState("");

  const carregarQueixas = useCallback(async () => {
    try {
      setQueixas(await api("/api/whatsapp/queixas"));
    } catch (exc) {
      setErro(exc.message);
    }
  }, []);

  useEffect(() => {
    carregarQueixas();
  }, [carregarQueixas]);

  async function enviar(event) {
    event.preventDefault();
    const mensagem = texto.trim();
    if (!mensagem) return;
    setErro("");
    const agora = new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
    setConversa((c) => [...c, { de: "eleitor", texto: mensagem, hora: agora }]);
    try {
      const data = await api("/api/whatsapp/simular", { method: "POST", body: { texto: mensagem, de: "244900000111" } });
      setConversa((c) => [...c, { de: "canal", texto: data.texto, intencao: data.intencao, hora: agora }]);
      await carregarQueixas();
    } catch (exc) {
      setErro(exc.message);
    }
  }

  const maximo = Math.max(...(queixas?.agregado || []).map((i) => i.total), 1);

  return (
    <main className="page">
      <section className="grid-2">
        <Cartao
          titulo="Simulador do Canal de WhatsApp do Eleitor"
          nota="Atendimento público para localização de assembleias de voto e registo de queixas territoriais. O canal recusa BI e dados pessoais."
          acao={<Selo tipo="SIMULADO" />}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "rgba(0,0,0,0.25)", borderRadius: "var(--radius-sm)", marginBottom: "8px", border: "1px solid var(--line)" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#25d366" }} />
            <span style={{ fontSize: "12px", fontWeight: "600", color: "#25d366" }}>Canal Oficial Eleições 2027 (+244 9xx xxx xxx)</span>
          </div>

          <div className="conversa" aria-live="polite">
            {conversa.length === 0 && <Vazio>Envie uma mensagem de teste ou clique nos atalhos abaixo para simular a interacção com o bot.</Vazio>}
            {conversa.map((m, i) => (
              <div key={i} className={`bolha ${m.de}`}>
                <div>{m.texto}</div>
                <div style={{ fontSize: "10px", opacity: "0.6", textAlign: "right", marginTop: "4px" }}>{m.hora || "agora"}</div>
              </div>
            ))}
          </div>

          <div className="atalhos">
            {ATALHOS.map((a) => (
              <button key={a} type="button" className="ghost" onClick={() => setTexto(a)}>
                {a}
              </button>
            ))}
          </div>

          <form onSubmit={enviar} className="row">
            <label className="cresce">
              Mensagem do Eleitor
              <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Digite MESA ou QUEIXA..." />
            </label>
            <button className="primary" type="submit">Enviar</button>
          </form>

          <Aviso>{erro}</Aviso>
        </Cartao>

        <Cartao
          titulo="Radar de Queixas Comunitárias"
          nota="Relatos espontâneos de problemas urbanos nos municípios de Angola. Telefones recebidos são mascarados e armazenados com hash irreversível."
          acao={
            <button
              className="ghost"
              type="button"
              onClick={carregarQueixas}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <IconeRefresh size={14} /> Actualizar
            </button>
          }
        >
          {!queixas?.agregado?.length ? (
            <Vazio>Ainda não há queixas registadas no canal.</Vazio>
          ) : (
            <div className="table-responsive">
              <table>
                <caption className="sr-only">Queixas agregadas por município e tema</caption>
                <thead>
                  <tr>
                    <th>Município</th>
                    <th>Tema</th>
                    <th className="num">Ocorrências</th>
                  </tr>
                </thead>
                <tbody>
                  {queixas.agregado.map((item) => (
                    <tr key={`${item.municipio}-${item.categoria}`}>
                      <td><strong>{item.municipio}</strong></td>
                      <td>
                        <span className="badge badge-media">
                          {item.categoria}
                        </span>
                      </td>
                      <td className="num">
                        <div className="barra">
                          <i style={{ width: `${(item.total / maximo) * 100}%` }} />
                        </div>
                        <strong style={{ fontSize: "13px" }}>{item.total}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="muted" style={{ fontSize: "11.5px", marginTop: "12px" }}>
            As assembleias de voto de exemplo foram carregadas da base territorial DPA com rótulo <Selo tipo="SIMULADO" />. A assembleia oficial é confirmada exclusivamente pelos cadernos eleitorais da CNE.
          </p>
        </Cartao>
      </section>
    </main>
  );
}
