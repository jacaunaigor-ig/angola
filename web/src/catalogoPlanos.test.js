import test from "node:test";
import assert from "node:assert/strict";
import { resumoPlano } from "./catalogoPlanos.js";

test("mostra apenas funcionalidades habilitadas no catálogo do plano", () => {
  const resumo = resumoPlano({
    funcionalidades: {
      cartografia: true,
      dia_d: false,
      recurso_desconhecido: true,
    },
  });

  assert.deepEqual(resumo.funcionalidades, ["Cartografia eleitoral no âmbito contratado"]);
  assert.deepEqual(resumo.limites, []);
});

test("apresenta apenas limites operacionais positivos", () => {
  const resumo = resumoPlano({
    limites: {
      contas_war_room: 5,
      brigadistas: 0,
      visitas_mes: 8000,
    },
  });

  assert.deepEqual(resumo.limites, [
    { nome: "Contas War Room", valor: 5 },
    { nome: "Visitas por mês", valor: 8000 },
  ]);
});
