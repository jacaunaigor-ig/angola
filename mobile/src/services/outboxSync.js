/**
 * Varredura da Fila de Sincronização (Outbox).
 * Ao detectar conectividade, envia visitas PENDENTES em lotes para POST /api/visitas
 * e só marca SINCRONIZADO após HTTP 200 com confirmação do backend.
 */

const { sqliteOutbox, TAMANHO_LOTE } = require('./sqliteOutbox');
const { API_BASE_URL, CAMPANHA_PADRAO_ID } = require('./config');

const INTERVALO_VARREDURA_MS = 8000;

let temporizador = null;
let sincronizando = false;

async function temLigacaoInternet() {
  try {
    const NetInfo = require('@react-native-community/netinfo');
    if (NetInfo && typeof NetInfo.fetch === 'function') {
      const estado = await NetInfo.fetch();
      if (estado && typeof estado.isConnected === 'boolean') {
        return Boolean(estado.isConnected && estado.isInternetReachable !== false);
      }
    }
  } catch (_erro) {
    // Sem NetInfo nativo: cai no probe HTTP
  }

  try {
    const resposta = await fetch(`${API_BASE_URL}/health`, { method: 'GET' });
    return resposta.ok;
  } catch (_erro) {
    return false;
  }
}

function confirmarHttp200(respostaHttp, corpo) {
  if (!respostaHttp || respostaHttp.status !== 200) return false;
  if (!corpo || typeof corpo !== 'object') return false;
  return corpo.success === true || corpo.sucesso === true;
}

function extrairUuidsConfirmados(lote, corpo) {
  const enviados = lote.map((item) => item.uuid);
  if (!corpo || typeof corpo !== 'object') return [];

  const confirmados = new Set();
  const listas = [
    corpo.uuids_sincronizados,
    corpo.ids_inseridos,
    corpo.ids_confirmados,
    (corpo.resumo && corpo.resumo.uuids_sincronizados) || [],
  ];

  listas.flat().forEach((valor) => {
    if (typeof valor === 'string' && valor.length > 0) confirmados.add(valor);
  });

  if (corpo.success === true || corpo.sucesso === true) {
    if (corpo.message === 'Já sincronizado anteriormente' || corpo.mensagem === 'Já sincronizado anteriormente') {
      enviados.forEach((uuid) => confirmados.add(uuid));
    }
    if (confirmados.size === 0 && (corpo.resumo?.total_recebidas === enviados.length || corpo.total === enviados.length)) {
      enviados.forEach((uuid) => confirmados.add(uuid));
    }
    if (Array.isArray(corpo.resultados)) {
      corpo.resultados.forEach((item) => {
        if (item && (item.success === true || item.sucesso === true) && item.uuid) {
          confirmados.add(item.uuid);
        }
      });
    }
  }

  return enviados.filter((uuid) => confirmados.has(uuid));
}

async function enviarLote(lote, campanhaId) {
  const visitas = lote.map((item) => ({
    ...item.payload,
    uuid: item.uuid,
    id: item.payload.id || item.uuid,
  }));

  const resposta = await fetch(`${API_BASE_URL}/visitas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      campanha_id: campanhaId,
      visitas,
    }),
  });

  const corpo = await resposta.json().catch(() => ({}));
  return { resposta, corpo };
}

const outboxSync = {
  /**
   * Varre a fila SQLite e envia um lote se houver internet.
   * O status local só muda para SINCRONIZADO após HTTP 200 confirmado.
   */
  async varrerESincronizar(campanhaId = CAMPANHA_PADRAO_ID) {
    if (sincronizando) {
      return { sucesso: true, mensagem: 'Varredura já em curso.', total: 0 };
    }

    sincronizando = true;
    try {
      const online = await temLigacaoInternet();
      if (!online) {
        const pendentes = await sqliteOutbox.contarPendencias();
        return {
          sucesso: false,
          offline: true,
          mensagem: 'Sem ligação à internet. Visitas mantidas na fila local.',
          total_pendentes: pendentes,
        };
      }

      const lote = await sqliteOutbox.obterPendentes(TAMANHO_LOTE);
      if (lote.length === 0) {
        return { sucesso: true, mensagem: 'Fila vazia. Nada a sincronizar.', total: 0 };
      }

      const { resposta, corpo } = await enviarLote(lote, campanhaId);

      if (!confirmarHttp200(resposta, corpo)) {
        await Promise.all(
          lote.map((item) =>
            sqliteOutbox.marcarErro(
              item.uuid,
              corpo.detalhes || corpo.erro || `HTTP ${resposta.status}`,
              Number(item.tentativas || 0) + 1
            )
          )
        );
        return {
          sucesso: false,
          erro: corpo.detalhes || corpo.erro || `Erro HTTP ${resposta.status}`,
          total_pendentes: lote.length,
        };
      }

      const uuidsConfirmados = extrairUuidsConfirmados(lote, corpo);
      if (uuidsConfirmados.length > 0) {
        await sqliteOutbox.marcarSincronizados(uuidsConfirmados);
      }

      return {
        sucesso: true,
        resumo: corpo.resumo || corpo,
        total_sincronizadas: uuidsConfirmados.length,
        message: corpo.message,
      };
    } catch (erro) {
      return {
        sucesso: false,
        erro: erro.message,
        total_pendentes: await sqliteOutbox.contarPendencias(),
      };
    } finally {
      sincronizando = false;
    }
  },

  iniciar(campanhaId = CAMPANHA_PADRAO_ID) {
    if (temporizador) return;
    sqliteOutbox.inicializar().catch(() => {});
    this.varrerESincronizar(campanhaId).catch(() => {});
    temporizador = setInterval(() => {
      this.varrerESincronizar(campanhaId).catch(() => {});
    }, INTERVALO_VARREDURA_MS);
  },

  parar() {
    if (temporizador) {
      clearInterval(temporizador);
      temporizador = null;
    }
  },
};

module.exports = {
  outboxSync,
  confirmarHttp200,
  extrairUuidsConfirmados,
  INTERVALO_VARREDURA_MS,
};
