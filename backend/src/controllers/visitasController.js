const { getClient, query } = require('../config/db');
const { resolverUuidCliente, validarTimestampCampo } = require('../utils/visitaTemporal');

const BBOX_ANGOLA = {
  minLon: 11.5, maxLon: 24.5,
  minLat: -18.5, maxLat: -4.3,
};

function normalizarLote(reqBody) {
  if (!reqBody || typeof reqBody !== 'object') {
    return { campanha_id: null, visitas: [] };
  }

  if (Array.isArray(reqBody.visitas) && reqBody.visitas.length > 0) {
    return { campanha_id: reqBody.campanha_id, visitas: reqBody.visitas };
  }

  if (reqBody.uuid || reqBody.id) {
    return {
      campanha_id: reqBody.campanha_id,
      visitas: [reqBody],
    };
  }

  return { campanha_id: reqBody.campanha_id, visitas: [] };
}

const SQL_INSERT_VISITA = `
  INSERT INTO visitas_terreno (
    id,
    uuid,
    campanha_id,
    ativista_id,
    localizacao,
    precisao_gps_metros,
    sentimento,
    dores_prioritarias,
    faixa_etaria,
    observacoes,
    categoria_observacao,
    marcado_revisao_humana,
    motivo_revisao,
    justificativa_offline,
    status_validacao,
    registado_em,
    sincronizado_em,
    sincronizado,
    metadados_aparelho
  ) VALUES (
    $1, $2, $3, $4,
    ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography,
    $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
    clock_timestamp(),
    TRUE,
    $18
  )
  RETURNING id, uuid;
`;

async function inserirVisitaIdempotente(client, campanhaId, visita, agora) {
  const uuid = resolverUuidCliente(visita);
  const temporal = validarTimestampCampo(visita, agora);

  if (!temporal.aceite) {
    return {
      uuid,
      success: false,
      rejeitado: true,
      codigo: temporal.codigo,
      message: temporal.mensagem,
    };
  }

  const lonOriginal = parseFloat(visita.localizacao?.longitude);
  const latOriginal = parseFloat(visita.localizacao?.latitude);
  let marcadoRevisao = Boolean(temporal.revisao);
  let motivoRevisao = temporal.revisao ? temporal.codigo : null;
  let statusValidacao = temporal.revisao ? 'REVISAO' : 'VALIDO';

  if (
    Number.isNaN(lonOriginal) || Number.isNaN(latOriginal) ||
    lonOriginal < BBOX_ANGOLA.minLon || lonOriginal > BBOX_ANGOLA.maxLon ||
    latOriginal < BBOX_ANGOLA.minLat || latOriginal > BBOX_ANGOLA.maxLat
  ) {
    marcadoRevisao = true;
    motivoRevisao = motivoRevisao ? `${motivoRevisao}; COORDENADA_FORA_ANGOLA` : 'COORDENADA_FORA_ANGOLA';
    statusValidacao = 'REVISAO';
  }

  const lonAgregada = Number(lonOriginal.toFixed(3));
  const latAgregada = Number(latOriginal.toFixed(3));

  const valores = [
    uuid,
    uuid,
    campanhaId,
    visita.ativista_id,
    lonAgregada,
    latAgregada,
    visita.precisao_gps_metros || null,
    visita.sentimento,
    visita.dores_prioritarias || [],
    visita.faixa_etaria || null,
    typeof visita.observacoes === 'string' ? visita.observacoes.slice(0, 2000) : null,
    visita.categoria_observacao || (visita.observacoes ? 'REGISTO_NOTAS_GERAIS' : null),
    marcadoRevisao,
    motivoRevisao,
    visita.justificativa_offline || null,
    statusValidacao,
    visita.registado_em,
    visita.metadados_aparelho
      ? JSON.stringify({
        app_versao: visita.metadados_aparelho.app_versao || visita.metadados_aparelho.app_version || '1.0',
        municipio: visita.municipio || null,
      })
      : JSON.stringify({ municipio: visita.municipio || null }),
  ];

  try {
    const resultado = await client.query(SQL_INSERT_VISITA, valores);
    return {
      uuid,
      success: true,
      inserido: true,
      message: 'Visita sincronizada com sucesso.',
      id: resultado.rows[0].id,
      marcado_revisao_humana: marcadoRevisao,
    };
  } catch (erro) {
    if (erro.code === '23505') {
      return {
        uuid,
        success: true,
        inserido: false,
        duplicado: true,
        message: 'Já sincronizado anteriormente',
      };
    }
    throw erro;
  }
}

