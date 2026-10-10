import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { priorizar } from "./territorio.js";

describe("priorizar", () => {
  it("não inventa score quando proveniencia_votos é AUSENTE", () => {
    const ordenadas = priorizar(
      [
        { nome: "Icolo e Bengo", proveniencia_votos: "AUSENTE", eleitores_cne: 0 },
        { nome: "Huambo", proveniencia_votos: "OFICIAL", score_prioridade: 53.5, eleitores_cne: 1104000 },
      ],
      { disputa: 4, volume: 3, abstencao: 3, jovens: 2 },
    );
    const ausente = ordenadas.find((r) => r.nome === "Icolo e Bengo");
    const oficial = ordenadas.find((r) => r.nome === "Huambo");
    assert.equal(ausente.score, null);
    assert.equal(oficial.score, 53.5);
  });
});
