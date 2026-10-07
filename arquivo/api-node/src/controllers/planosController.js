const {
  listarPlanos,
  obterPlano,
  calcularOrcamento,
  nomesNoAmbito,
  funcionalidadePermitida,
  MUNICIPIOS_VENDAVEIS,
} = require('../services/planosComerciaisService');

const pedidosProposta = [];

const planosController = {
  async catalogo(req, res) {
    return res.status(200).json({
      sucesso: true,
      moeda: 'AOA',
      ciclo: 'CICLO_ELEITORAL_2027',
      mensagem: 'Três SKUs vendáveis. O preço de tabela não substitui a proposta formal.',
      planos: listarPlanos(),
      municipios_vendaveis: MUNICIPIOS_VENDAVEIS,
    });
  },

  async obter(req, res) {
    const plano = obterPlano(req.params.codigo);
    if (!plano) {
      return res.status(404).json({ sucesso: false, erro: 'Plano inexistente.' });
    }
    return res.status(200).json({ sucesso: true, plano });
  },

  async orcamento(req, res) {
    const resultado = calcularOrcamento(req.body || {});
    if (!resultado.ok) {
      return res.status(400).json({ sucesso: false, erro: resultado.erro });
    }
    return res.status(200).json({ sucesso: true, orcamento: resultado });
  },

  async entitlements(req, res) {
    const planoCodigo = req.query.plano || req.body?.plano || 'NACIONAL';
    const territorio = req.query.territorio || req.body?.territorio;
    const ambito = nomesNoAmbito(planoCodigo, territorio);
    if (!ambito.ok) {
      return res.status(400).json({ sucesso: false, erro: ambito.erro });
    }
    return res.status(200).json({
      sucesso: true,
      plano: ambito.plano.codigo,
      nome: ambito.plano.nome,
      funcionalidades: ambito.plano.funcionalidades,
      limites: ambito.plano.limites,
      ambito: {
        irrestrito: Boolean(ambito.irrestrito),
        nomes: ambito.nomes,
        municipio_contratado: ambito.municipio_contratado || null,
        provincia_contratada: ambito.provincia_contratada || null,
      },
    });
  },

  async pedirProposta(req, res) {
    const {
      organizacao,
      contacto,
      telefone,
      email,
      plano,
      territorio,
      brigadistas_contratados,
      notas,
    } = req.body || {};

    if (!organizacao || !contacto || !plano) {
      return res.status(400).json({
        sucesso: false,
        erro: 'organizacao, contacto e plano são obrigatórios.',
      });
    }

    const orcamento = calcularOrcamento({ plano, territorio, brigadistas_contratados });
    const protocolo = `PROP-2027-${String(pedidosProposta.length + 1).padStart(4, '0')}`;
    const pedido = {
      protocolo,
      organizacao,
      contacto,
      telefone: telefone || null,
      email: email || null,
      plano: String(plano).toUpperCase(),
      territorio: territorio || null,
      notas: notas || null,
      orcamento: orcamento.ok ? orcamento : null,
      status: 'NOVO',
      criado_em: new Date().toISOString(),
    };
    pedidosProposta.push(pedido);

    return res.status(201).json({
      sucesso: true,
      mensagem: 'Pedido de proposta registado. A equipa comercial contacta com a minuta de contrato.',
      pedido,
    });
  },

  funcionalidadePermitida,
};

module.exports = planosController;
