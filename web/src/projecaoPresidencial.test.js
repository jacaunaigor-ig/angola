import assert from "node:assert/strict";
import test from "node:test";

import { projetarCorridaPresidencial } from "./projecaoPresidencial.js";

const serie = {
  eleicoes: [
    {
      ano: 2012,
      votos_validos: 5756004,
      url_fonte: "https://example.test/2012",
      partidos: [
        { sigla: "MPLA", votos: 4135503 },
        { sigla: "UNITA", votos: 1074565 },
      ],
    },
    {
      ano: 2017,
      votos_validos: 6817877,
      url_fonte: "https://example.test/2017",
      partidos: [
        { sigla: "MPLA", votos: 4164157 },
        { sigla: "UNITA", votos: 1818903 },
      ],
    },
    {
      ano: 2022,
      votos_validos: 6272104,
      url_fonte: "https://example.test/2022",
      partidos: [
        { sigla: "MPLA", votos: 3209429 },
        { sigla: "UNITA", votos: 2756786 },
        { sigla: "PRS", votos: 71351 },
      ],
    },
  ],
};

test("usa os resultados CNE mais recentes como cenário de referência", () => {
  const resultado = projetarCorridaPresidencial(serie);
  const referencia = resultado.cenarios[0].votos;

  assert.equal(resultado.ano_base, 2022);
  assert.equal(resultado.ano_alvo, 2027);
  assert.equal(referencia.MPLA, Math.round((3209429 / 6272104) * 1000) / 10);
  assert.equal(referencia.UNITA, 43.9);
  assert.equal(referencia.MPLA + referencia.UNITA + referencia["Outras forças"], 100);
  assert.equal(referencia.lider, "MPLA");
});

test("produz cenários matemáticos limitados a zero–cem por cento e com total de 100%", () => {
  const resultado = projetarCorridaPresidencial(serie);

  assert.equal(resultado.cenarios.length, 3);
  for (const cenario of resultado.cenarios) {
    const votos = cenario.votos;
    assert.ok(votos.MPLA >= 0 && votos.MPLA <= 100);
    assert.ok(votos.UNITA >= 0 && votos.UNITA <= 100);
    assert.ok(Math.abs(votos.MPLA + votos.UNITA + votos["Outras forças"] - 100) <= 0.1);
    assert.ok(["MPLA", "UNITA", "Empate"].includes(votos.lider));
  }
  assert.notEqual(
    resultado.cenarios[1].votos.MPLA,
    resultado.cenarios[0].votos.MPLA,
  );
});

test("não cria projeção sem três eleições comparáveis", () => {
  assert.equal(projetarCorridaPresidencial({ eleicoes: serie.eleicoes.slice(1) }), null);
});

test("não projeta para um ano anterior à eleição de referência", () => {
  assert.equal(projetarCorridaPresidencial(serie, 2020), null);
});

test("mantém o total em 100% quando a participação histórica de uma lista atinge o limite", () => {
  const dados = {
    eleicoes: serie.eleicoes.map((eleicao) => ({
      ...eleicao,
      partidos: [
        { sigla: "MPLA", votos: 99 },
        { sigla: "UNITA", votos: 1 },
      ],
      votos_validos: 100,
    })),
  };
  const resultado = projetarCorridaPresidencial(dados);

  for (const cenario of resultado.cenarios) {
    assert.equal(
      cenario.votos.MPLA + cenario.votos.UNITA + cenario.votos["Outras forças"],
      100,
    );
    assert.ok(cenario.votos.UNITA >= 0);
  }
});
