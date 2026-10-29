import assert from "node:assert/strict";
import test from "node:test";

import { canalDaFonte, mencaoNoTexto, planoDaSemana } from "./campanha.js";

const campo = {
  nosso: { partido: "UNITA", nome: "Adalberto Costa Júnior", estado: "ANUNCIADO" },
  adversario: { partido: "MPLA", nome: "", estado: "POR_ANUNCIAR" },
};

test("mencao distingue cliente, adversario e silêncio", () => {
  assert.equal(mencaoNoTexto("UNITA fala de emprego jovem", campo), "cliente");
  assert.equal(mencaoNoTexto("Congresso do MPLA em Luanda", campo), "adversario");
  assert.equal(mencaoNoTexto("UNITA e MPLA no mesmo comício", campo), "ambos");
  assert.equal(mencaoNoTexto("Falta de água no bairro", campo), "nenhum");
});

test("Outro e lado vazio não marcam a palavra outro", () => {
  const neutro = {
    nosso: { partido: "Outro", nome: "", estado: "POR_ANUNCIAR" },
    adversario: { partido: "", nome: "", estado: "POR_ANUNCIAR" },
  };
  assert.equal(mencaoNoTexto("Outro jornal fala de água", neutro), "nenhum");
});

test("pauta usa o tema com mais manchetes e não inventa votos", () => {
  const plano = planoDaSemana([
    { id: "AGUA", nome: "Água", manchetes: 2 },
    { id: "LUZ", nome: "Luz", manchetes: 4 },
  ]);
  assert.equal(plano.temaId, "LUZ");
  assert.equal(plano.meios.length, 3);
  assert.match(plano.nota, /palavras, não votos/);
  assert.equal(plano.meios.some((meio) => /sondagem|intenção de voto|percentagem/i.test(meio.acao)), false);

  const vazio = planoDaSemana([]);
  assert.equal(vazio.temaId, "");
  assert.match(vazio.nota, /Não há pauta/);
  assert.match(vazio.meios[2].acao, /rádio/i);
});

test("canal da manchete segue o meio, não o partido", () => {
  assert.equal(canalDaFonte("RNA", "Corte de luz no Huambo"), "Rádio");
  assert.equal(canalDaFonte("TPA", "Telejornal"), "TPA");
  assert.equal(canalDaFonte("Novo Jornal", "Emprego jovem"), "Imprensa");
  assert.equal(canalDaFonte("TikTok", "Vídeo de quinze segundos"), "TikTok");
});
