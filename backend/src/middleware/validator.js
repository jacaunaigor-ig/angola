/**
 * Validador de dados geográficos e regras de negócio para a API
 */

// Bounding box aproximado do território de Angola (para auditoria e telemetria)
const BBOX_ANGOLA = {
  minLon: 11.5,
  maxLon: 24.5,
  minLat: -18.5,
  maxLat: -4.3,
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(valor) {
  return typeof valor === 'string' && UUID_RE.test(valor.trim());
}

const SENTIMENTOS_VALIDOS = ['POSITIVO', 'NEUTRO', 'NEGATIVO'];
const DORES_VALIDAS = [
  'AGUA',
  'ENERGIA',
  'EMPREGO',
  'SANEAMENTO',
  'SAUDE',
  'EDUCACAO',
  'ESTRADAS',
  'HABITACAO',
  'SEGURANCA'
];

/**
 * Valida se uma coordenada geográfica é matematicamente válida
 */
function isValidCoord(lon, lat) {
  const nLon = Number(lon);
  const nLat = Number(lat);
  return (
    !isNaN(nLon) &&
    !isNaN(nLat) &&
    nLon >= -180 &&
    nLon <= 180 &&
    nLat >= -90 &&
    nLat <= 90
  );
}

/**
 * Middleware para validar a rota de busca de locais de voto próximos
 */
function validarConsultaProximidade(req, res, next) {
  const { longitude, latitude, raio_metros, limite } = req.query;

  if (longitude === undefined || latitude === undefined) {
    return res.status(400).json({
      erro: 'Parâmetros obrigatórios em falta.',
      detalhes: 'É necessário fornecer "longitude" e "latitude" via query parameters.',
    });
  }

  if (!isValidCoord(longitude, latitude)) {
    return res.status(400).json({
      erro: 'Coordenadas geográficas inválidas.',
      detalhes: 'Longitude deve estar entre -180 e 180, e Latitude entre -90 e 90.',
    });
  }

  // Sanitização de valores opcionais
  req.geoParams = {
    longitude: parseFloat(longitude),
    latitude: parseFloat(latitude),
    raio_metros: raio_metros ? Math.min(Math.max(parseFloat(raio_metros), 100), 50000) : 2000, // min 100m, max 50km, default 2km
    limite: limite ? Math.min(Math.max(parseInt(limite, 10), 1), 200) : 50,
  };

  next();
}

/**
 * Middleware para validar o payload da rota de sincronização tardia de visitas
 */
function validarSincronizacaoVisitas(req, res, next) {
  if (req.body && !Array.isArray(req.body.visitas) && (req.body.uuid || req.body.id)) {
    req.body = {
      campanha_id: req.body.campanha_id,
      visitas: [req.body],
    };
  }

  const { campanha_id, visitas } = req.body;

  if (!isUuid(campanha_id)) {
    return res.status(400).json({
      erro: 'Identificador de campanha inválido.',
      detalhes: 'O campo "campanha_id" deve ser um UUID válido.',
    });
  }

  if (!Array.isArray(visitas) || visitas.length === 0) {
    return res.status(400).json({
      erro: 'Lote de visitas inválido.',
      detalhes: 'O campo "visitas" deve ser um array com pelo menos 1 registo.',
    });
  }

  // Limite preventivo por requisição para evitar estouro de memória
  if (visitas.length > 500) {
    return res.status(400).json({
      erro: 'Lote de sincronização excede o limite máximo.',
      detalhes: 'O telemóvel deve enviar no máximo 500 visitas por requisição de sincronização.',
    });
  }

  // Validação item a item
  for (let i = 0; i < visitas.length; i++) {
    const v = visitas[i];
    const index = i + 1;

    const uuidCliente = v.uuid || v.id;
    if (!isUuid(uuidCliente)) {
      return res.status(400).json({
        erro: `Item #${index} inválido.`,
        detalhes: 'Cada visita deve conter um "uuid" (ou "id") UUID gerado localmente no telemóvel.',
      });
    }
    v.uuid = uuidCliente;
    v.id = v.id || uuidCliente;

    if (!isUuid(v.ativista_id)) {
      return res.status(400).json({
        erro: `Item #${index} inválido.`,
        detalhes: 'Campo "ativista_id" deve ser um UUID válido.',
      });
    }

    if (!v.localizacao || !isValidCoord(v.localizacao.longitude, v.localizacao.latitude)) {
      return res.status(400).json({
        erro: `Item #${index} com coordenadas inválidas.`,
        detalhes: '"localizacao.longitude" e "localizacao.latitude" numéricas são obrigatórias.',
      });
    }

    if (!v.sentimento || !SENTIMENTOS_VALIDOS.includes(v.sentimento)) {
      return res.status(400).json({
        erro: `Item #${index} com sentimento inválido.`,
        detalhes: `Sentimento deve ser um dos seguintes: ${SENTIMENTOS_VALIDOS.join(', ')}.`,
      });
    }

    if (!v.registado_em || isNaN(Date.parse(v.registado_em))) {
      return res.status(400).json({
        erro: `Item #${index} com carimbo temporal inválido.`,
        detalhes: 'O campo "registado_em" deve ser uma data válida em formato ISO-8601.',
      });
    }

    // Sanitizar dores para aceitar apenas dores válidas
    if (v.dores_prioritarias && Array.isArray(v.dores_prioritarias)) {
      v.dores_prioritarias = v.dores_prioritarias.filter((d) => DORES_VALIDAS.includes(d));
    } else {
      v.dores_prioritarias = [];
    }
  }

  next();
}

module.exports = {
  validarConsultaProximidade,
  validarSincronizacaoVisitas,
  isUuid,
  BBOX_ANGOLA,
};
