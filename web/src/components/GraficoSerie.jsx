const SERIES = [
  ["mpla", "MPLA", "var(--mpla)", null],
  ["unita", "UNITA", "var(--unita)", null],
  ["abstencao", "Abstenção", "#94a3b8", "5 4"],
];

export default function GraficoSerie({ pontos }) {
  if (!pontos.length) return null;
  const largura = 680;
  const altura = 250;
  const margemX = 42;
  const margemY = 34;

  const x = (i) => margemX + (i * (largura - margemX * 2)) / Math.max(pontos.length - 1, 1);
  const y = (v) => altura - margemY - (Number(v) / 100) * (altura - margemY * 2);
  const linha = (chave) => pontos.map((p, i) => `${x(i)},${y(p[chave])}`).join(" ");

  const resumo = pontos
    .map((p) => `${p.ano}: MPLA ${p.mpla}%, UNITA ${p.unita}%, abstenção ${p.abstencao}%`)
    .join(". ");

  return (
    <div className="grafico-campanha">
      <svg className="chart" viewBox={`0 0 ${largura} ${altura}`} role="img" aria-label={`Série nacional. ${resumo}`}>
        {/* Linhas de grelha horizontais */}
        {[0, 25, 50, 75, 100].map((marca) => (
          <g key={marca}>
            <line x1={margemX} x2={largura - margemX} y1={y(marca)} y2={y(marca)} stroke="var(--line)" strokeWidth="1" />
            <text x={margemX - 8} y={y(marca) + 4} textAnchor="end" fill="var(--muted)" fontSize="11" fontFamily="monospace">
              {marca}%
            </text>
          </g>
        ))}

        {/* Linhas de tendência */}
        {SERIES.map(([chave, , cor, tracejado]) => (
          <polyline
            key={chave}
            fill="none"
            stroke={cor}
            strokeWidth={tracejado ? 2 : 2.8}
            strokeDasharray={tracejado || undefined}
            strokeLinejoin="round"
            points={linha(chave)}
          />
        ))}

        {/* Círculos e rótulos de valores nos pontos */}
        {pontos.map((p, i) => (
          <g key={`pontos-${p.ano}`}>
            {/* MPLA */}
            {p.mpla !== null && (
              <g>
                <circle cx={x(i)} cy={y(p.mpla)} r="4.5" fill="var(--mpla)" stroke="var(--bg)" strokeWidth="1.5" />
                <text x={x(i)} y={y(p.mpla) - 9} textAnchor="middle" fill="#93c5fd" fontSize="11" fontWeight="700">
                  {p.mpla}%
                </text>
              </g>
            )}

            {/* UNITA */}
            {p.unita !== null && (
              <g>
                <circle cx={x(i)} cy={y(p.unita)} r="4.5" fill="var(--unita)" stroke="var(--bg)" strokeWidth="1.5" />
                <text x={x(i)} y={y(p.unita) + 16} textAnchor="middle" fill="#fdba74" fontSize="11" fontWeight="700">
                  {p.unita}%
                </text>
              </g>
            )}

            {/* Abstenção */}
            {p.abstencao !== null && (
              <circle cx={x(i)} cy={y(p.abstencao)} r="3.5" fill="#94a3b8" />
            )}

            {/* Eixo X - Ano */}
            <text x={x(i)} y={altura - 8} textAnchor="middle" fill="var(--text-bright)" fontSize="12.5" fontWeight="600">
              {p.ano}
            </text>
          </g>
        ))}
      </svg>

      <div className="deputados-ano" aria-label="Distribuição de mandatos parlamentares na Assembleia Nacional (220 assentos)">
        <span className="eyebrow" style={{ color: "var(--muted)", margin: "4px 0 2px" }}>
          Distribuição dos 220 Mandatos Parlamentares
        </span>
        {pontos.map((p) => {
          const a = Number(p.depMpla) || 0;
          const b = Number(p.depUnita) || 0;
          const totalAN = 220;
          return (
            <div key={`dep-${p.ano}`}>
              <strong>{p.ano}</strong>
              <div className="barra-dupla" title={`MPLA: ${a} (${Math.round((a / totalAN) * 100)}%), UNITA: ${b} (${Math.round((b / totalAN) * 100)}%)`}>
                <i className="fatia-mpla" style={{ width: `${(a / totalAN) * 100}%` }} />
                <i className="fatia-unita" style={{ width: `${(b / totalAN) * 100}%` }} />
              </div>
              <strong style={{ fontSize: "12px" }}>
                <span style={{ color: "var(--mpla)" }}>{a}</span> / <span style={{ color: "var(--unita)" }}>{b}</span>
              </strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}
