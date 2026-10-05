import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { Aviso, Cartao, Selo, Vazio } from "../components/ui.jsx";

const ATALHOS = [
  "MESA Talatona",
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
    setConversa((c) => [...c, { de: "eleitor", texto: mensagem }]);
    try {
      const data = await api("/api/whatsapp/simular", { method: "POST", body: { texto: mensagem, de: "244900000111" } });
      setConversa((c) => [...c, { de: "canal", texto: data.texto, intencao: data.intencao }]);
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
          titulo="Simulador do canal"
          nota="O eleitor pergunta pela assembleia pública ou regista uma queixa de bairro. O canal nunca consulta o caderno nem o BI."
          acao={<Selo tipo="SIMULADO" />}
        >
          <div className="conversa" aria-live="polite">
            {conversa.length === 0 && <Vazio>Envie uma mensagem de teste ou escolha um atalho.</Vazio>}
            {conversa.map((m, i) => (
              <p key={i} className={`bolha ${m.de}`}>{m.texto}</p>
            ))}
          </div>
          <div className="atalhos">
            {ATALHOS.map((a) => (
              <button key={a} type="button" className="ghost" onClick={() => setTexto(a)}>{a}</button>
            ))}
          </div>
          <form onSubmit={enviar} className="row">
            <label className="cresce">Mensagem
              <input value={texto} onChange={(e) => setTexto(e.target.value)} />
            </label>
            <button className="primary" type="submit">Enviar</button>
          </form>
          <Aviso>{erro}</Aviso>
        </Cartao>

        <Cartao
          titulo="Queixas por município"
          nota="Telefones chegam mascarados e só o agregado é mostrado."
          acao={<button className="ghost" type="button" onClick={carregarQueixas}>Actualizar</button>}
        >
          {!queixas?.agregado?.length ? (
            <Vazio>Ainda não há queixas registadas.</Vazio>
          ) : (
            <table>
              <caption className="sr-only">Queixas agregadas por município e tema</caption>
              <thead><tr><th>Município</th><th>Tema</th><th>Total</th></tr></thead>
              <tbody>
                {queixas.agregado.map((item) => (
                  <tr key={`${item.municipio}-${item.categoria}`}>
                    <td>{item.municipio}</td>
                    <td>{item.categoria}</td>
                    <td>
                      <div className="barra"><i style={{ width: `${(item.total / maximo) * 100}%` }} /></div>
                      {item.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="muted">As mesas de exemplo vêm do seed do projecto e estão marcadas como simuladas. A mesa oficial confirma-se na CNE.</p>
        </Cartao>
      </section>
    </main>
  );
}
