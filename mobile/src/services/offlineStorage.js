import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { sqliteOutbox } from './sqliteOutbox';

const STORAGE_KEYS = {
  QUEUE_VISITAS: '@gps_angola_queue_visitas',
  HISTORICO_VISITAS: '@gps_angola_historico_visitas',
  ASSEMBLEIAS_CACHE: '@gps_angola_assembleias_cache',
};
const TOKEN_KEY = 'gps_angola_access_token';
const IDENTITY_KEY = 'gps_angola_identity';
const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;

let queueOperation = Promise.resolve();

function serializeQueue(operation) {
  const current = queueOperation.then(operation, operation);
  queueOperation = current.then(() => undefined, () => undefined);
  return current;
}

function parseStoredList(raw, key) {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) throw new TypeError('Esperada uma lista.');
    return value;
  } catch (error) {
    throw new Error(`Dados locais corrompidos em ${key}: ${error.message}`);
  }
}

export function generateUUID() {
  return Crypto.randomUUID();
}

export const offlineStorage = {
  async guardarToken(token) {
    if (!token) throw new Error('Não é permitido guardar um token vazio.');
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },

  async obterToken() {
    return SecureStore.getItemAsync(TOKEN_KEY);
  },

  async guardarIdentidade(identity) {
    await SecureStore.setItemAsync(IDENTITY_KEY, JSON.stringify(identity));
  },

  async obterIdentidade() {
    const stored = await SecureStore.getItemAsync(IDENTITY_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch (error) {
      throw new Error(`Identidade local corrompida: ${error.message}`);
    }
  },

  async removerToken() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(IDENTITY_KEY);
  },

  async enfileirarVisita(visita) {
    return serializeQueue(async () => {
      const fila = await this.obterFilaVisitas();
      const novaVisita = {
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
        evidencias: Array.isArray(visita.evidencias) ? visita.evidencias : [],
        sincronizado: false,
      };
      if (fila.some((item) => item.id === novaVisita.id)) {
        throw new Error(`Já existe uma visita local com o ID ${novaVisita.id}.`);
      }
      fila.push(novaVisita);
      await AsyncStorage.setItem(STORAGE_KEYS.QUEUE_VISITAS, JSON.stringify(fila));
      });

      const filaExistente = await this.obterFilaVisitasAsyncStorage();
      filaExistente.push(novaVisita);
      await AsyncStorage.setItem(STORAGE_KEYS.QUEUE_VISITAS, JSON.stringify(filaExistente));
      return novaVisita;
    });
  },

  async obterFilaVisitas() {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.QUEUE_VISITAS);
    return parseStoredList(raw, STORAGE_KEYS.QUEUE_VISITAS);
  },

  async anexarEvidencia(visitaId, sourceUri, mimeType = 'image/jpeg') {
    if (!['image/jpeg', 'image/png'].includes(mimeType)) {
      throw new Error('A evidência deve ser uma imagem JPEG ou PNG.');
  async obterFilaVisitasAsyncStorage() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.QUEUE_VISITAS);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.error('[OfflineStorage] Erro ao carregar fila AsyncStorage:', error);
      return [];
    }
    return serializeQueue(async () => {
      const info = await FileSystem.getInfoAsync(sourceUri, { size: true });
      if (!info.exists || !info.uri) throw new Error('O ficheiro de evidência não está disponível.');
      if (info.size > MAX_EVIDENCE_BYTES) throw new Error('A evidência não pode exceder 5 MB.');

      const directory = `${FileSystem.documentDirectory}evidencias/${visitaId}/`;
      await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
      const extension = mimeType === 'image/png' ? 'png' : 'jpg';
      const evidence = {
        id: generateUUID(),
        uri: `${directory}${generateUUID()}.${extension}`,
        nome_arquivo: `evidencia-${Date.now()}.${extension}`,
        mime_type: mimeType,
        tamanho_bytes: info.size,
      };
      await FileSystem.copyAsync({ from: sourceUri, to: evidence.uri });

      const fila = await this.obterFilaVisitas();
      const index = fila.findIndex((item) => item.id === visitaId);
      if (index < 0) {
        await FileSystem.deleteAsync(evidence.uri, { idempotent: true });
        throw new Error(`Visita ${visitaId} não encontrada na fila local.`);
      }
      fila[index].evidencias = [...(fila[index].evidencias || []), evidence];
      await AsyncStorage.setItem(STORAGE_KEYS.QUEUE_VISITAS, JSON.stringify(fila));
      return evidence;
    });
  },

  async confirmarSincronizacao(idsConfirmados) {
    const confirmed = new Set(idsConfirmados);
    return serializeQueue(async () => {
      const fila = await this.obterFilaVisitas();
      const sincronizadas = fila.filter((visit) => confirmed.has(visit.id));
      const restantes = fila.filter((visit) => !confirmed.has(visit.id));
      const historico = parseStoredList(
        await AsyncStorage.getItem(STORAGE_KEYS.HISTORICO_VISITAS),
        STORAGE_KEYS.HISTORICO_VISITAS
      );
      const arquivadas = sincronizadas.map((visit) => ({ ...visit, sincronizado: true }));
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
      await AsyncStorage.setItem(
        STORAGE_KEYS.HISTORICO_VISITAS,
        JSON.stringify([...arquivadas, ...historico].slice(0, 500))
      );

      for (const visit of sincronizadas) {
        for (const evidence of visit.evidencias || []) {
          await FileSystem.deleteAsync(evidence.uri, { idempotent: true });
        }
      }
      const historicoRaw = await AsyncStorage.getItem(STORAGE_KEYS.HISTORICO_VISITAS);
      const historico = historicoRaw ? JSON.parse(historicoRaw) : [];
      const historicoAtualizado = [...sincronizadas, ...historico].slice(0, 500);
      await AsyncStorage.setItem(STORAGE_KEYS.HISTORICO_VISITAS, JSON.stringify(historicoAtualizado));

      return { restantes: restantes.length, arquivadas: sincronizadas.length };
    });
  },

  async cachearAssembleias(assembleias) {
    if (!Array.isArray(assembleias)) throw new TypeError('assembleias deve ser uma lista.');
    await AsyncStorage.setItem(STORAGE_KEYS.ASSEMBLEIAS_CACHE, JSON.stringify(assembleias));
  },

  async obterAssembleiasEmCache() {
    return parseStoredList(
      await AsyncStorage.getItem(STORAGE_KEYS.ASSEMBLEIAS_CACHE),
      STORAGE_KEYS.ASSEMBLEIAS_CACHE
    );
  },

  async contarPendencias() {
    return (await this.obterFilaVisitas()).length;
    try {
      return await sqliteOutbox.contarPendencias();
    } catch (error) {
      const fila = await this.obterFilaVisitasAsyncStorage();
      return fila.length;
    }
  },
};
