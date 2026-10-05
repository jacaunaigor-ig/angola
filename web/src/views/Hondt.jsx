import { useEffect, useState } from "react";
import { api } from "../api.js";
import { IconeRefresh } from "../components/Icones.jsx";
import { Aviso, Cartao, Kpi, Selo } from "../components/ui.jsx";
import MapaTerritorio from "../Mapa.jsx";
import { fmtInt } from "../territorio.js";

const CIRCULOS_PADRAO = [
  "Luanda", "Huambo", "Benguela", "Huíla", "Cuanza Sul", "Bié", "Uíge", "Malanje", "Zaire",
  "Cunene", "Cabinda", "Lunda Norte", "Lunda Sul", "Moxico", "Cuando Cubango", "Namibe", "Bengo", "Cuanza Norte",
];

const sinal = (v) => (v > 0 ? `+${v}%` : `${v}%`);

function Assentos({ mpla = 0, unita = 0 }) {
  const total = Math.max(mpla + unita, 1);
  return (
    <div style={{ margin: "10px 0 14px" }}>
      <div className="seat-bar-container">
        <div className="seat-bar" style={{ height: "16px", borderRadius: "8px" }} aria-label={`MPLA: ${mpla}, UNITA: ${unita}`}>
          <div className="seat-bar-fatia mpla" style={{ width: `${(mpla / total) * 100}%` }} />
          <div className="seat-bar-fatia unita" style={{ width: `${(unita / total) * 100}%` }} />
        </div>
      </div>
      <div className="seats-display" style={{ marginTop: "8px" }}>
        <span className="seat-pill mpla" style={{ padding: "6px 14px", fontSize: "13px" }}>
          <i className="seat-dot mpla" style={{ width: "10px", height: "10px" }} /> {mpla} MPLA ({Math.round((mpla / 5) * 100)}%)
        </span>
        <span className="seat-pill unita" style={{ padding: "6px 14px", fontSize: "13px" }}>
          <i className="seat-dot unita" style={{ width: "10px", height: "10px" }} /> {unita} UNITA ({Math.round((unita / 5) * 100)}%)
        </span>
      </div>
    </div>
  );
}

