/**
 * Fila de Sincronização (Outbox Pattern) em SQLite local.
 * Cada visita/formulário offline recebe um UUID único, fica com status
 * PENDENTE e só passa a SINCRONIZADO após HTTP 200 confirmado pelo backend.
 */

const STATUS_OUTBOX = {
  PENDENTE: 'PENDENTE',
  ENVIANDO: 'ENVIANDO',
  SINCRONIZADO: 'SINCRONIZADO',
  ERRO: 'ERRO',
};

const NOME_BD = 'gps_angola_outbox.db';
const TAMANHO_LOTE = 50;

const DDL_OUTBOX = `
  CREATE TABLE IF NOT EXISTS outbox_visitas (
    uuid TEXT PRIMARY KEY NOT NULL,
    payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDENTE',
    tentativas INTEGER NOT NULL DEFAULT 0,
    ultimo_erro TEXT,
    criado_em TEXT NOT NULL,
    atualizado_em TEXT NOT NULL,
    sincronizado_em TEXT
  );
`;

const INDICE_STATUS = `
  CREATE INDEX IF NOT EXISTS idx_outbox_visitas_status
    ON outbox_visitas (status, criado_em);
`;

let adaptador = null;
let inicializado = false;

function agoraIso() {
  return new Date().toISOString();
}

function linhasDeResultado(resultado) {
  if (!resultado) return [];
  if (Array.isArray(resultado.rows)) return resultado.rows;
  if (resultado.rows && typeof resultado.rows.item === 'function') {
    const lista = [];
    for (let i = 0; i < resultado.rows.length; i += 1) {
      lista.push(resultado.rows.item(i));
    }
    return lista;
  }
  if (resultado.rows && Array.isArray(resultado.rows._array)) return resultado.rows._array;
  return [];
}

function criarAdaptadorMemoria() {
  const tabela = new Map();

  return {
    tipo: 'memoria',
    async executar(sql, params = []) {
      const comando = sql.trim().toUpperCase();
      if (comando.startsWith('CREATE')) return { rows: [], rowsAffected: 0 };

      if (comando.startsWith('INSERT')) {
        const [uuid, payload, status, tentativas, criadoEm, atualizadoEm] = params;
        if (tabela.has(uuid)) {
          const erro = new Error('UNIQUE constraint failed: outbox_visitas.uuid');
          erro.code = '23505';
          throw erro;
        }
        tabela.set(uuid, {
          uuid,
          payload,
          status,
          tentativas,
          ultimo_erro: null,
          criado_em: criadoEm,
          atualizado_em: atualizadoEm,
          sincronizado_em: null,
        });
        return { rows: [{ uuid }], rowsAffected: 1 };
      }

      if (comando.startsWith('UPDATE') && comando.includes('STATUS = ?') && comando.includes('UUID IN')) {
        const status = params[0];
        const atualizadoEm = params[1];
        const sincronizadoEm = params[2];
        const uuids = params.slice(3);
        let afectados = 0;
        uuids.forEach((uuid) => {
          const linha = tabela.get(uuid);
          if (!linha) return;
          linha.status = status;
          linha.atualizado_em = atualizadoEm;
          if (status === STATUS_OUTBOX.SINCRONIZADO) linha.sincronizado_em = sincronizadoEm;
          afectados += 1;
        });
        return { rows: [], rowsAffected: afectados };
      }

      if (comando.startsWith('UPDATE') && comando.includes('STATUS = ?') && comando.includes('UUID = ?')) {
        const [status, tentativas, ultimoErro, atualizadoEm, uuid] = params;
        const linha = tabela.get(uuid);
        if (!linha) return { rows: [], rowsAffected: 0 };
        linha.status = status;
        linha.tentativas = tentativas;
        linha.ultimo_erro = ultimoErro;
        linha.atualizado_em = atualizadoEm;
        return { rows: [], rowsAffected: 1 };
      }

      if (comando.startsWith('SELECT') && comando.includes('COUNT(*)')) {
        const status = params[0];
        const total = [...tabela.values()].filter((l) => l.status === status).length;
        return { rows: [{ total }], rowsAffected: 0 };
      }

      if (comando.startsWith('SELECT')) {
        const status = params[0];
        const limite = params[1] || 50;
        const rows = [...tabela.values()]
          .filter((l) => l.status === status)
          .sort((a, b) => String(a.criado_em).localeCompare(String(b.criado_em)))
          .slice(0, limite);
        return { rows, rowsAffected: 0 };
      }

      return { rows: [], rowsAffected: 0 };
    },
  };
}

