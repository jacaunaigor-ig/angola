import React, { useState } from "react";
import {
  CANAIS,
  LEITURAS,
  PARTIDOS,
  PROVINCIAS,
  PUBLICOS,
  TEMAS,
  canalDaFonte,
  fraseLado,
  leituraPorId,
  mencaoNoTexto,
  planoDaSemana,
  publicoPorId,
  rotuloMencao,
  temaConhecido,
  termosDoLado,
} from "../campanha.js";
import { Aviso, Cartao, Selo } from "../components/ui.jsx";
import { useCampo } from "../hooks/useCampo.js";
import { useLeitura } from "../hooks/useLeitura.js";

const VAZIO = {
  canal: "TikTok",
  tema: "EMPREGO",
  publico: "jovem_urbano",
  provincia: "Nacional",
  leitura: "facto",
  texto: "",
};

const ORIGENS = ["Estado", "Privado", "Economia", "Independente", "Internacional", "Rede"];

export default function Redes() {
  const [campo, actualizar] = useCampo();
  const [filtro, setFiltro] = useState("");
  const [rascunho, setRascunho] = useState(VAZIO);
  const [avisoPeca, setAvisoPeca] = useState("");

  function patchLado(lado, parcial) {
    actualizar({ ...campo, [lado]: { ...campo[lado], ...parcial } });
  }

  function guardarRegisto(event) {
    event.preventDefault();
    const texto = rascunho.texto.trim();
    if (!texto) return;
    const registo = {
      id: crypto.randomUUID(),
      ...rascunho,
      texto,
      em: new Date().toISOString(),
    };
    actualizar({ ...campo, registos: [registo, ...campo.registos].slice(0, 80) });
    setRascunho({ ...VAZIO, texto: "" });
    setAvisoPeca("");
  }

  function usarManchete(item) {
    const tema = temaConhecido((item.temas || [])[0]);
    setRascunho({
      canal: canalDaFonte(item.fonte, item.titulo),
      tema,
      publico: "jovem_urbano",
      provincia: "Nacional",
      leitura: "facto",
      texto: item.titulo || "",
    });
    setAvisoPeca("A manchete ficou no formulário, como facto público. Dizer se favorece ou critica é decisão tua.");
    document.getElementById("registo-peca")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function apagar(id) {
    actualizar({ ...campo, registos: campo.registos.filter((r) => r.id !== id) });
  }

  const leitura = useLeitura();
  const visiveis = campo.registos.filter((r) => !filtro || r.publico === filtro);
  const contagem = PUBLICOS.map((p) => ({
    ...p,
    n: campo.registos.filter((r) => r.publico === p.id).length,
  }));

  return (
    <main className="page">
      <section className="imparcial">
        <p className="eyebrow">Para a venda</p>
        <h2>O GPS cabe em qualquer lado político</h2>
        <p>
          A sala não é do MPLA nem da UNITA. Quem compra escolhe o partido; a CNE, o mapa e as manchetes
          ficam iguais. A ferramenta lê o adversário. Não escreve a campanha dele.
        </p>
      </section>

      <Cartao
        titulo="Lado desta sala"
        nota="Na demonstração fica vazio. O cliente preenche o seu partido e, se quiser, o adversário que vai ler."
      >
        <div className="lados">
          <Candidato
            rotulo="Cliente"
            lado={campo.nosso}
            onChange={(parcial) => patchLado("nosso", parcial)}
            placeholder="Nome do candidato, quando existir"
          />
          <Candidato
            rotulo="Adversário em leitura"
            lado={campo.adversario}
            onChange={(parcial) => patchLado("adversario", parcial)}
            placeholder="Nome público do adversário"
          />
        </div>
        <p className="muted lado-frase">{fraseLado(campo)}</p>
      </Cartao>

      <PlanoSemana estado={leitura} />
      <LeituraSemanal estado={leitura} campo={campo} onRegistar={usarManchete} />

      <Cartao titulo="Três públicos" nota="O mesmo círculo não se ganha com a mesma frase. Metade do país continua offline.">
        <div className="publicos">
          {contagem.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`publico${filtro === p.id ? " activo" : ""}`}
              onClick={() => setFiltro(filtro === p.id ? "" : p.id)}
            >
              <strong>{p.nome}</strong>
              <span>{p.canal}</span>
              <p>{p.faz}</p>
              <em>{p.n === 1 ? "1 registo" : `${p.n} registos`}</em>
            </button>
          ))}
        </div>
      </Cartao>

      <Cartao
        titulo="O que circula"
        nota="Uma linha por peça pública. O registo diz se favorece o cliente, o critica, ou é só um facto. Não é sondagem."
        acao={<Selo tipo="RASCUNHO" />}
      >
        <form id="registo-peca" onSubmit={guardarRegisto} className="rede-form">
          {avisoPeca && <p className="rede-aviso">{avisoPeca}</p>}
          <label>
            Canal
            <select value={rascunho.canal} onChange={(e) => setRascunho({ ...rascunho, canal: e.target.value })}>
              {CANAIS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label>
            Tema
            <select value={rascunho.tema} onChange={(e) => setRascunho({ ...rascunho, tema: e.target.value })}>
              {TEMAS.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
            </select>
          </label>
          <label>
            Público
            <select value={rascunho.publico} onChange={(e) => setRascunho({ ...rascunho, publico: e.target.value })}>
              {PUBLICOS.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </label>
          <label>
            Leitura
            <select value={rascunho.leitura} onChange={(e) => setRascunho({ ...rascunho, leitura: e.target.value })}>
              {LEITURAS.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
            </select>
          </label>
          <label>
            Província
            <select value={rascunho.provincia} onChange={(e) => setRascunho({ ...rascunho, provincia: e.target.value })}>
              {PROVINCIAS.map((nome) => <option key={nome}>{nome}</option>)}
            </select>
          </label>
          <label className="rede-texto">
            O que foi dito, em público
            <textarea
              required
              rows={3}
              value={rascunho.texto}
              placeholder="Ex.: vídeo público sobre emprego jovem. Sem link de conta privada."
              onChange={(e) => setRascunho({ ...rascunho, texto: e.target.value })}
            />
          </label>
          <button className="primary" type="submit">Registar</button>
        </form>

        {visiveis.length === 0 ? (
          <p className="muted">Ainda não há registos{filtro ? ` para ${publicoPorId(filtro).nome.toLowerCase()}` : ""}.</p>
        ) : (
          <ul className="rede-lista">
            {visiveis.map((r) => (
              <li key={r.id}>
                <div>
                  <strong>{r.canal}</strong>
                  <span>
                    {leituraPorId(r.leitura)} · {publicoPorId(r.publico).nome} · {TEMAS.find(([id]) => id === r.tema)?.[1] || r.tema} · {r.provincia}
                  </span>
                  <p>{r.texto}</p>
                </div>
                <button type="button" className="ghost" onClick={() => apagar(r.id)}>Tirar</button>
              </li>
            ))}
          </ul>
        )}
      </Cartao>

      <p className="muted">
        A escolha fica neste aparelho. Outro cliente, noutro browser, escolhe o lado dele.
      </p>
    </main>
  );
}

function PlanoSemana({ estado }) {
  if (estado.carregando) {
    return (
      <Cartao titulo="Pauta da semana" nota="Espera as manchetes. Sem elas, não há meio recomendado." acao={<Selo tipo="RASCUNHO" />}>
        <p className="muted">A recolher a leitura pública…</p>
      </Cartao>
    );
  }
  if (!estado.leitura) {
    return (
      <Cartao titulo="Pauta da semana" nota="Sem leitura, não há pauta." acao={<Selo tipo="RASCUNHO" />}>
        <p>Não inventes assunto. Quando a leitura voltar, o tema com mais manchetes sugere uma frase por público.</p>
      </Cartao>
    );
  }
  const plano = planoDaSemana(estado.leitura.temas);
  return (
    <Cartao
      titulo="Pauta da semana"
      nota="Três frases, uma por público. A barra na leitura compara as manchetes recolhidas, não o país."
      acao={<Selo tipo="RASCUNHO" />}
    >
      <p>{plano.nota}</p>
      <div className="plano-meios">
        {plano.meios.map((meio) => (
          <article key={meio.id} className="publico">
            <strong>{meio.nome}</strong>
            <span>{meio.canal}</span>
            <p>{meio.acao}</p>
          </article>
        ))}
      </div>
    </Cartao>
  );
}

function LeituraSemanal({ estado, campo, onRegistar }) {
  const leitura = estado.leitura;
  const temas = leitura?.temas || [];
  const maximo = Math.max(...temas.map((t) => t.manchetes), 1);
  const quando = leitura?.gerada_em ? new Date(leitura.gerada_em) : null;
  const proxima = leitura?.proxima_em ? new Date(leitura.proxima_em) : null;
  const [tema, setTema] = useState("");
  const [origem, setOrigem] = useState("");
  const [mencaoFiltro, setMencaoFiltro] = useState("");
  const [todas, setTodas] = useState(false);
  const ladoEscolhido = termosDoLado(campo?.nosso).length + termosDoLado(campo?.adversario).length > 0;
  const manchetes = (leitura?.manchetes || []).filter((item) => {
    if (tema && !(item.temas || []).includes(tema)) return false;
    if (!mencaoFiltro) return true;
    const codigo = mencaoNoTexto(`${item.titulo || ""} ${item.fonte || ""}`, campo);
    if (mencaoFiltro === "cliente") return codigo === "cliente" || codigo === "ambos";
    if (mencaoFiltro === "adversario") return codigo === "adversario" || codigo === "ambos";
    return codigo === mencaoFiltro;
  });
  const visiveis = todas ? manchetes : manchetes.slice(0, 6);
  const canais = (leitura?.canais || []).filter((canal) => !origem || canal.lado === origem);

  return (
    <Cartao
      titulo="Leitura da semana"
      nota="Uma vez por semana, para qualquer lista. Palavras nas manchetes públicas, não uma sondagem."
      acao={<Selo tipo="ESTIMADO" />}
    >
      <Aviso>{estado.erro}</Aviso>
      {leitura?.aviso && <Aviso tipo="info">{leitura.aviso}</Aviso>}
      {estado.carregando && <p className="muted">A recolher as manchetes públicas…</p>}
      {leitura && (
        <>
          <p className="muted">
            {quando ? `Feita em ${quando.toLocaleDateString("pt-PT")}.` : ""}
            {proxima ? ` A próxima automática é ${proxima.toLocaleDateString("pt-PT")}.` : ""}
            {leitura.em_cache ? " Esta semana já estava guardada." : ""}
          </p>
          <p>{leitura.nota}</p>
          <div className="temas-semana">
            {temas.map((item) => (
              <button
                key={item.id}
                type="button"
                className={tema === item.id ? "activo" : ""}
                onClick={() => setTema(tema === item.id ? "" : item.id)}
              >
                <span>{item.nome}</span>
                <strong>{item.manchetes}</strong>
                <i style={{ width: `${Math.round((item.manchetes / maximo) * 100)}%` }} />
              </button>
            ))}
          </div>
          {ladoEscolhido && (
            <div className="filtros-canal" role="group" aria-label="Menção aos lados">
              <button type="button" className={`ghost${!mencaoFiltro ? " activa" : ""}`} onClick={() => setMencaoFiltro("")}>Todas</button>
              <button type="button" className={`ghost${mencaoFiltro === "cliente" ? " activa" : ""}`} onClick={() => setMencaoFiltro(mencaoFiltro === "cliente" ? "" : "cliente")}>Nomeia o cliente</button>
              <button type="button" className={`ghost${mencaoFiltro === "adversario" ? " activa" : ""}`} onClick={() => setMencaoFiltro(mencaoFiltro === "adversario" ? "" : "adversario")}>Nomeia o adversário</button>
            </div>
          )}
          <ul className="manchetes">
            {visiveis.map((item) => {
              const mencao = mencaoNoTexto(`${item.titulo || ""} ${item.fonte || ""}`, campo);
              const rotulo = rotuloMencao(mencao);
              return (
                <li key={item.ligacao || item.titulo}>
                  <a href={item.ligacao} target="_blank" rel="noreferrer">{item.titulo}</a>
                  <button type="button" className="ghost" onClick={() => onRegistar(item)}>Usar no registo</button>
                  <span>
                    {item.fonte}
                    {rotulo ? ` · ${rotulo}` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
          {manchetes.length === 0 && <p className="muted">Nenhuma manchete desta semana cai nesse filtro.</p>}
          {manchetes.length > 6 && (
            <button type="button" className="ghost" onClick={() => setTodas(!todas)}>
              {todas ? "Mostrar menos" : `Ver as ${manchetes.length} manchetes`}
            </button>
          )}
          <p className="muted">{leitura.redes}</p>
          <p className="muted">{leitura.estudo_audiencia}</p>
          <div className="filtros-canal" role="group" aria-label="Origem do canal">
            <button type="button" className={`ghost${!origem ? " activa" : ""}`} onClick={() => setOrigem("")}>Todos</button>
            {ORIGENS.map((nome) => (
              <button
                key={nome}
                type="button"
                className={`ghost${origem === nome ? " activa" : ""}`}
                onClick={() => setOrigem(origem === nome ? "" : nome)}
              >
                {nome}
              </button>
            ))}
          </div>
          <div className="canais">
            {canais.map((canal) => (
              <a key={canal.nome} href={canal.url} target="_blank" rel="noreferrer">
                <strong>{canal.nome}</strong>
                <span>{canal.lado} · {canal.meio}</span>
              </a>
            ))}
          </div>
        </>
      )}
    </Cartao>
  );
}

function Candidato({ rotulo, lado, onChange, placeholder }) {
  return (
    <article className="kpi candidato">
      <span>{rotulo} <Selo tipo="RASCUNHO" /></span>
      <label>
        Partido
        <select
          value={lado.partido}
          onChange={(e) => onChange({ partido: e.target.value, estado: e.target.value && lado.nome.trim() ? lado.estado : "POR_ANUNCIAR" })}
        >
          <option value="">Ainda não escolhido</option>
          {PARTIDOS.map((partido) => <option key={partido}>{partido}</option>)}
        </select>
      </label>
      <label>
        Candidato
        <input
          value={lado.nome}
          placeholder={placeholder}
          onChange={(e) => onChange({ nome: e.target.value, estado: e.target.value.trim() && lado.partido ? lado.estado : "POR_ANUNCIAR" })}
        />
      </label>
      <select
        value={lado.estado}
        onChange={(e) => onChange({ estado: e.target.value })}
        disabled={!lado.partido || !lado.nome.trim()}
      >
        <option value="POR_ANUNCIAR">Por anunciar</option>
        <option value="ANUNCIADO">Anunciado</option>
      </select>
    </article>
  );
}
