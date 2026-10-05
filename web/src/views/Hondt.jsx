import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Aviso, Cartao, Kpi, Selo } from "../components/ui.jsx";
import MapaTerritorio from "../Mapa.jsx";
import { useTerritorio } from "../hooks/useDadosBase.js";
import { fmtInt } from "../territorio.js";

const CIRCULOS_PADRAO = [
  "Luanda", "Huambo", "Benguela", "Huíla", "Cuanza Sul", "Bié", "Uíge", "Malanje", "Zaire",
  "Cunene", "Cabinda", "Lunda Norte", "Lunda Sul", "Moxico", "Cuando Cubango", "Namibe", "Bengo", "Cuanza Norte",
];

const sinal = (v) => (v > 0 ? `+${v}%` : `${v}%`);

function Assentos({ mpla, unita, grande }) {
  return (
    <div className="seats-display">
      {Array.from({ length: mpla || 0 }, (_, i) => (
        <span key={`a${i}`} className={`seat-circle seat-a ${grande ? "seat-lg" : ""}`}>{grande ? "MPLA" : mpla}</span>
      ))}
      {Array.from({ length: unita || 0 }, (_, i) => (
        <span key={`b${i}`} className={`seat-circle seat-b ${grande ? "seat-lg" : ""}`}>{grande ? "UNITA" : unita}</span>
      ))}
    </div>
  );
}

export default function Hondt({ hondtGeral, contorno }) {
  const malha = useTerritorio("NACIONAL", "DPA_2016_18P");
  const [provincia, setProvincia] = useState("Huambo");
  const [choqueA, setChoqueA] = useState(0);
  const [choqueB, setChoqueB] = useState(0);
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
        titulo="Simulador do método de Hondt"
        nota="Cada círculo provincial elege 5 deputados. A eleição decide-se na disputa da última cadeira."
        acao={<Selo tipo="SIMULADO" />}
      >
        <div className="row">
          <label>Círculo provincial
            <select value={provincia} onChange={(e) => setProvincia(e.target.value)}>
              {circulos.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label>Choque MPLA: <strong>{sinal(choqueA)}</strong>
            <input type="range" min="-30" max="30" step="1" value={choqueA} onChange={(e) => setChoqueA(Number(e.target.value))} />
          </label>
          <label>Choque UNITA: <strong>{sinal(choqueB)}</strong>
            <input type="range" min="-30" max="30" step="1" value={choqueB} onChange={(e) => setChoqueB(Number(e.target.value))} />
          </label>
          <button className="ghost" type="button" onClick={() => { setChoqueA(0); setChoqueB(0); }}>Repor cenário</button>
        </div>
        <Aviso>{erro}</Aviso>
      </Cartao>

      <section className="grid-2">
        <Cartao
          titulo="Círculos no território"
          nota="Clique numa província para abrir o simulador Hondt desse círculo. Só os 18 círculos de 2022 têm votos oficiais."
        >
          <MapaTerritorio
            features={malha.features}
            contorno={contorno}
            onSelect={(props) => {
              if (circulos.includes(props?.nome)) setProvincia(props.nome);
            }}
            selecionado={provincia}
            camada="zona"
            compacto
            mostrarNomes
            fundo="ruas"
          />
        </Cartao>
        <Cartao titulo={`Projecção: ${provincia}`} nota="5 assentos" className={aSimular ? "a-carregar" : ""}>
          {r ? (
            <>
              <Assentos mpla={r.assentos?.MPLA} unita={r.assentos?.UNITA} grande />
              <p>{r.resumo_verbal}</p>
              <p className="muted">
                Quociente de corte: <code>{fmtInt(r.quociente_corte)}</code> · última cadeira: {r.ultimo_eleito}
              </p>
              <h3>Disputa da próxima cadeira</h3>
              {Object.entries(r.disputa_proxima_cadeira || {}).map(([partido, info]) => (
                <div key={partido} className="linha-disputa">
                  <strong>{partido}</strong> · {info.assentos} assentos
                  {info.votos_para_proximo_assento > 0 ? (
                    <p>
                      Precisa de <strong>+{fmtInt(info.votos_para_proximo_assento)}</strong> votos
                      ({info.esforco_perc_validos}% dos válidos) para ganhar +1 deputado.
                      <span className={`badge badge-${(info.volatilidade_cadeira || "media").toLowerCase()}`}>
                        Volatilidade {info.volatilidade_cadeira}
                      </span>
                    </p>
                  ) : (
                    <p className="muted">Já tem todas as cadeiras possíveis neste cenário.</p>
                  )}
                  {info.folga_votos_manter_ultimo > 0 && (
                    <p className="muted">Folga: pode perder até {fmtInt(info.folga_votos_manter_ultimo)} votos antes de ceder 1 deputado.</p>
                  )}
                </div>
              ))}
            </>
          ) : (
            <div className="skeleton bloco-vazio" aria-busy="true" />
          )}
        </Cartao>
      </section>

      <Cartao titulo="Panorama dos 18 círculos" nota="Resultados CNE 2022, 90 deputados provinciais" acao={<Selo tipo="OFICIAL" />}>
          {hondtGeral && (
            <div className="kpis dois">
              <Kpi rotulo="MPLA" valor={hondtGeral.total_deputados_provinciais?.partido_a} />
              <Kpi rotulo="UNITA" valor={hondtGeral.total_deputados_provinciais?.partido_b} />
            </div>
          )}
          <table>
            <caption className="sr-only">Deputados por círculo provincial</caption>
            <thead>
              <tr><th>Círculo</th><th>MPLA</th><th>UNITA</th><th>Corte</th><th>Virar cadeira</th></tr>
            </thead>
            <tbody>
              {(hondtGeral?.provincias || []).map((p) => {
                const disp = p.disputa_proxima_cadeira?.MPLA || {};
                return (
                  <tr
                    key={p.provincia}
                    className={p.provincia === provincia ? "activa" : ""}
                    onClick={() => setProvincia(p.provincia)}
                    tabIndex={0}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setProvincia(p.provincia)}
                  >
                    <td><strong>{p.provincia}</strong></td>
                    <td><span className="seat-circle seat-a seat-sm">{p.assentos?.MPLA || 0}</span></td>
                    <td><span className="seat-circle seat-b seat-sm">{p.assentos?.UNITA || 0}</span></td>
                    <td>{fmtInt(p.quociente_corte)}</td>
                    <td>
                      {disp.votos_para_proximo_assento ? `+${fmtInt(disp.votos_para_proximo_assento)}` : "—"}
                      {disp.volatilidade_cadeira && (
                        <span className={`badge badge-${disp.volatilidade_cadeira.toLowerCase()}`}>{disp.volatilidade_cadeira}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
      </Cartao>
    </main>
  );
}