async function criarAdaptadorSqlite() {
  let sqliteMod;
  try {
    sqliteMod = require('expo-sqlite');
  } catch (erro) {
    return criarAdaptadorMemoria();
  }

  if (typeof sqliteMod.openDatabaseAsync === 'function') {
    const db = await sqliteMod.openDatabaseAsync(NOME_BD);
    return {
      tipo: 'expo-sqlite-async',
      async executar(sql, params = []) {
        const comando = sql.trim().toUpperCase();
        if (comando.startsWith('SELECT')) {
          const rows = await db.getAllAsync(sql, params);
          return { rows, rowsAffected: rows.length };
        }
        const resultado = await db.runAsync(sql, params);
        return { rows: [], rowsAffected: resultado.changes || 0 };
      },
    };
  }

  if (typeof sqliteMod.openDatabase === 'function') {
    const db = sqliteMod.openDatabase(NOME_BD);
    return {
      tipo: 'expo-sqlite-legacy',
      executar(sql, params = []) {
        return new Promise((resolve, reject) => {
          db.transaction(
            (tx) => {
              tx.executeSql(
                sql,
                params,
                (_, resultado) => {
                  resolve({
                    rows: linhasDeResultado(resultado),
                    rowsAffected: resultado.rowsAffected || 0,
                  });
                },
                (_, erro) => {
                  reject(erro);
                  return false;
                }
              );
            },
            reject
          );
        });
      },
    };
  }

  return criarAdaptadorMemoria();
}

const sqliteOutbox = {
  /**
   * Abre (ou reutiliza) a base SQLite e garante o schema da fila.
   */
  async inicializar() {
    if (inicializado && adaptador) return adaptador;
    adaptador = await criarAdaptadorSqlite();
    await adaptador.executar(DDL_OUTBOX);
    await adaptador.executar(INDICE_STATUS);
    inicializado = true;
    return adaptador;
  },

  /**
   * Gera um UUIDv4 estável no dispositivo (mesmo sem rede).
   */
  gerarUuidVisita() {
    try {
      const Crypto = require('expo-crypto');
      if (Crypto && typeof Crypto.randomUUID === 'function') {
        return Crypto.randomUUID();
      }
    } catch (_erro) {
      // Ambiente de teste / web sem expo-crypto nativo
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },

  /**
   * Persiste o payload da visita com status PENDENTE.
   */
  async enfileirarVisita(visita) {
    await this.inicializar();
    const uuid = visita.uuid || visita.id || this.gerarUuidVisita();
    const agora = agoraIso();
    const payload = {
      ...visita,
      uuid,
      id: visita.id || uuid,
      registado_em: visita.registado_em || agora,
    };

    await adaptador.executar(
      `INSERT INTO outbox_visitas
        (uuid, payload, status, tentativas, criado_em, atualizado_em)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuid, JSON.stringify(payload), STATUS_OUTBOX.PENDENTE, 0, agora, agora]
    );

    return payload;
  },

  async obterPendentes(limite = TAMANHO_LOTE) {
    await this.inicializar();
    const resultado = await adaptador.executar(
      `SELECT uuid, payload, status, tentativas, criado_em
         FROM outbox_visitas
        WHERE status = ?
        ORDER BY criado_em ASC
        LIMIT ?`,
      [STATUS_OUTBOX.PENDENTE, limite]
    );

    return linhasDeResultado(resultado).map((linha) => {
      let payload = {};
      try {
        payload = JSON.parse(linha.payload);
      } catch (_erro) {
        payload = {};
      }
      return {
        uuid: linha.uuid,
        tentativas: linha.tentativas,
        criado_em: linha.criado_em,
        payload: { ...payload, uuid: linha.uuid, id: payload.id || linha.uuid },
      };
    });
  },

  async atualizarPayload(uuid, payload) {
    await this.inicializar();
    await adaptador.executar(
      `UPDATE outbox_visitas SET payload = ?, atualizado_em = ? WHERE uuid = ?`,
      [JSON.stringify(payload), agoraIso(), uuid]
    );
  },

  async marcarSincronizados(uuids) {
    if (!uuids || uuids.length === 0) return 0;
    await this.inicializar();
    const placeholders = uuids.map(() => '?').join(', ');
    const agora = agoraIso();
    const resultado = await adaptador.executar(
      `UPDATE outbox_visitas
          SET status = ?, atualizado_em = ?, sincronizado_em = ?
        WHERE uuid IN (${placeholders})`,
      [STATUS_OUTBOX.SINCRONIZADO, agora, agora, ...uuids]
    );
    return resultado.rowsAffected || uuids.length;
  },

  async marcarErro(uuid, mensagem, tentativas) {
    await this.inicializar();
    await adaptador.executar(
      `UPDATE outbox_visitas
          SET status = ?, tentativas = ?, ultimo_erro = ?, atualizado_em = ?
        WHERE uuid = ?`,
      [STATUS_OUTBOX.PENDENTE, tentativas, mensagem, agoraIso(), uuid]
    );
  },

  async contarPendencias() {
    await this.inicializar();
    const resultado = await adaptador.executar(
      `SELECT COUNT(*) AS total FROM outbox_visitas WHERE status = ?`,
      [STATUS_OUTBOX.PENDENTE]
    );
    const linhas = linhasDeResultado(resultado);
    return Number(linhas[0]?.total || 0);
  },

  /**
   * Expõe o adaptador em testes (memória) sem vazar estado entre suítes.
   */
  _resetParaTestes() {
    adaptador = criarAdaptadorMemoria();
    inicializado = true;
  },
};

module.exports = {
  sqliteOutbox,
  STATUS_OUTBOX,
  TAMANHO_LOTE,
};
