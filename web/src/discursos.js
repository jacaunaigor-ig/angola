function listaJson(valor) {
  if (Array.isArray(valor)) return valor;
  if (typeof valor !== "string") return [];
  try {
    const convertido = JSON.parse(valor);
    return Array.isArray(convertido) ? convertido : [];
  } catch {
    return [];
  }
}

export function normalizarDiscurso(resposta) {
  const discurso = resposta?.discurso || resposta || {};
  const estrategia = discurso.estrategia_discurso || {};
  const compromissos = listaJson(
    discurso.compromissos_propostas || estrategia.compromissos_prioritarios,
  );

  return {
    id: discurso.id || null,
    municipio: discurso.municipio || discurso.territorio_nome || "",
    provincia: discurso.provincia || "",
    zona: discurso.zonamento || discurso.zona || "",
    estado: discurso.status_aprovacao || discurso.status || estrategia.status || "RASCUNHO",
    modelo: discurso.modelo_ia || discurso.modelo_ia_utilizado || "",
    criadoEm: discurso.criado_em || discurso.gerado_em || "",
    abertura: discurso.hook_abertura || estrategia.abertura_hook || discurso.texto || "",
    tom: discurso.tom_adotado || estrategia.tom?.classificacao || "",
    dores: listaJson(discurso.dores_territoriais),
    compromissos: compromissos.map((item) => ({
      eixo: item.dor_associada || item.dor_identificada || item.eixo || "",
      texto: item.texto_proposta || item.proposta_chave || item.descricao || "",
    })),
    mensagemJovens: discurso.bloco_juventude || estrategia.modulo_juventude?.mensagem_central || "",
    cuidados: listaJson(discurso.armadilhas_a_evitar || discurso.armadilhas_evitar),
  };
}
