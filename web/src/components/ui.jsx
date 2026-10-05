const SELOS = {
  OFICIAL: "Publicado por órgão oficial (CNE, INE).",
  ESTIMADO: "Derivado por projecção ou agregação documentada.",
  SIMULADO: "Dado de demonstração ou cenário. Não usar como facto.",
  PROVISORIO: "Resultado parcial, ainda sem apuramento final.",
  RASCUNHO: "Texto gerado: exige revisão humana antes de uso.",
};

/** Etiqueta de proveniência. A plataforma nunca mostra um número sem dizer de onde vem. */
export function Selo({ tipo }) {
  return (
    <span className={`selo selo-${tipo.toLowerCase()}`} title={SELOS[tipo]}>
      {tipo}
    </span>
  );
}

export function Kpi({ rotulo, valor, selo, carregando }) {
  return (
    <article className="kpi">
      <span>
        {rotulo} {selo && <Selo tipo={selo} />}
      </span>
      <strong className={carregando ? "skeleton" : ""}>{carregando ? "\u00a0" : valor}</strong>
    </article>
  );
}

export function Cartao({ titulo, nota, acao, children, className = "" }) {
  return (
    <section className={`card ${className}`}>
      {(titulo || acao) && (
        <header className="card-head">
          <div>
            {titulo && <h2>{titulo}</h2>}
            {nota && <p className="muted">{nota}</p>}
          </div>
          {acao}
        </header>
      )}
      {children}
    </section>
  );
}

export function Aviso({ children, tipo = "erro", onFechar }) {
  if (!children) return null;
  return (
    <div className={`aviso aviso-${tipo}`} role={tipo === "erro" ? "alert" : "status"}>
      <span>{children}</span>
      {onFechar && (
        <button type="button" className="aviso-fechar" onClick={onFechar} aria-label="Fechar aviso">
          ×
        </button>
      )}
    </div>
  );
}

export function Vazio({ children }) {
  return <p className="vazio">{children}</p>;
}
