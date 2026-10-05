const MAX_TEMPO_FUTURO_MS = 15 * 60 * 1000;
const MAX_OFFLINE_SEM_JUSTIFICATIVA_MS = 7 * 24 * 60 * 60 * 1000;

function resolverUuidCliente(visita) {
  return visita.uuid || visita.id;
}

function validarTimestampCampo(visita, agora = Date.now()) {
  const timestampRegistro = new Date(visita.registado_em).getTime();
  const justificativa = typeof visita.justificativa_offline === 'string'
    ? visita.justificativa_offline.trim()
    : '';

  if (Number.isNaN(timestampRegistro)) {
    return {
      aceite: false,
      codigo: 'TIMESTAMP_INVALIDO',
      mensagem: 'O timestamp de campo é inválido.',
    };
  }

  if (timestampRegistro > agora + MAX_TEMPO_FUTURO_MS) {
    return {
      aceite: false,
      codigo: 'DATA_FUTURA',
      mensagem: 'Registo rejeitado: timestamp de campo no futuro (fora da margem de tolerância de 15 minutos).',
    };
  }

  if (timestampRegistro < agora - MAX_OFFLINE_SEM_JUSTIFICATIVA_MS && !justificativa) {
    return {
      aceite: false,
      codigo: 'OFFLINE_SUPERIOR_7_DIAS',
      mensagem: 'Registo rejeitado: mais de 7 dias offline sem justificativa de campo.',
    };
  }

  if (timestampRegistro < agora - MAX_OFFLINE_SEM_JUSTIFICATIVA_MS && justificativa) {
    return {
      aceite: true,
      revisao: true,
      codigo: 'OFFLINE_JUSTIFICADO',
      mensagem: 'Aceite com revisão humana: offline superior a 7 dias com justificativa.',
    };
  }

  return { aceite: true, revisao: false };
}

module.exports = {
  MAX_TEMPO_FUTURO_MS,
  MAX_OFFLINE_SEM_JUSTIFICATIVA_MS,
  resolverUuidCliente,
  validarTimestampCampo,
};
