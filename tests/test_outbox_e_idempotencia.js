/**
 * Testes da Fila SQLite (Outbox), varredura em lote e validação temporal.
 */
const assert = require('assert');
const { sqliteOutbox, STATUS_OUTBOX } = require('../mobile/src/services/sqliteOutbox');
const { confirmarHttp200, extrairUuidsConfirmados } = require('../mobile/src/services/outboxSync');
const { validarTimestampCampo } = require('../backend/src/utils/visitaTemporal');

async function executar() {
  let passou = 0;
  let total = 0;
  const asserir = (desc, cond) => {
    total += 1;
    if (cond) {
      console.log(`✅ [PASSOU] ${desc}`);
      passou += 1;
    } else {
      console.error(`❌ [FALHOU] ${desc}`);
    }
  };

  sqliteOutbox._resetParaTestes();
  const uuid = sqliteOutbox.gerarUuidVisita();
  asserir('Gera UUID v4 com 36 caracteres', typeof uuid === 'string' && uuid.length === 36);
  asserir('UUID contém o marcador de versão 4', uuid[14] === '4');

  const visita = await sqliteOutbox.enfileirarVisita({
    uuid,
    ativista_id: 'b0000000-0000-0000-0000-000000000001',
    sentimento: 'POSITIVO',
    localizacao: { longitude: 13.266, latitude: -8.916 },
    registado_em: new Date().toISOString(),
  });
  asserir('Enfileira visita com status implícito PENDENTE', visita.uuid === uuid);

  const pendentes = await sqliteOutbox.obterPendentes(10);
  asserir('Varredura lê o payload pendente da tabela local', pendentes.length === 1 && pendentes[0].uuid === uuid);
  asserir('Contagem de pendências = 1', (await sqliteOutbox.contarPendencias()) === 1);

  const corpo200 = {
    success: true,
    message: 'Lote de visitas processado com sucesso na base central.',
    uuids_sincronizados: [uuid],
    resumo: { total_recebidas: 1, uuids_sincronizados: [uuid] },
  };
  asserir('HTTP 200 com success=true é confirmação válida', confirmarHttp200({ status: 200 }, corpo200));
  asserir('HTTP 500 nunca confirma sincronização', confirmarHttp200({ status: 500 }, { success: true }) === false);

  const confirmados = extrairUuidsConfirmados(pendentes, corpo200);
  asserir('Extrai o uuid confirmado pelo backend', confirmados[0] === uuid);

  await sqliteOutbox.marcarSincronizados(confirmados);
  asserir('Após HTTP 200 o status local deixa de estar PENDENTE', (await sqliteOutbox.contarPendencias()) === 0);

  const agora = Date.now();
  const futuro = validarTimestampCampo({ registado_em: new Date(agora + 2 * 60 * 60 * 1000).toISOString() }, agora);
  asserir('Rejeita timestamp futuro absurdo', futuro.aceite === false && futuro.codigo === 'DATA_FUTURA');

  const antigo = validarTimestampCampo({
    registado_em: new Date(agora - 10 * 24 * 60 * 60 * 1000).toISOString(),
  }, agora);
  asserir('Rejeita mais de 7 dias offline sem justificativa', antigo.aceite === false && antigo.codigo === 'OFFLINE_SUPERIOR_7_DIAS');

  const justificado = validarTimestampCampo({
    registado_em: new Date(agora - 10 * 24 * 60 * 60 * 1000).toISOString(),
    justificativa_offline: 'Zona sem cobertura GSM durante missões no Cunene.',
  }, agora);
  asserir('Aceita offline > 7 dias quando há justificativa', justificado.aceite === true && justificado.revisao === true);

  const atual = validarTimestampCampo({ registado_em: new Date(agora).toISOString() }, agora);
  asserir('Aceita timestamp de campo corrente', atual.aceite === true);

  console.log(`\n${passou}/${total} testes do outbox e idempotência temporal.`);
  if (passou !== total) process.exit(1);
}

if (require.main === module) {
  executar().catch((erro) => {
    console.error(erro);
    process.exit(1);
  });
}

module.exports = executar;
