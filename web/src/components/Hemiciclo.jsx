const TOTAL_ASSENTOS = 220;
const MAIORIA_ABSOLUTA = 111;
const FILAS = 9;

function contarFilas(total, filas) {
  const pesos = Array.from({ length: filas }, (_, i) => 0.52 + i * 0.11);
  const soma = pesos.reduce((a, b) => a + b, 0);
  const counts = pesos.map((p) => Math.max(8, Math.round((total * p) / soma)));
  let extra = counts.reduce((a, b) => a + b, 0) - total;
  let i = filas - 1;
  while (extra !== 0) {
    if (extra > 0 && counts[i] > 8) {
      counts[i] -= 1;
      extra -= 1;
    } else if (extra < 0) {
      counts[i] += 1;
      extra += 1;
    }
    i = (i - 1 + filas) % filas;
  }
  return counts;
}

function layoutFerradura(total = TOTAL_ASSENTOS) {
  const counts = contarFilas(total, FILAS);
  const cx = 420;
  const cy = 248;
  const inner = 78;
  const step = 18;
  const assentos = [];
  let idx = 0;
  counts.forEach((n, fila) => {
    const r = inner + fila * step;
    const span = Math.PI * 1.08;
    const start = Math.PI - (span - Math.PI) / 2;
    for (let k = 0; k < n; k += 1) {
      const t = n === 1 ? 0.5 : k / (n - 1);
      const ang = start - t * span;
      assentos.push({
        i: idx,
        x: cx + r * Math.cos(ang),
        y: cy - r * Math.sin(ang),
      });
      idx += 1;
    }
  });
  return assentos;
}

function corAssento(i, { mpla, unita, outros }) {
  if (i < mpla) return "var(--mpla)";
  if (i < mpla + unita) return "var(--unita)";
  if (i < mpla + unita + outros) return "#94a3b8";
  return "#334155";
}

export default function Hemiciclo({
  mpla = 124,
  unita = 90,
  outros = 6,
  titulo = "Assembleia Nacional · 220 deputados",
  nota = "Hemiciclo de ferradura. A linha a ouro marca a maioria absoluta (111 assentos).",
}) {
  const assentos = layoutFerradura(TOTAL_ASSENTOS);
  const restante = Math.max(0, TOTAL_ASSENTOS - mpla - unita - outros);
  return (
    <figure className="hemiciclo" aria-label={titulo}>
      <svg viewBox="0 0 840 320" role="img">
        <title>{titulo}</title>
        <text x="420" y="28" textAnchor="middle" className="hemiciclo-titulo">
          {titulo}
        </text>
        {assentos.map((s) => (
          <circle
            key={s.i}
            cx={s.x}
            cy={s.y}
            r={s.i === MAIORIA_ABSOLUTA - 1 ? 5.2 : 4.1}
            fill={corAssento(s.i, { mpla, unita, outros: outros + restante })}
            stroke={s.i === MAIORIA_ABSOLUTA - 1 ? "var(--accent)" : "transparent"}
            strokeWidth={s.i === MAIORIA_ABSOLUTA - 1 ? 1.6 : 0}
          >
            <title>
              Assento {s.i + 1}
              {s.i + 1 === MAIORIA_ABSOLUTA ? " · maioria absoluta" : ""}
            </title>
          </circle>
        ))}
        <text x="420" y="268" textAnchor="middle" className="hemiciclo-maioria">
          Maioria absoluta · 111
        </text>
      </svg>
      <figcaption>
        <span className="seat-pill mpla">{mpla} MPLA</span>
        <span className="seat-pill unita">{unita} UNITA</span>
        <span className="seat-pill">{outros + restante} outros</span>
        <span className="muted">{nota}</span>
      </figcaption>
    </figure>
  );
}
