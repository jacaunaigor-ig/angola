import React from "react";
import { exportarCsv } from "../lib/exportar.js";
import { fmtInt, fmtPct, rotuloZona } from "../territorio.js";

export default function BriefingDia({ linhas, onEscolher }) {
  const prioridade = [...linhas].sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
  const top5 = prioridade.slice(0, 5);
  const disputa = linhas.filter((r) => r.zonamento_activo === "CAMPO_BATALHA");
  const virar = prioridade.filter((r) => Number(r.votos_para_virar_cadeira) > 0).slice(0, 3);

  function descarregar() {
    exportarCsv(
      `briefing-prioridade-${new Date().toISOString().slice(0, 10)}.csv`,
      prioridade,
      [
        { rotulo: "Território", valor: (r) => r.nome },
        { rotulo: "Zona", valor: (r) => rotuloZona(r.zonamento_activo) },
        { rotulo: "Margem %", valor: (r) => r.margem_apurada_perc },
        { rotulo: "Eleitores CNE", valor: (r) => r.eleitores_cne },
        { rotulo: "Score", valor: (r) => r.score },
        { rotulo: "Custo logístico", valor: (r) => r.custo_logistico_fator },
        { rotulo: "Votos para virar", valor: (r) => r.votos_para_virar_cadeira },
      ],
    );
  }

  if (!linhas.length) return null;

  return (
    <section className="briefing" aria-label="Briefing do dia">
      <header className="briefing-topo">
        <div>
          <p className="eyebrow">Briefing do dia</p>
          <h2>Onde a campanha deve ir hoje</h2>
          <p className="muted">
            {disputa.length} círculos em disputa · {fmtInt(linhas.reduce((s, r) => s + (Number(r.eleitores_cne) || 0), 0))} eleitores no âmbito
          </p>
        </div>
        <button className="primary" type="button" onClick={descarregar}>
          Exportar CSV
        </button>
      </header>

      <ol className="briefing-lista">
        {top5.map((row, i) => (
          <li key={row.nome}>
            <button type="button" onClick={() => onEscolher?.(row)}>
              <span className="briefing-ordem">{String(i + 1).padStart(2, "0")}</span>
              <span>
                <strong>{row.nome}</strong>
                <small>
                  {rotuloZona(row.zonamento_activo)} · margem {fmtPct(row.margem_apurada_perc)} · score {fmtInt(row.score)}
                </small>
              </span>
            </button>
          </li>
        ))}
      </ol>

      {virar.length > 0 && (
        <p className="briefing-nota">
          Cadeiras mais baratas de virar:{" "}
          {virar.map((r) => `${r.nome} (${fmtInt(r.votos_para_virar_cadeira)} votos)`).join(" · ")}
        </p>
      )}
    </section>
  );
}
