/**
 * Módulo de Logs Estruturados em JSON para Observabilidade
 * Formata saídas em JSON para agregação em CloudWatch / Datadog / Grafana Loki
 * Aplica sanitização preventiva para não expor tokens ou dados sensíveis nos logs
 */

const NIVEIS = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40
};

function formatarLog(nivel, mensagem, metadados = {}) {
  // Mascara dados sensíveis
  const metaSanitizado = { ...metadados };
  if (metaSanitizado.senha) metaSanitizado.senha = '***REDACTED***';
  if (metaSanitizado.token) metaSanitizado.token = '***REDACTED***';
  if (metaSanitizado.authorization) metaSanitizado.authorization = '***REDACTED***';

  const entradaLog = {
    timestamp: new Date().toISOString(),
    nivel,
    servico: 'gps-politico-angola-api',
    versao: '2.0.0',
    mensagem,
    ...metaSanitizado
  };

  return JSON.stringify(entradaLog);
}

const logger = {
  info: (msg, meta) => console.log(formatarLog('INFO', msg, meta)),
  warn: (msg, meta) => console.warn(formatarLog('WARN', msg, meta)),
  error: (msg, meta) => console.error(formatarLog('ERROR', msg, meta)),
  debug: (msg, meta) => {
    if (process.env.LOG_LEVEL === 'DEBUG') console.debug(formatarLog('DEBUG', msg, meta));
  },
  middlewareReq: (req, res, next) => {
    const inicio = Date.now();
    res.on('finish', () => {
      const duracaoMs = Date.now() - inicio;
      logger.info('Requisição HTTP processada', {
        metodo: req.method,
        url: req.originalUrl,
        status_code: res.statusCode,
        latencia_ms: duracaoMs,
        ip: req.ip || req.connection.remoteAddress
      });
    });
    next();
  }
};

module.exports = logger;
