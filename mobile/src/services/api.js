import { offlineStorage } from './offlineStorage';

// URL base da API (ajustável para IP local da máquina em ambiente de desenvolvimento)
export const API_BASE_URL = 'http://localhost:3001/api';

// IDs padrão de campanha e ativista para o dispositivo
export const CAMPANHA_PADRAO_ID = 'a0000000-0000-0000-0000-000000000001';
export const ATIVISTA_PADRAO_ID = 'b0000000-0000-0000-0000-000000000001';

export const apiService = {
  /**
   * Obtém resumo tático e dores por município para alimentar o BottomSheet
   */
  async obterResumoMunicipio(municipio, campanhaId = CAMPANHA_PADRAO_ID) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/municipios/${encodeURIComponent(municipio)}/resumo?campanha_id=${campanhaId}`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } }
      );
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.warn(`[API] Falha ao obter dados do município ${municipio}, usando dados locais offline:`, error.message);
      // Fallback offline com estimativas locais de contingência
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
   * Dispara a sincronização atómica da fila acumulada offline
   */
  async sincronizarFilaOffline(campanhaId = CAMPANHA_PADRAO_ID) {
    const fila = await offlineStorage.obterFilaVisitas();
    if (fila.length === 0) {
      return { sucesso: true, mensagem: 'Fila vazia. Nada a sincronizar.', total: 0 };
    }

    try {
      const payload = {
        campanha_id: campanhaId,
        visitas: fila,
      };

      const response = await fetch(`${API_BASE_URL}/sincronizar-visitas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const erroJson = await response.json().catch(() => ({}));
        throw new Error(erroJson.detalhes || `Erro HTTP ${response.status}`);
      }

      const resultado = await response.json();

      // Confirma e limpa a fila local
      const idsInseridos = fila.map((v) => v.id);
      await offlineStorage.confirmarSincronizacao(idsInseridos);

      return {
        sucesso: true,
        resumo: resultado.resumo,
        total_sincronizadas: fila.length,
      };
    } catch (error) {
      console.error('[API Sync] Falha ao enviar fila para o servidor:', error.message);
      return {
        sucesso: false,
        erro: error.message,
        total_pendentes: fila.length,
      };
    }
  },
};
