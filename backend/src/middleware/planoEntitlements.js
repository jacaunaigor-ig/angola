const { funcionalidadePermitida, obterPlano } = require('../services/planosComerciaisService');

function resolverPlanoRequest(req) {
  return (
    req.headers['x-plano-campanha'] ||
    req.query.plano ||
    req.body?.plano ||
    req.usuario?.plano ||
    'NACIONAL'
  );
}

function exigirFuncionalidade(chave) {
  return (req, res, next) => {
    const codigo = resolverPlanoRequest(req);
    if (!obterPlano(codigo)) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Plano comercial inválido.',
        detalhes: 'Use MUNICIPAL, PROVINCIAL ou NACIONAL no cabeçalho X-Plano-Campanha.',
      });
    }
    if (!funcionalidadePermitida(codigo, chave)) {
      return res.status(402).json({
        sucesso: false,
        erro: 'Funcionalidade fora do plano contratado.',
        funcionalidade: chave,
        plano: String(codigo).toUpperCase(),
        upgrade: chave === 'dia_d' || chave === 'casos_juridicos'
          ? 'Disponível a partir do Plano Provincial.'
          : 'Disponível no Plano Nacional / HQ.',
      });
    }
    req.planoCampanha = String(codigo).toUpperCase();
    next();
  };
}

module.exports = { exigirFuncionalidade, resolverPlanoRequest };
