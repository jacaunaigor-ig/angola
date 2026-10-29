import test from "node:test";
import assert from "node:assert/strict";
import { normalizarDiscurso } from "./discursos.js";

test("normaliza o rascunho persistido recebido na geração", () => {
  const discurso = normalizarDiscurso({
    discurso: {
      id: "speech-1",
      municipio: "Viana",
      zonamento: "CAMPO_BATALHA",
      status_aprovacao: "RASCUNHO",
      modelo_ia: "heuristico_auditado_v1",
      hook_abertura: "Comunidade de Viana...",
      compromissos_propostas: [
        { dor_associada: "AGUA", texto_proposta: "[PROMESSA — REVISAR] Avaliar opções." },
      ],
      dores_territoriais: ["AGUA"],
    },
  });

  assert.equal(discurso.id, "speech-1");
  assert.equal(discurso.municipio, "Viana");
  assert.equal(discurso.abertura, "Comunidade de Viana...");
  assert.equal(discurso.compromissos[0].eixo, "AGUA");
});

test("normaliza linhas do histórico com campos JSON serializados", () => {
  const discurso = normalizarDiscurso({
    id: "speech-2",
    territorio_nome: "Cazenga",
    status_aprovacao: "APROVADO",
    compromissos_propostas: '[{"dor_associada":"LUZ","texto_proposta":"Rever iluminação."}]',
    armadilhas_evitar: '["Não inventar dados."]',
  });

  assert.equal(discurso.municipio, "Cazenga");
  assert.equal(discurso.estado, "APROVADO");
  assert.equal(discurso.compromissos[0].texto, "Rever iluminação.");
  assert.deepEqual(discurso.cuidados, ["Não inventar dados."]);
});
