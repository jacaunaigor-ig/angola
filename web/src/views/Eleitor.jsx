import React, { useCallback, useEffect, useState } from "react";
import { api, apiOrigin } from "../api.js";
import { IconeRefresh } from "../components/Icones.jsx";
import { Aviso, Cartao, Kpi, Vazio } from "../components/ui.jsx";

const ATALHOS = [
  "MESA Talatona",
  "MESA Cazenga",
  "QUEIXA agua Viana falta de água na torneira",
  "QUEIXA energia Cazenga cortes diários de luz",
  "AJUDA",
];
const SIMULADOR_LOCAL = import.meta.env.DEV && !apiOrigin();

export default function Eleitor({ sessao, plano }) {
  const [texto, setTexto] = useState(ATALHOS[0]);
  const [conversa, setConversa] = useState([]);
  const [queixas, setQueixas] = useState(null);
  const [erro, setErro] = useState("");
  const [aCarregar, setACarregar] = useState(false);
  const [aSimular, setASimular] = useState(false);

  const carregarQueixas = useCallback(async () => {
    if (!sessao.ativa) return;
    setErro("");
    setACarregar(true);
    try {
      const resultado = await api("/api/whatsapp/queixas", {
        auth: true,
        plano,
      });
      setQueixas(resultado);
    } catch (exc) {
      if (exc.status === 401) sessao.sair();
      setErro(exc.message || "Não foi possível carregar as queixas.");
    } finally {
      setACarregar(false);
    }
  }, [plano, sessao.ativa, sessao.sair]);

  useEffect(() => {
    if (sessao.ativa) carregarQueixas();
  }, [carregarQueixas, sessao.ativa]);

  async function simularMensagem(event) {
    event.preventDefault();
    const mensagem = texto.trim();
    if (!mensagem || !SIMULADOR_LOCAL) return;
    setErro("");
    setASimular(true);
    const hora = new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
    try {
      const data = await api("/api/whatsapp/simular", {
        method: "POST",
        body: { texto: mensagem },
      });
      setConversa((atual) => [
        ...atual,
        { de: "eleitor", texto: mensagem, hora },
        { de: "canal", texto: data.texto, intencao: data.intencao, hora },
      ]);
      await carregarQueixas();
    } catch (exc) {
      setErro(exc.message || "O simulador local não respondeu.");
    } finally {
      setASimular(false);
    }
  }

  if (!sessao.ativa) {
    return (
      <main className="page">
        <Cartao titulo="Canal do Eleitor">
          <Vazio>
            O painel de queixas contém informação operacional da campanha e exige sessão autenticada. Entre pelo cabeçalho para consultar os dados.
          </Vazio>
        </Cartao>
      </main>
    );
  }

  const agregado = queixas?.agregado || [];
  const maximo = Math.max(...agregado.map((item) => Number(item.total) || 0), 1);
  const origem = queixas?.persistencia === "postgres" ? "PostgreSQL" : queixas?.persistencia || "—";

  return (
    <main className="page">
      <Cartao
        titulo="Canal do Eleitor · operação"
        nota="Consulta apenas contagens agregadas de queixas recebidas. Acesso restrito à sessão da campanha."
        acao={<button className="ghost" type="button" onClick={carregarQueixas} disabled={aCarregar}>
          <IconeRefresh size={14} /> {aCarregar ? "A actualizar…" : "Actualizar"}
        </button>}
      >
        <div className="kpis">
          <Kpi rotulo="Relatos retidos" valor={queixas ? String(queixas.total) : "—"} carregando={aCarregar && !queixas} />
          <Kpi rotulo="Persistência" valor={origem} carregando={aCarregar && !queixas} />
          <Kpi rotulo="Retenção" valor={queixas ? `${queixas.retencao_dias} dias` : "—"} carregando={aCarregar && !queixas} />
        </div>
        <Aviso tipo="info">
          O webhook de entrada requer configuração e validação da Meta. Esta plataforma ainda não envia respostas automaticamente pela WhatsApp Cloud API; não há número oficial associado a este painel.
        </Aviso>
        <p className="muted">
          Os resultados abaixo são contagens por município e categoria. Não representam sondagem, intenção de voto nem prevalência na população.
        </p>
        {erro && (
          <Aviso>
            {erro}
            <button type="button" className="ghost" onClick={carregarQueixas} disabled={aCarregar}>
              Tentar novamente
            </button>
          </Aviso>
        )}
      </Cartao>

      <Cartao titulo="Queixas agregadas" nota="Relatos espontâneos recebidos pelo webhook e agrupados por município e tema.">
        {aCarregar && !queixas ? (
          <Vazio>A carregar dados da campanha…</Vazio>
        ) : agregado.length === 0 ? (
          <Vazio>Não há queixas registadas para esta campanha.</Vazio>
        ) : (
          <div className="table-responsive">
            <table>
              <caption className="sr-only">Queixas agregadas por município e tema</caption>
              <thead>
                <tr>
                  <th>Município</th>
                  <th>Tema</th>
                  <th className="num">Relatos</th>
                  <th>Volume relativo</th>
                </tr>
              </thead>
              <tbody>
                {agregado.map((item) => (
                  <tr key={`${item.municipio}-${item.categoria}`}>
                    <td><strong>{item.municipio}</strong></td>
                    <td><span className="badge badge-media">{item.categoria}</span></td>
                    <td className="num"><strong>{item.total}</strong></td>
                    <td>
                      <div className="barra" aria-label={`${Math.round((item.total / maximo) * 100)}% do maior grupo`}>
                        <i style={{ width: `${(item.total / maximo) * 100}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>

      {SIMULADOR_LOCAL && (
        <Cartao
          titulo="Teste local do interpretador"
          nota="Disponível apenas em desenvolvimento local. As mensagens e números são fictícios e não são enviados à Meta."
        >
          <div className="conversa" aria-live="polite">
            {conversa.length === 0 ? (
              <Vazio>Teste intenções de localização de mesa, ajuda e queixa sem usar um telefone real.</Vazio>
            ) : conversa.map((mensagem, indice) => (
              <div key={`${mensagem.hora}-${indice}`} className={`bolha ${mensagem.de}`}>
                <div>{mensagem.texto}</div>
                <div className="muted">{mensagem.intencao || "Mensagem de teste"} · {mensagem.hora}</div>
              </div>
            ))}
          </div>
          <div className="atalhos">
            {ATALHOS.map((atalho) => (
              <button key={atalho} type="button" className="ghost" onClick={() => setTexto(atalho)}>
                {atalho}
              </button>
            ))}
          </div>
          <form onSubmit={simularMensagem} className="row">
            <label className="cresce">
              Mensagem fictícia
              <input value={texto} onChange={(event) => setTexto(event.target.value)} maxLength={600} />
            </label>
            <button className="primary" type="submit" disabled={aSimular}>
              {aSimular ? "A testar…" : "Testar"}
            </button>
          </form>
        </Cartao>
      )}
    </main>
  );
}
