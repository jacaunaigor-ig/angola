const SERIES = [
  ["mpla", "MPLA", "#3d8fd1", null],
  ["unita", "UNITA", "#e08a3c", null],
  ["abstencao", "Abstenção", "#a8b0bb", "5 4"],
];

export default function GraficoSerie({ pontos }) {
  if (!pontos.length) return null;
  const largura = 640;
  const altura = 220;
  const margem = 30;
  const x = (i) => margem + (i * (largura - margem * 2)) / Math.max(pontos.length - 1, 1);
  const y = (v) => altura - margem - (Number(v) / 100) * (altura - margem * 2);
  const linha = (chave) => pontos.map((p, i) => `${x(i)},${y(p[chave])}`).join(" ");
  const resumo = pontos
    .map((p) => `${p.ano}: MPLA ${p.mpla}%, UNITA ${p.unita}%, abstenção ${p.abstencao}%`)
    .join(". ");

  return (
    <svg className="chart" viewBox={`0 0 ${largura} ${altura}`} role="img" aria-label={`Série nacional. ${resumo}`}>
      {[0, 25, 50, 75, 100].map((marca) => (
        <g key={marca}>
          <line x1={margem} x2={largura - margem} y1={y(marca)} y2={y(marca)} stroke="#2c3644" strokeWidth="1" />
          <text x="2" y={y(marca) + 4} fill="#9aa3ae" fontSize="11">{marca}</text>
        </g>
      ))}
      {SERIES.map(([chave, , cor, tracejado]) => (
        <polyline
          key={chave}
          fill="none"
          stroke={cor}
          strokeWidth={tracejado ? 2 : 2.5}
          strokeDasharray={tracejado || undefined}
          points={linha(chave)}
        />
      ))}
      {SERIES.map(([chave, , cor]) =>
        pontos.map((p, i) => (
          <circle key={`${chave}-${p.ano}`} cx={x(i)} cy={y(p[chave])} r="3.5" fill={cor} />
        )),
      )}
      {pontos.map((p, i) => (
        <text key={p.ano} x={x(i)} y={altura - 8} textAnchor="middle" fill="#f3f5f7" fontSize="12">{p.ano}</text>
      ))}
    </svg>
  );
}
