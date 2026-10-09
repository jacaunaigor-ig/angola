import React from "react";

export default function FilmeNarra({ passo, total, titulo, fala, onParar, onAnterior, onSeguinte }) {
  return (
    <aside className="filme-narra" aria-live="polite">
      <div className="filme-narra-texto">
        <p className="eyebrow">Demonstração {passo + 1}/{total}</p>
        <strong>{titulo}</strong>
        <p>{fala}</p>
      </div>
      <div className="filme-narra-acoes">
        <ol className="filme-passos" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <li key={i} className={i === passo ? "activo" : i < passo ? "feito" : ""} />
          ))}
        </ol>
        <div className="filme-botoes">
          <button className="ghost" type="button" onClick={onAnterior} disabled={passo === 0}>
            Anterior
          </button>
          <button className="ghost" type="button" onClick={onSeguinte} disabled={passo >= total - 1}>
            Seguinte
          </button>
          <button className="ghost" type="button" onClick={onParar}>
            Parar
          </button>
        </div>
      </div>
    </aside>
  );
}
