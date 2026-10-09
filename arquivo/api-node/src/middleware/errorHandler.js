/**
 * Middleware centralizado de tratamento de erros
 */
function errorHandler(err, req, res, next) {
  console.error('[Unhandled Error]', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Erro interno no servidor.';

  res.status(statusCode).json({
    sucesso: false,
    erro: message,
    detalhes: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
}

module.exports = errorHandler;
