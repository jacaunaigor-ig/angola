import AsyncStorage from '@react-native-async-storage/async-storage';
import { sqliteOutbox } from './sqliteOutbox';

const STORAGE_KEYS = {
  QUEUE_VISITAS: '@gps_angola_queue_visitas',
  HISTORICO_VISITAS: '@gps_angola_historico_visitas',
  ASSEMBLEIAS_CACHE: '@gps_angola_assembleias_cache',
  CONFIG_USUARIO: '@gps_angola_config_usuario',
};

// Gerador simplificado de UUIDv4 compatível com ambientes offline
export function generateUUID() {
  return sqliteOutbox.gerarUuidVisita();
}

export const offlineStorage = {
  /**
   * Enfileira uma nova visita na tabela SQLite local (Outbox) com status PENDENTE.
   * Mantém um espelho em AsyncStorage apenas para compatibilidade com ecrãs existentes.
   */
  async enfileirarVisita(visita) {
    try {
      const uuid = visita.uuid || visita.id || generateUUID();
      const novaVisita = await sqliteOutbox.enfileirarVisita({
        ...visita,
        uuid,
        id: visita.id || uuid,
        registado_em: visita.registado_em || new Date().toISOString(),
        sincronizado: false,
      });

      const filaExistente = await this.obterFilaVisitasAsyncStorage();
      filaExistente.push(novaVisita);
      await AsyncStorage.setItem(STORAGE_KEYS.QUEUE_VISITAS, JSON.stringify(filaExistente));
      return novaVisita;
    } catch (error) {
      console.error('[OfflineStorage] Erro ao enfileirar visita:', error);
      throw error;
    }
  },

  async obterFilaVisitasAsyncStorage() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.QUEUE_VISITAS);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.error('[OfflineStorage] Erro ao carregar fila AsyncStorage:', error);
      return [];
    }
  },

  /**
   * Retorna as visitas PENDENTES da fila SQLite (fonte de verdade do Outbox).
   */
  async obterFilaVisitas() {
    try {
      const pendentes = await sqliteOutbox.obterPendentes(500);
      if (pendentes.length > 0) {
        return pendentes.map((item) => item.payload);
      }
      return this.obterFilaVisitasAsyncStorage();
    } catch (error) {
      console.error('[OfflineStorage] Erro ao carregar fila SQLite:', error);
      return this.obterFilaVisitasAsyncStorage();
    }
  },

  /**
   * Confirma HTTP 200: marca SINCRONIZADO na tabela SQLite e arquiva o histórico.
   */
  async confirmarSincronizacao(idsSincronizados) {
    try {
      const uuids = (idsSincronizados || []).filter(Boolean);
      if (uuids.length > 0) {
        await sqliteOutbox.marcarSincronizados(uuids);
      }

      const fila = await this.obterFilaVisitasAsyncStorage();
      const sincronizadas = fila.filter((v) => uuids.includes(v.uuid) || uuids.includes(v.id));
      const restantes = fila.filter((v) => !uuids.includes(v.uuid) && !uuids.includes(v.id));

      await AsyncStorage.setItem(STORAGE_KEYS.QUEUE_VISITAS, JSON.stringify(restantes));

      const historicoRaw = await AsyncStorage.getItem(STORAGE_KEYS.HISTORICO_VISITAS);
      const historico = historicoRaw ? JSON.parse(historicoRaw) : [];
      const historicoAtualizado = [...sincronizadas, ...historico].slice(0, 500);
      await AsyncStorage.setItem(STORAGE_KEYS.HISTORICO_VISITAS, JSON.stringify(historicoAtualizado));

      return { restantes: restantes.length, arquivadas: sincronizadas.length };
    } catch (error) {
      console.error('[OfflineStorage] Erro ao confirmar sincronização:', error);
      throw error;
    }
  },

  async cachearAssembleias(assembleias) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ASSEMBLEIAS_CACHE, JSON.stringify(assembleias));
    } catch (error) {
      console.error('[OfflineStorage] Erro ao cachear assembleias:', error);
    }
  },

  async obterAssembleiasEmCache() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.ASSEMBLEIAS_CACHE);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      return [];
    }
  },

  async contarPendencias() {
    try {
      return await sqliteOutbox.contarPendencias();
    } catch (error) {
      const fila = await this.obterFilaVisitasAsyncStorage();
      return fila.length;
    }
  },
};
