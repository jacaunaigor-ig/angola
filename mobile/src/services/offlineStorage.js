import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  QUEUE_VISITAS: '@gps_angola_queue_visitas',
  HISTORICO_VISITAS: '@gps_angola_historico_visitas',
  ASSEMBLEIAS_CACHE: '@gps_angola_assembleias_cache',
  CONFIG_USUARIO: '@gps_angola_config_usuario',
};

// Gerador simplificado de UUIDv4 compatível com ambientes offline
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const offlineStorage = {
  /**
   * Enfileira uma nova visita no armazenamento local do telemóvel
   */
  async enfileirarVisita(visita) {
    try {
      const filaExistente = await this.obterFilaVisitas();
      const novaVisita = {
        ...visita,
        id: visita.id || generateUUID(),
        registado_em: visita.registado_em || new Date().toISOString(),
        sincronizado: false,
      };

      filaExistente.push(novaVisita);
      await AsyncStorage.setItem(STORAGE_KEYS.QUEUE_VISITAS, JSON.stringify(filaExistente));
      return novaVisita;
    } catch (error) {
      console.error('[OfflineStorage] Erro ao enfileirar visita:', error);
      throw error;
    }
  },

  /**
   * Retorna a lista de visitas acumuladas offline e pendentes de envio
   */
  async obterFilaVisitas() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.QUEUE_VISITAS);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.error('[OfflineStorage] Erro ao carregar fila:', error);
      return [];
    }
  },

  /**
   * Remove visitas já sincronizadas com o backend e guarda no histórico local
   */
  async confirmarSincronizacao(idsSincronizados) {
    try {
      const fila = await this.obterFilaVisitas();
      const sincronizadas = fila.filter((v) => idsSincronizados.includes(v.id));
      const restantes = fila.filter((v) => !idsSincronizados.includes(v.id));

      // Atualiza a fila com o que sobrou
      await AsyncStorage.setItem(STORAGE_KEYS.QUEUE_VISITAS, JSON.stringify(restantes));

      // Arquiva no histórico local do aparelho
      const historicoRaw = await AsyncStorage.getItem(STORAGE_KEYS.HISTORICO_VISITAS);
      const historico = historicoRaw ? JSON.parse(historicoRaw) : [];
      const historicoAtualizado = [...sincronizadas, ...historico].slice(0, 500); // Mantém até 500 no histórico
      await AsyncStorage.setItem(STORAGE_KEYS.HISTORICO_VISITAS, JSON.stringify(historicoAtualizado));

      return { restantes: restantes.length, arquivadas: sincronizadas.length };
    } catch (error) {
      console.error('[OfflineStorage] Erro ao confirmar sincronização:', error);
      throw error;
    }
  },

  /**
   * Armazena assembleias de voto em cache para consulta cartográfica offline
   */
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

  /**
   * Contagem de pendências para a barra superior (Badge Offline)
   */
  async contarPendencias() {
    const fila = await this.obterFilaVisitas();
    return fila.length;
  },
};