export default function Hondt({ hondtGeral, contorno, territorio }) {
  const [provincia, setProvincia] = useState("Huambo");
  const [choqueA, setChoqueA] = useState(0);
  const [choqueB, setChoqueB] = useState(0);
  const [recentralizar, setRecentralizar] = useState(0);
  const [simulacao, setSimulacao] = useState(null);
  const [aSimular, setASimular] = useState(false);
  const [erro, setErro] = useState("");

  const circulos = hondtGeral?.provincias?.map((p) => p.provincia) || CIRCULOS_PADRAO;

  useEffect(() => {
    let ativo = true;
    setASimular(true);
    setErro("");
    api("/api/eleicoes/hondt-simulador", {
      method: "POST",
      body: {
        provincia,
        variacao_a_perc: Number(choqueA) || 0,
        variacao_b_perc: Number(choqueB) || 0,
        nome_partido_a: "MPLA",
        nome_partido_b: "UNITA",
        assentos: 5,
      },
    })
      .then((resp) => ativo && setSimulacao(resp))
      .catch((exc) => ativo && setErro(`Simulação indisponível: ${exc.message}`))
      .finally(() => ativo && setASimular(false));
    return () => {
      ativo = false;
    };
  }, [provincia, choqueA, choqueB]);

  const r = simulacao?.resultado;

  return (
    <main className="page">
      <Cartao
        titulo="Simulador Dinâmico do Método de D'Hondt"
        nota="Cada círculo provincial elege 5 deputados à Assembleia Nacional. Ajuste o choque de votos para antecipar viradas de assento."
        acao={<Selo tipo="SIMULADO" />}
      >
        <div className="controlos" style={{ background: "transparent", border: "0", padding: "0" }}>
          <label>
            Círculo Provincial
            <select value={provincia} onChange={(e) => setProvincia(e.target.value)}>
              {circulos.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>

          <label>
            Choque MPLA: <strong style={{ color: "var(--mpla)" }}>{sinal(choqueA)}</strong>
            <input
              type="range"
              min="-30"
              max="30"
              step="1"
              value={choqueA}
              onChange={(e) => setChoqueA(Number(e.target.value))}
            />
          </label>

          <label>
            Choque UNITA: <strong style={{ color: "var(--unita)" }}>{sinal(choqueB)}</strong>
            <input
              type="range"
              min="-30"
              max="30"
              step="1"
              value={choqueB}
              onChange={(e) => setChoqueB(Number(e.target.value))}
            />
          </label>

          <button
            className="ghost"
            type="button"
            onClick={() => {
              setChoqueA(0);
              setChoqueB(0);
              setRecentralizar((c) => c + 1);
            }}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <IconeRefresh size={14} /> Repor Cenário Neutro
          </button>
        </div>
        <Aviso>{erro}</Aviso>
      </Cartao>

      <section className="grid-2">
        <Cartao
          titulo={`Círculos Eleitorais: ${provincia}`}
          nota="Clique numa província do mapa para calcular o cenário e o quociente de corte do círculo."
        >
          <MapaTerritorio
            features={territorio?.features || []}
            contorno={contorno}
            onSelect={(props) => {
              if (circulos.includes(props?.nome)) setProvincia(props.nome);
            }}
            selecionado={provincia}
            camada="zona"
            compacto
            fundo="ruas"
            carregando={territorio?.carregando}
            resetTrigger={recentralizar}
          />
        </Cartao>

        <Cartao
          titulo={`Projecção Parlamentar: ${provincia}`}
          nota="Distribuição dos 5 mandatos e sensibilidade a variações de votos"
          className={aSimular ? "a-carregar" : ""}
        >
          {r ? (
            <>
              <Assentos mpla={r.assentos?.MPLA} unita={r.assentos?.UNITA} />
              <p style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-bright)" }}>
                {r.resumo_verbal}
              </p>
              <p className="muted" style={{ fontSize: "12px", marginTop: "4px" }}>
                Quociente eleitoral de corte: <code>{fmtInt(r.quociente_corte)} votos</code> · Último eleito: <strong>{r.ultimo_eleito}</strong>
              </p>

              <h3 style={{ marginTop: "18px" }}>Batalha pela Próxima Cadeira</h3>
              {Object.entries(r.disputa_proxima_cadeira || {}).map(([partido, info]) => (
                <div
                  key={partido}
                  className="linha-disputa"
                  style={{
                    padding: "10px 12px",
                    background: "rgba(0,0,0,0.2)",
                    borderRadius: "var(--radius-sm)",
                    margin: "8px 0",
                    border: "1px solid var(--line)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ color: partido === "MPLA" ? "var(--mpla)" : partido === "UNITA" ? "var(--unita)" : "var(--text)" }}>
                      {partido} ({info.assentos} assentos)
                    </strong>
                    {info.volatilidade_cadeira && (
                      <span className={`badge badge-${info.volatilidade_cadeira.toLowerCase()}`}>
                        Volatilidade {info.volatilidade_cadeira}
                      </span>
                    )}
                  </div>

                  {info.votos_para_proximo_assento > 0 ? (
                    <p style={{ margin: "6px 0 2px", fontSize: "12.5px" }}>
                      Precisa de <strong>+{fmtInt(info.votos_para_proximo_assento)}</strong> votos
                      ({info.esforco_perc_validos}% dos válidos) para virar +1 deputado.
                    </p>
                  ) : (
                    <p className="muted" style={{ fontSize: "12px", margin: "4px 0 0" }}>
                      Já conquistou a totalidade dos mandatos em disputa neste cenário.
                    </p>
                  )}

                  {info.folga_votos_manter_ultimo > 0 && (
                    <p className="muted" style={{ fontSize: "11.5px", margin: "4px 0 0" }}>
                      Folga de segurança: suporta perder até <strong>{fmtInt(info.folga_votos_manter_ultimo)}</strong> votos antes de ceder 1 deputado.
                    </p>
                  )}
                </div>
              ))}
            </>
          ) : (
            <div className="skeleton bloco-vazio" aria-busy="true" />
          )}
        </Cartao>
      </section>

      <Cartao
        titulo="Panorama dos 18 Círculos Provinciais"
        nota="Resultados oficiais CNE das Eleições Gerais de 2022 (90 deputados provinciais apurados)."
        acao={<Selo tipo="OFICIAL" />}
      >
        {hondtGeral && (
          <div className="kpis dois">
            <Kpi rotulo="Total Mandatos Provinciais MPLA" valor={`${hondtGeral.total_deputados_provinciais?.partido_a} / 90`} />
            <Kpi rotulo="Total Mandatos Provinciais UNITA" valor={`${hondtGeral.total_deputados_provinciais?.partido_b} / 90`} />
          </div>
        )}

        <div className="table-responsive">
          <table>
            <caption className="sr-only">Deputados por círculo provincial</caption>
            <thead>
              <tr>
                <th>Círculo</th>
                <th>MPLA</th>
                <th>UNITA</th>
                <th className="num">Quociente Corte</th>
                <th>Virar Cadeira (MPLA)</th>
              </tr>
            </thead>
            <tbody>
              {(hondtGeral?.provincias || []).map((p) => {
                const disp = p.disputa_proxima_cadeira?.MPLA || {};
                const activo = p.provincia === provincia;
                return (
                  <tr
                    key={p.provincia}
                    className={activo ? "activa" : ""}
                    onClick={() => setProvincia(p.provincia)}
                    tabIndex={0}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setProvincia(p.provincia)}
                  >
                    <td>
                      <strong>{p.provincia}</strong>
                      {activo && <small style={{ color: "var(--accent)", marginLeft: "8px" }}>● em análise</small>}
                    </td>
                    <td>
                      <span className="seat-pill mpla" style={{ padding: "2px 8px" }}>
                        {p.assentos?.MPLA || 0}
                      </span>
                    </td>
                    <td>
                      <span className="seat-pill unita" style={{ padding: "2px 8px" }}>
                        {p.assentos?.UNITA || 0}
                      </span>
                    </td>
                    <td className="num">{fmtInt(p.quociente_corte)}</td>
                    <td>
                      {disp.votos_para_proximo_assento ? (
                        <span>
                          <strong>+{fmtInt(disp.votos_para_proximo_assento)}</strong>
                          {disp.volatilidade_cadeira && (
                            <span
                              className={`badge badge-${disp.volatilidade_cadeira.toLowerCase()}`}
                              style={{ marginLeft: "8px" }}
                            >
                              {disp.volatilidade_cadeira}
                            </span>
                          )}
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Cartao>
    </main>
  );
}
