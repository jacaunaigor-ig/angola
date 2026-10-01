const { Pool } = require('pg');
require('dotenv').config();

function construirConfigPool() {
  const max = parseInt(process.env.PG_MAX_POOL || '20', 10);
  const idleTimeoutMillis = parseInt(process.env.PG_IDLE_TIMEOUT_MS || '30000', 10);
  const connectionTimeoutMillis = parseInt(process.env.PG_CONNECTION_TIMEOUT_MS || '5000', 10);

  if (process.env.DATABASE_URL) {
    const connectionString = process.env.DATABASE_URL;
    const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
    const sslDesligado = process.env.PGSSLMODE === 'disable' || isLocal;
    return {
      connectionString,
      max,
      idleTimeoutMillis,
      connectionTimeoutMillis,
      ssl: sslDesligado ? false : { rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED !== 'false' },
    };
  }

  return {
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'angola_geomarketing',
    max,
    idleTimeoutMillis,
    connectionTimeoutMillis,
  };
}

const poolConfig = construirConfigPool();

const pool = new Pool(poolConfig);

// Previne terminação inesperada do processo por erros em clientes ociosos
pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error] Erro inesperado em cliente ocioso:', err.message);
});

module.exports = {
  pool,
  /**
   * Executa uma consulta direta utilizando um cliente do pool
   */
  query: (text, params) => pool.query(text, params),
  /**
   * Obtém um cliente dedicado para transações atómicas (BEGIN / COMMIT / ROLLBACK)
   */
  getClient: () => pool.connect(),
};