const visitasController = {
  /**
   * POST /api/visitas
   * Ingestão idempotente (uuid UNIQUE). Reenvios por falha de rede devolvem HTTP 200.
   */
  async criarOuSincronizarVisitas(req, res) {
    const { campanha_id, visitas } = normalizarLote(req.body);
    if (!campanha_id || visitas.length === 0) {
      return res.status(400).json({
        success: false,
        erro: 'Payload inválido.',
        detalhes: 'É obrigatório enviar campanha_id e pelo menos uma visita com uuid.',
      });
    }

    const client = await getClient();
    const agora = Date.now();
    const resultados = [];
    let totalNovas = 0;
    let totalDuplicadas = 0;
    let totalRejeitadas = 0;
    let totalRevisao = 0;

    try {
      await client.query('BEGIN');

      for (const visita of visitas) {
        const resultado = await inserirVisitaIdempotente(client, campanha_id, visita, agora);
        resultados.push(resultado);
        if (resultado.rejeitado) totalRejeitadas += 1;
        else if (resultado.duplicado) totalDuplicadas += 1;
        else if (resultado.inserido) totalNovas += 1;
        if (resultado.marcado_revisao_humana) totalRevisao += 1;
      }

      if (totalRejeitadas > 0 && totalNovas === 0 && totalDuplicadas === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          erro: 'Lote rejeitado por timestamp de campo fora da tolerância.',
          resultados,
        });
      }

      await client.query('COMMIT');

      const todosDuplicados = totalDuplicadas > 0 && totalNovas === 0 && totalRejeitadas === 0;
      const mensagem = todosDuplicados
        ? 'Já sincronizado anteriormente'
        : 'Lote de visitas processado com sucesso na base central.';

      return res.status(200).json({
        success: true,
        sucesso: true,
        message: mensagem,
        mensagem,
        resumo: {
          total_recebidas: visitas.length,
          total_novas_inseridas: totalNovas,
          total_duplicadas_ignoradas: totalDuplicadas,
          total_rejeitadas: totalRejeitadas,
          total_marcadas_revisao_humana: totalRevisao,
          uuids_sincronizados: resultados
            .filter((r) => r.success)
            .map((r) => r.uuid),
          sincronizado_em: new Date().toISOString(),
        },
        ids_inseridos: resultados.filter((r) => r.inserido).map((r) => r.uuid),
        uuids_sincronizados: resultados.filter((r) => r.success).map((r) => r.uuid),
        resultados,
      });
    } catch (erro) {
      await client.query('ROLLBACK');

      if (erro.code === '23505') {
        return res.status(200).json({
          success: true,
          sucesso: true,
          message: 'Já sincronizado anteriormente',
          mensagem: 'Já sincronizado anteriormente',
        });
      }

      console.error('[Visitas Sync Error]', erro);
      return res.status(500).json({
        success: false,
        sucesso: false,
        erro: 'Falha atómica ao sincronizar lote de visitas.',
        detalhes: erro.message,
      });
    } finally {
      client.release();
    }
  },

  async sincronizarVisitas(req, res, next) {
    return visitasController.criarOuSincronizarVisitas(req, res, next);
  },

  async listarVisitas(req, res) {
    try {
      const { campanha_id, limite = 50, ativista_id, incluir_invalidadas } = req.query;

      if (!campanha_id) {
        return res.status(400).json({ erro: 'Parâmetro "campanha_id" é obrigatório.' });
      }

      const limiteSeguro = Math.min(Math.max(parseInt(limite, 10) || 50, 1), 2000);
      let sql = `
        SELECT
          vt.id,
          COALESCE(vt.uuid, vt.id) AS uuid,
          vt.ativista_id,
          vt.ativista_id::text AS ativista_nome,
          ST_X(vt.localizacao::geometry) AS longitude,
          ST_Y(vt.localizacao::geometry) AS latitude,
          vt.precisao_gps_metros,
          vt.sentimento,
          vt.dores_prioritarias,
          vt.faixa_etaria,
          vt.eleitor_jovem,
          vt.marcado_revisao_humana,
          vt.motivo_revisao,
          vt.justificativa_offline,
          vt.status_validacao,
          vt.registado_em,
          vt.sincronizado_em,
          vt.metadados_aparelho
        FROM visitas_terreno vt
        WHERE vt.campanha_id = $1
      `;
      const params = [campanha_id];

      if (ativista_id) {
        params.push(ativista_id);
        sql += ` AND vt.ativista_id = $${params.length}`;
      }

      if (incluir_invalidadas !== 'true') {
        sql += ` AND COALESCE(vt.status_validacao, 'VALIDO') <> 'INVALIDADO'`;
      }

      params.push(limiteSeguro);
      sql += ` ORDER BY vt.registado_em DESC LIMIT $${params.length};`;

      const { rows } = await query(sql, params);
      return res.status(200).json({ total: rows.length, visitas: rows });
    } catch (erro) {
      console.error('[Visitas List Error]', erro);
      return res.status(500).json({ erro: 'Erro ao consultar visitas.', detalhes: erro.message });
    }
  },

  /**
   * POST /api/visitas/invalidar-lote
   * Coordenação invalida um lote suspeito sem apagar a trilha de auditoria.
   */
  async invalidarLote(req, res) {
    const { uuids, motivo, responsavel } = req.body || {};
    if (!Array.isArray(uuids) || uuids.length === 0) {
      return res.status(400).json({
        success: false,
        erro: 'Informe o array "uuids" do lote a invalidar.',
      });
    }

    try {
      const motivoFinal = motivo || 'LOTE_INVALIDADO_COORDENACAO';
      const { rows } = await query(
        `UPDATE visitas_terreno
            SET marcado_revisao_humana = TRUE,
                motivo_revisao = $1,
                status_validacao = 'INVALIDADO',
                metadados_aparelho = COALESCE(metadados_aparelho, '{}'::jsonb)
                  || jsonb_build_object(
                       'invalidado_por', $2::text,
                       'invalidado_em', clock_timestamp()
                     )
          WHERE uuid = ANY($3::uuid[]) OR id = ANY($3::uuid[])
          RETURNING id, uuid`,
        [motivoFinal, responsavel || 'coordenacao_war_room', uuids]
      );

      return res.status(200).json({
        success: true,
        sucesso: true,
        message: 'Lote inválido pela coordenação. Registos preservados para auditoria.',
        total_invalidados: rows.length,
        uuids: rows.map((r) => r.uuid || r.id),
      });
    } catch (erro) {
      console.error('[Invalidar Lote Error]', erro);
      return res.status(500).json({
        success: false,
        erro: 'Falha ao invalidar lote.',
        detalhes: erro.message,
      });
    }
  },
};

visitasController.validarTimestampCampo = validarTimestampCampo;
visitasController.resolverUuidCliente = resolverUuidCliente;

module.exports = visitasController;
