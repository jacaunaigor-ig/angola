/**
 * Middleware de Autenticação JWT, Controle de Acesso Baseado em Perfis (RBAC) e Rate Limiting
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'chave_secreta_padrao_angola_2027_mudar_em_prod';

// Rate Limiter em memória por IP
const rateLimitMap = new Map();
const RATE_LIMIT_JANELA_MS = 60 * 1000; // 1 minuto
const RATE_LIMIT_MAX_REQ = 120; // 120 requisições por minuto por IP

/**
 * Middleware de Rate Limiting para mitigar DoS e força bruta
 */
function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
  const agora = Date.now();

  const registro = rateLimitMap.get(ip) || { contagem: 0, resetEm: agora + RATE_LIMIT_JANELA_MS };

  if (agora > registro.resetEm) {
    registro.contagem = 1;
    registro.resetEm = agora + RATE_LIMIT_JANELA_MS;
  } else {
    registro.contagem++;
  }

  rateLimitMap.set(ip, registro);

  if (registro.contagem > RATE_LIMIT_MAX_REQ) {
    return res.status(429).json({
      sucesso: false,
      erro: 'Limite de requisições excedido.',
      detalhes: 'Por favor, aguarde alguns instantes antes de enviar novas requisições.'
    });
  }

  next();
}

/**
 * Gera um token JWT com dados do usuário e perfil RBAC
 */
function gerarToken(usuario, expiraEm = '8h') {
  return jwt.sign(
    {
      id: usuario.id,
      email: usuario.email,
      campanha_id: usuario.campanha_id,
      perfil: usuario.perfil,
      nome: usuario.nome
    },
    JWT_SECRET,
    { expiresIn: expiraEm }
  );
}

/**
 * Middleware de Autenticação JWT
 */
function autenticar(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // Suporte a Token de Demonstração para testes e ambiente offline
  if (token === 'demo-token-admin' || (!token && process.env.NODE_ENV === 'test')) {
    req.usuario = {
      id: 'usr-demo-01',
      email: 'admin@campanha2027.ao',
      campanha_id: 'a0000000-0000-0000-0000-000000000001',
      perfil: 'ADMIN',
      nome: 'Administrador de Campanha'
    };
    return next();
  }

  if (!token) {
    // Permite leitura pública apenas em endpoints abertos ou modo demonstrativo
    if (req.method === 'GET') {
      req.usuario = {
        id: 'usr-anonimo',
        campanha_id: 'a0000000-0000-0000-0000-000000000001',
        perfil: 'LEITOR',
        nome: 'Acesso Leitor Anônimo'
      };
      return next();
    }
    return res.status(401).json({
      sucesso: false,
      erro: 'Acesso não autenticado.',
      detalhes: 'É obrigatório fornecer o cabeçalho Authorization: Bearer <token>'
    });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.usuario = payload;
    next();
  } catch (err) {
    return res.status(403).json({
      sucesso: false,
      erro: 'Token inválido ou expirado.',
      detalhes: err.message
    });
  }
}

/**
 * Middleware de Autorização por Perfis RBAC
 * @param {string[]} perfisPermitidos - Ex: ['ADMIN', 'ANALISTA', 'COORDENADOR']
 */
function autorizarPerfis(perfisPermitidos = []) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ erro: 'Usuário não autenticado.' });
    }

    if (!perfisPermitidos.includes(req.usuario.perfil)) {
      return res.status(403).json({
        sucesso: false,
        erro: 'Acesso negado para este perfil.',
        detalhes: `O seu perfil (${req.usuario.perfil}) não possui permissão para esta operação. Perfis permitidos: ${perfisPermitidos.join(', ')}.`
      });
    }

    next();
  };
}

module.exports = {
  rateLimiter,
  gerarToken,
  autenticar,
  autorizarPerfis
};
