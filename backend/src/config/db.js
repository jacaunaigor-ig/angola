const { Pool } = require('pg');
require('dotenv').config();

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      max: parseInt(process.env.PG_MAX_POOL || '20', 10),
      idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT_MS || '30000', 10),
      connectionTimeoutMillis: parseInt(process.env.PG_CONNECTION_TIMEOUT_MS || '5000', 10),
    }
  : {
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432', 10),
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      database: process.env.PGDATABASE || 'angola_geomarketing',
      max: parseInt(process.env.PG_MAX_POOL || '20', 10),
      idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT_MS || '30000', 10),
      connectionTimeoutMillis: parseInt(process.env.PG_CONNECTION_TIMEOUT_MS || '5000', 10),
    };

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
