const express = require('express');
const router = express.Router();

const visitasController = require('../controllers/visitasController');
const locaisVotoController = require('../controllers/locaisVotoController');
const dashboardController = require('../controllers/dashboardController');
const discursosController = require('../controllers/discursosController');
const warRoomController = require('../controllers/warRoomController');
const territorioController = require('../controllers/territorioController');
const planosController = require('../controllers/planosController');
const {
  validarConsultaProximidade,
  validarSincronizacaoVisitas,
} = require('../middleware/validator');
const { exigirFuncionalidade } = require('../middleware/planoEntitlements');
const { query } = require('../config/db');

/**
 * Healthcheck Completo da API, Sistema Operacional e Extensão PostGIS
 */
router.get('/health', async (req, res) => {
  const heapMb = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  const uptimeSegundos = Math.round(process.uptime());
  const observabilidade = {
    uptime_segundos: uptimeSegundos,
    uso_memoria_heap_mb: heapMb,
    pid: process.pid,
    plataforma: process.platform,
  };

  try {
    const postgisCheck = await query('SELECT PostGIS_Full_Version() AS versao_postgis, NOW() AS horario_servidor;');
    return res.status(200).json({
      status: 'ONLINE',
      versao_api: '2.0.0',
      ambiente: process.env.NODE_ENV || 'development',
      base_dados: 'CONECTADA',
      postgis: postgisCheck.rows[0].versao_postgis,
      horario_servidor: postgisCheck.rows[0].horario_servidor,
      observabilidade,
    });
  } catch (err) {
    return res.status(503).json({
      status: 'DEGRADADO',
      versao_api: '2.0.0',
      ambiente: process.env.NODE_ENV || 'development',
      base_dados: 'DESCONECTADA',
      aviso: 'PostgreSQL/PostGIS inacessível. O War Room pode operar com ficheiros locais auditados, mas a API não está saudável.',
      observabilidade,
    });
  }
});

// ==============================================================================
// 1. SINCRONIZAÇÃO TARDIA (OFFLINE-FIRST) + IDEMPOTÊNCIA POR UUID
// ==============================================================================
router.post(
  '/visitas',
  validarSincronizacaoVisitas,
  visitasController.criarOuSincronizarVisitas
);

router.post(
  '/visitas/invalidar-lote',
  exigirFuncionalidade('invalidar_lote'),
  visitasController.invalidarLote
);

router.post(
  '/sincronizar-visitas',
  validarSincronizacaoVisitas,
  visitasController.sincronizarVisitas
);

router.get('/visitas', visitasController.listarVisitas);

// ==============================================================================
// 2. BUSCAS ESPACIAIS E PROXIMIDADE (POSTGIS)
// ==============================================================================
router.get(
  '/locais-proximos',
  validarConsultaProximidade,
  locaisVotoController.buscarProximos
);

router.get('/locais-voto/:id', locaisVotoController.obterPorId);

// ==============================================================================
// 3. INTELIGÊNCIA TÁCTICA E RESUMO DE MUNICÍPIO (ECRÃ 1 / BOTTOMSHEET)
// ==============================================================================
router.get(
  '/municipios/:municipio/resumo',
  dashboardController.obterResumoMunicipio
);

// ==============================================================================
// 4. GESTÃO DE PROMESSAS E DISCURSOS COM IA (ANTHROPIC + FLUXO DE APROVAÇÃO)
// ==============================================================================
router.post(
  '/discursos/gerar',
  discursosController.gerarDiscursoComIA
);

router.patch(
  '/discursos/:id/status',
  discursosController.atualizarStatusDiscurso
);

router.get(
  '/discursos/historico/:municipio',
  discursosController.listarHistoricoMunicipio
);

router.get(
  '/discurso-territorializado/:municipio',
  discursosController.gerarDiscursoMunicipio
);

// ==============================================================================
// 5. WAR ROOM NACIONAL & APURAMENTO PARALELO DO DIA D
// ==============================================================================
router.get(
  '/war-room/resumo-nacional',
  warRoomController.obterResumoNacional
);

router.post(
  '/dia-d/submeter-ata',
  exigirFuncionalidade('dia_d'),
  warRoomController.submeterAta
);

router.get(
  '/dia-d/apuramento-paralelo',
  exigirFuncionalidade('dia_d'),
  warRoomController.obterApuramentoParalelo
);

router.post(
  '/dia-d/casos-juridicos',
  exigirFuncionalidade('casos_juridicos'),
  warRoomController.criarCasoJuridico
);

router.get(
  '/dia-d/casos-juridicos',
  warRoomController.listarCasosJuridicos
);

// ==============================================================================
// 6. INTELIGÊNCIA TERRITORIAL OFICIAL & ZONAMENTO TRANSPARENTE (DPA 2016 / 2024)
// ==============================================================================
router.get(
  '/territorio/relatorio-qualidade',
  territorioController.obterRelatorioQualidade
);

router.get(
  '/territorio/versoes',
  territorioController.listarVersoesMalha
);

router.get(
  '/territorio/correspondencia',
  territorioController.obterCorrespondencia
);

router.get(
  '/territorio/unidades',
  territorioController.listarUnidades
);

router.post(
  '/zonamento/simular',
  territorioController.simularZonamento
);

// ==============================================================================
// 7. CATÁLOGO COMERCIAL B2B (MUNICIPAL / PROVINCIAL / NACIONAL)
// ==============================================================================
router.get('/planos', planosController.catalogo);
router.get('/planos/:codigo', planosController.obter);
router.post('/planos/orcamento', planosController.orcamento);
router.get('/campanha/entitlements', planosController.entitlements);
router.post('/propostas', planosController.pedirProposta);

module.exports = router;
