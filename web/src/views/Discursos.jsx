import React, { useState } from "react";
import { api } from "../api.js";
import { IconeCheck, IconeFechar } from "../components/Icones.jsx";
import { Aviso, Cartao, Selo, Vazio } from "../components/ui.jsx";
import { normalizarDiscurso } from "../discursos.js";

const formatarData = (valor) => {
  if (!valor) return "Data não disponível";
  const data = new Date(valor);
  return Number.isNaN(data.getTime())
    ? "Data não disponível"
    : data.toLocaleString("pt-PT");
};

export default function Discursos({ plano, sessao }) {
  const perfil = sessao.utilizador?.perfil;
  const podeGerir = !perfil || ["ADMIN", "ANALISTA"].includes(perfil);
  const [municipio, setMunicipio] = useState("Luanda");
  const [responsavel, setResponsavel] = useState(sessao.utilizador?.email || "");
  const [comentarios, setComentarios] = useState("");
  const [discurso, setDiscurso] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [erro, setErro] = useState("");
  const [aGerar, setAGerar] = useState(false);
  const [aConsultar, setAConsultar] = useState(false);
  const [aRever, setARever] = useState(false);

  function tratarErro(exc) {
    if (exc.status === 401) {
      sessao.sair();
      setErro("A sessão terminou. Entre novamente no cabeçalho.");
    } else {
      setErro(exc.message || "Não foi possível concluir a operação.");
    }
  }

  async function consultarHistorico(nomeMunicipio = municipio) {
    if (!podeGerir) return;
    const nome = nomeMunicipio.trim();
    if (!nome) {
      setErro("Informe um município para consultar o histórico.");
      return;
    }
    setErro("");
    setAConsultar(true);
    try {
      const data = await api(
        `/api/discursos/historico/${encodeURIComponent(nome)}`,
        { auth: true, plano },
      );
      setHistorico((data.historico || []).map(normalizarDiscurso));
    } catch (exc) {
      tratarErro(exc);
    } finally {
      setAConsultar(false);
    }
  }

  async function gerar(event) {
    event.preventDefault();
    if (!podeGerir) return;
    setErro("");
    setDiscurso(null);
    setAGerar(true);
    try {
      const data = await api("/api/discursos/gerar", {
        method: "POST",
        auth: true,
        plano,
        body: { municipio: municipio.trim() },
      });
      setDiscurso(normalizarDiscurso(data.discurso));
      await consultarHistorico(municipio);
    } catch (exc) {
      tratarErro(exc);
    } finally {
      setAGerar(false);
    }
  }

  async function rever(status) {
    if (!podeGerir) return;
    if (!discurso?.id) {
      setErro("Este rascunho não foi persistido. Gere novamente com uma base de dados disponível.");
      return;
    }
    if (responsavel.trim().length < 2) {
      setErro("Informe o nome ou e-mail da pessoa responsável pela revisão.");
      return;
    }
    setErro("");
    setARever(true);
    try {
      const data = await api(`/api/discursos/${discurso.id}/status`, {
        method: "PATCH",
        auth: true,
        plano,
        body: {
          status,
          responsavel_revisao: responsavel.trim(),
          comentarios_revisao: comentarios.trim() || null,
        },
      });
      const atualizado = normalizarDiscurso(data.discurso);
      setDiscurso({
        ...discurso,
        ...atualizado,
        municipio: atualizado.municipio || discurso.municipio,
        provincia: atualizado.provincia || discurso.provincia,
        zona: atualizado.zona || discurso.zona,
        abertura: atualizado.abertura || discurso.abertura,
        compromissos: atualizado.compromissos.length
          ? atualizado.compromissos
          : discurso.compromissos,
        dores: atualizado.dores.length ? atualizado.dores : discurso.dores,
        modelo: atualizado.modelo || discurso.modelo,
        criadoEm: atualizado.criadoEm || discurso.criadoEm,
      });
      await consultarHistorico(municipio);
    } catch (exc) {
      tratarErro(exc);
    } finally {
      setARever(false);
    }
  }

  const estado = discurso?.estado || "RASCUNHO";

  return (
    <main className="page">
      {!sessao.ativa ? (
        <Cartao titulo="Discursos de campanha" acao={<Selo tipo="RASCUNHO" />}>
          <Vazio>
            Este módulo consulta dados da campanha e grava cada rascunho para revisão. Entre com uma conta autorizada; a demonstração pública não gera nem aprova discursos.
          </Vazio>
        </Cartao>
      ) : !podeGerir ? (
        <Cartao titulo="Acesso restrito">
          <Vazio>
            A geração, consulta e revisão de discursos estão disponíveis apenas para perfis ADMIN e ANALISTA. O perfil {perfil} não tem uma destas permissões.
          </Vazio>
        </Cartao>
      ) : (
        <>
          <Cartao
            titulo="Rascunhos territoriais"
            nota="A geração usa a classificação eleitoral e carências agregadas da campanha no município. Cada rascunho fica registado no histórico e exige revisão humana antes de qualquer uso."
            acao={<Selo tipo="RASCUNHO" />}
          >
            <Aviso tipo="info">
              Fonte: dados territoriais e visitas da campanha. Se não houver registos de campo para o município, o sistema informa isso e não inventa carências. Promessas precisam de validação factual.
            </Aviso>
            <form onSubmit={gerar}>
              <div className="row">
                <label className="cresce">
                  Município
                  <input
                    required
                    maxLength={150}
                    value={municipio}
                    onChange={(event) => setMunicipio(event.target.value)}
                    placeholder="Viana, Cazenga, Lobito..."
                  />
                </label>
                <button className="primary" type="submit" disabled={aGerar}>
                  {aGerar ? "A gerar e guardar…" : "Gerar rascunho"}
                </button>
                <button
                  className="ghost"
                  type="button"
                  onClick={() => consultarHistorico()}
                  disabled={aConsultar || aGerar}
                >
                  {aConsultar ? "A consultar…" : "Ver histórico"}
                </button>
              </div>
            </form>

            {erro && <Aviso>{erro}</Aviso>}

            {discurso && (
              <article className="bloco">
                <header className="card-head">
                  <div>
                    <h3>{discurso.municipio}{discurso.provincia ? ` · ${discurso.provincia}` : ""}</h3>
                    <p className="muted">
                      {discurso.zona || "Zona não indicada"} · {discurso.modelo || "Modelo não indicado"} · {formatarData(discurso.criadoEm)}
                    </p>
                  </div>
                  <span className={`badge ${estado === "APROVADO" ? "badge-baixa" : estado === "REJEITADO" ? "badge-alta" : "badge-media"}`}>
                    {estado}
                  </span>
                </header>

                {discurso.dores.length > 0 ? (
                  <p className="muted">Carências agregadas usadas: {discurso.dores.join(", ")}</p>
                ) : (
                  <Aviso tipo="info">
                    Sem carências agregadas de visitas neste município. O texto não representa uma pesquisa de opinião.
                  </Aviso>
                )}

                <h4>Abertura</h4>
                <p className="bloco-texto">{discurso.abertura || "O serviço não devolveu uma abertura de discurso."}</p>

                {discurso.tom && <p><strong>Tom:</strong> {discurso.tom}</p>}

                {discurso.compromissos.length > 0 && (
                  <>
                    <h4>Propostas para validação</h4>
                    <ul>
                      {discurso.compromissos.map((item, index) => (
                        <li key={`${item.eixo}-${index}`}>
                          {item.eixo && <strong>{item.eixo}: </strong>}{item.texto}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {discurso.mensagemJovens && (
                  <>
                    <h4>Mensagem complementar</h4>
                    <p>{discurso.mensagemJovens}</p>
                  </>
                )}

                {discurso.cuidados.length > 0 && (
                  <>
                    <h4>Cuidados editoriais</h4>
                    <ul>{discurso.cuidados.map((item) => <li key={item}>{item}</li>)}</ul>
                  </>
                )}

                {estado !== "APROVADO" && estado !== "REJEITADO" && (
                  <div className="bloco">
                    <div className="row">
                      <label className="cresce">
                        Responsável pela revisão
                        <input
                          required
                          minLength={2}
                          maxLength={150}
                          value={responsavel}
                          onChange={(event) => setResponsavel(event.target.value)}
                          placeholder="Nome ou e-mail do revisor"
                        />
                      </label>
                      <label className="cresce">
                        Comentário (opcional)
                        <input
                          maxLength={2000}
                          value={comentarios}
                          onChange={(event) => setComentarios(event.target.value)}
                          placeholder="Fontes a verificar, alterações necessárias..."
                        />
                      </label>
                    </div>
                    <div className="row" style={{ marginTop: "12px" }}>
                      <button className="ghost" type="button" disabled={aRever} onClick={() => rever("EM_REVISAO")}>
                        Enviar para revisão
                      </button>
                      <button className="primary" type="button" disabled={aRever} onClick={() => rever("APROVADO")}>
                        <IconeCheck size={14} /> Aprovar após revisão
                      </button>
                      <button className="ghost perigo" type="button" disabled={aRever} onClick={() => rever("REJEITADO")}>
                        <IconeFechar size={14} /> Rejeitar
                      </button>
                    </div>
                  </div>
                )}
              </article>
            )}
          </Cartao>

          {historico.length > 0 && (
            <Cartao titulo={`Histórico de ${municipio}`} nota="Rascunhos e decisões registados nesta campanha.">
              <div className="table-responsive">
                <table>
                  <caption className="sr-only">Histórico de discursos por município</caption>
                  <thead>
                    <tr><th>Data</th><th>Modelo</th><th>Estado</th><th>Ação</th></tr>
                  </thead>
                  <tbody>
                    {historico.map((item) => (
                      <tr key={item.id}>
                        <td>{formatarData(item.criadoEm)}</td>
                        <td>{item.modelo || "Não indicado"}</td>
                        <td>{item.estado}</td>
                        <td>
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => setDiscurso(item)}
                          >
                            Consultar rascunho
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Cartao>
          )}
          {historico.length === 0 && !aConsultar && !erro && (
            <Vazio>Ainda não há rascunhos guardados para este município.</Vazio>
          )}
        </>
      )}
    </main>
  );
}
