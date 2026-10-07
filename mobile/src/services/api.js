import { offlineStorage } from './offlineStorage';
import { outboxSync } from './outboxSync';
import {
  API_BASE_URL as CONFIG_API,
  CAMPANHA_PADRAO_ID as CONFIG_CAMP,
  ATIVISTA_PADRAO_ID as CONFIG_ATIV,
} from './config';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || CONFIG_API;
export const CAMPANHA_PADRAO_ID = process.env.EXPO_PUBLIC_CAMPAIGN_ID || CONFIG_CAMP;
export const ATIVISTA_PADRAO_ID = CONFIG_ATIV;

function origemApi() {
  return API_BASE_URL.replace(/\/api\/?$/, '');
}

async function authenticatedHeaders() {
  const token = await offlineStorage.obterToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const apiService = {
  async autenticar(email, senha, campanhaId = CAMPANHA_PADRAO_ID) {
    const response = await fetch(`${API_BASE_URL}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha, campanha_id: campanhaId }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || error.erro || `Falha de autenticação (HTTP ${response.status}).`);
    }
    const tokenData = await response.json();
    await offlineStorage.guardarToken(tokenData.access_token);
    await offlineStorage.guardarIdentidade({
      campanha_id: tokenData.campanha_id,
      ativista_id: tokenData.ativista_id,
    });
    return tokenData;
  },

  /**
   * Obtém resumo tático e dores por município para alimentar o BottomSheet
   */
  async obterResumoMunicipio(municipio, campanhaId = CAMPANHA_PADRAO_ID) {
    try {
      const identity = await offlineStorage.obterIdentidade();
      const activeCampaignId = identity?.campanha_id || campanhaId;
      const response = await fetch(
        `${API_BASE_URL}/municipios/${encodeURIComponent(municipio)}/resumo?campanha_id=${activeCampaignId}`,
        { method: 'GET', headers: await authenticatedHeaders() }
      );
      if (!response.ok) {
        const error = new Error(`HTTP error! status: ${response.status}`);
        error.status = response.status;
        throw error;
      }
      return await response.json();
    } catch (error) {
      if (error.status === 401 || error.status === 403) throw error;
      console.warn(`[API] Falha ao obter dados do município ${municipio}, usando dados locais offline:`, error.message);
      return {
        sucesso: true,
        offline: true,
        municipio,
        indicador_risco: {
          cor: '🟡',
          status: 'CAMPO_BATALHA',
          rotulo: 'Zona em Disputa (Estimativa Offline)',
          descricao: 'Trabalho de campo em andamento; sincronize para dados consolidados.',
        },
        estrutura_eleitoral: {
          total_assembleias: 12,
          total_eleitores_aptos: 45000,
          zonamento_base: { bastioes: 4, campos_batalha: 6, oposicao: 2 },
        },
        inteligencia_campo: {
          total_visitas: 128,
          sentimento: {
            positivo: { total: 64, perc: 50 },
            neutro: { total: 38, perc: 30 },
            negativo: { total: 26, perc: 20 },
          },
          demografia_jovem: { total_18_35: 82, perc_juventude: 64 },
          principais_dores: [
            { dor: 'EMPREGO', frequencia: 48, percentual: 37.5 },
            { dor: 'AGUA', frequencia: 42, percentual: 32.8 },
            { dor: 'ENERGIA', frequencia: 31, percentual: 24.2 },
          ],
        },
      };
    }
  },

  /**
   * Busca assembleias próximas via PostGIS
   */
  async buscarLocaisProximos(longitude, latitude, raioMetros = 3000) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/locais-proximos?longitude=${longitude}&latitude=${latitude}&raio_metros=${raioMetros}`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } }
      );
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (data.locais && data.locais.length > 0) {
        await offlineStorage.cachearAssembleias(data.locais);
      }
      return data.locais || [];
    } catch (error) {
      console.warn('[API] Erro ao buscar locais online. Recuperando cache local:', error.message);
      return await offlineStorage.obterAssembleiasEmCache();
    }
  },

  /**
   * Dispara a varredura da fila SQLite e envia lotes para POST /api/visitas.
   * O status local só muda após HTTP 200 com confirmação do backend.
   */
  async sincronizarFilaOffline(campanhaId = CAMPANHA_PADRAO_ID) {
    const fila = await offlineStorage.obterFilaVisitas();
    if (fila.length === 0) {
      return { sucesso: true, mensagem: 'Fila vazia. Nada a sincronizar.', total: 0 };
    }

    try {
      const token = await offlineStorage.obterToken();
      if (!token) throw new Error('Autentique o dispositivo antes de sincronizar os dados.');
      const identity = await offlineStorage.obterIdentidade();
      const activeCampaignId = identity?.campanha_id || campanhaId;
      const payload = {
        campanha_id: activeCampaignId,
        visitas: fila,
      };

      const response = await fetch(`${API_BASE_URL}/sincronizar-visitas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const erroJson = await response.json().catch(() => ({}));
        throw new Error(erroJson.detalhes || `Erro HTTP ${response.status}`);
      }

      const resultado = await response.json();

      const idsConfirmados = resultado.ids_confirmados;
      if (!Array.isArray(idsConfirmados)) {
        throw new Error('A API não confirmou os IDs sincronizados; os dados locais foram preservados.');
      }

      for (const visit of fila.filter((item) => idsConfirmados.includes(item.id))) {
        for (const evidence of visit.evidencias || []) {
          const formData = new FormData();
          formData.append('evidence', {
            uri: evidence.uri,
            name: evidence.nome_arquivo,
            type: evidence.mime_type,
          });
          const upload = await fetch(
            `${API_BASE_URL}/visitas/${encodeURIComponent(visit.id)}/evidencias?id=${encodeURIComponent(evidence.id)}`,
            {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: formData,
            }
          );
          if (!upload.ok) {
            const error = await upload.json().catch(() => ({}));
            throw new Error(error.detail || `Falha no envio da evidência (HTTP ${upload.status}).`);
          }
        }
      }

      await offlineStorage.confirmarSincronizacao(idsConfirmados);

      return {
        sucesso: true,
        resumo: resultado.resumo,
        total_sincronizadas: idsConfirmados.length,
      };
    } catch (error) {
      console.error('[API Sync] Falha ao enviar fila para o servidor:', error.message);
      return {
        sucesso: false,
        erro: error.message,
        total_pendentes: fila.length,
      };
    }
    return outboxSync.varrerESincronizar(campanhaId);
  },

  /**
   * Submete a ata de apuramento da mesa eleitoral com geofencing
   */
  async submeterAta(payload) {
    const identity = await offlineStorage.obterIdentidade();
    const activeCampaignId = identity?.campanha_id || CAMPANHA_PADRAO_ID;
    const activeActivistId = identity?.ativista_id || ATIVISTA_PADRAO_ID;

    const body = {
      campanha_id: activeCampaignId,
      delegado_id: activeActivistId,
      ...payload,
    };

    const response = await fetch(`${API_BASE_URL}/dia-d/submeter-ata`, {
      method: 'POST',
      headers: await authenticatedHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.detail || errorJson.erro || `Erro HTTP ${response.status}`);
    }

    return await response.json();
  },

  async pedirTicketUploadAta({ nomeArquivo, mimeType, tamanhoBytes, sha256 }) {
    const response = await fetch(`${API_BASE_URL}/evidencias/presigned-upload`, {
      method: 'POST',
      headers: await authenticatedHeaders(),
      body: JSON.stringify({
        tipo: 'ATA_APURAMENTO',
        nome_arquivo: nomeArquivo,
        mime_type: mimeType,
        tamanho_bytes: tamanhoBytes,
        sha256_esperado: sha256,
      }),
    });
    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.detail || `Ticket de upload recusado (HTTP ${response.status}).`);
    }
    return response.json();
  },

  async enviarBinarioAta(uploadUrl, fileUri, mimeType) {
    const url = uploadUrl.startsWith('http') ? uploadUrl : `${origemApi()}${uploadUrl}`;
    const ficheiro = await fetch(fileUri);
    const corpo = await ficheiro.blob();
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': mimeType || 'image/jpeg' },
      body: corpo,
    });
    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.detail || `Upload da fotografia falhou (HTTP ${response.status}).`);
    }
    return response.json();
  },
};
