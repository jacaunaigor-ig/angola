const express = require('express');
const cors = require('cors');
require('dotenv').config();

const apiRoutes = require('./routes/apiRoutes');
const errorHandler = require('./middleware/errorHandler');
const { rateLimiter } = require('./middleware/auth');
const logger = require('./utils/logger');
const { pool } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuração de CORS com suporte a lista branca
const corsOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*';
app.use(cors({ origin: corsOrigins, credentials: true }));

// Rate limiting para proteção contra DoS e força bruta
app.use(rateLimiter);

// Logger HTTP estruturado em JSON
app.use(logger.middlewareReq);

// Limite controlado para suportar lotes de visitas sem estouro de memória
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Rotas da API
app.use('/api', apiRoutes);

// Tratamento de rota não encontrada (404)
app.use((req, res) => {
  res.status(404).json({
    sucesso: false,
    erro: 'Rota não encontrada',
    caminho: req.originalUrl,
  });
});

// Middleware Global de Erros
app.use(errorHandler);

// Inicialização do Servidor
const server = app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 GPS Eleitoral Angola API ativa na porta ${PORT}`);
  console.log(`📡 Endpoints disponíveis em http://localhost:${PORT}/api`);
  console.log(`🩺 Healthcheck: http://localhost:${PORT}/api/health`);
  console.log('====================================================');
});

// Graceful Shutdown para fechar conexões do Pool do PostgreSQL
const shutdown = async (signal) => {
  console.log(`\n[Shutdown] Recebido sinal ${signal}. Encerrando conexões com segurança...`);
  server.close(async () => {
    try {
      await pool.end();
      console.log('[Shutdown] Pool de conexões do PostgreSQL encerrado com sucesso.');
      process.exit(0);
    } catch (err) {
      console.error('[Shutdown Error] Erro ao encerrar o pool:', err);
      process.exit(1);
    }
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

module.exports = { app, server };
