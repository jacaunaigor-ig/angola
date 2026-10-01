const { getClient, query } = require('../config/db');

// Tolerância para auditoria temporal do relógio do aparelho
const MAX_TEMPO_FUTURO_MS = 15 * 60 * 1000; // 15 minutos
const MAX_TEMPO_PASSADO_MS = 365 * 24 * 60 * 60 * 1000; // 1 ano

// Bounding box de Angola para validação geográfica da brigada
const BBOX_ANGOLA = {
  minLon: 11.5, maxLon: 24.5,
  minLat: -18.5, maxLat: -4.3
};

/**
 * Controller responsável pela ingestão de dados de campo e sincronização tardia
 */
const visitasController = {
  /**
   * Sincronização Tardia (Offline-First) de Visitas de Terreno
   * Executa uma transação atómica (BEGIN / COMMIT / ROLLBACK)
   * Garante idempotência total via ON CONFLICT (id) DO NOTHING
   * Aplica controle de qualidade e perturbação de privacidade geográfica
   */
  async sincronizarVisitas(req, res, next) {
    const { campanha_id, visitas } = req.body;
    const client = await getClient();

    try {
      await client.query('BEGIN');

      const idsProcessados = [];
      let totalNovasInseridas = 0;
      let totalMarcadasRevisao = 0;

      const agora = Date.now();

      // Consulta parametrizada com ST_SetSRID e tipo geography
      const sqlInsert = `
        INSERT INTO visitas_terreno (
          id,
          campanha_id,
          ativista_id,
          localizacao,
          precisao_gps_metros,
          sentimento,
          dores_prioritarias,
          faixa_etaria,
          categoria_observacao,
          marcado_revisao_humana,
          motivo_revisao,
          registado_em,
          sincronizado_em,
          sincronizado,
          metadados_aparelho,
          proveniencia
        ) VALUES (
          $1, $2, $3,
          ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography,
          $6, $7, $8, $9, $10, $11, $12, $13,
          clock_timestamp(),
          TRUE,
          $14,
          'OFICIAL'
        )
        ON CONFLICT (id) DO NOTHING
        RETURNING id;
      `;

      for (const v of visitas) {
        let marcadoRevisao = false;
        let motivoRevisao = null;

        // 1. Auditoria de Relógio do Aparelho (Timestamp plausível)
        const timestampRegistro = new Date(v.registado_em).getTime();
        if (isNaN(timestampRegistro)) {
          marcadoRevisao = true;
          motivoRevisao = 'TIMESTAMP_INVALIDO';
        } else if (timestampRegistro > agora + MAX_TEMPO_FUTURO_MS) {
          marcadoRevisao = true;
          motivoRevisao = 'RELOGIO_APARELHO_FUTURO_SUSPEITO';
        } else if (timestampRegistro < agora - MAX_TEMPO_PASSADO_MS) {
          marcadoRevisao = true;
          motivoRevisao = 'TIMESTAMP_MUITO_ANTIGO';
        }

        // 2. Auditoria Geográfica (Dentro do território de Angola)
        const lonOriginal = parseFloat(v.localizacao.longitude);
        const latOriginal = parseFloat(v.localizacao.latitude);

        if (
          isNaN(lonOriginal) || isNaN(latOriginal) ||
          lonOriginal < BBOX_ANGOLA.minLon || lonOriginal > BBOX_ANGOLA.maxLon ||
          latOriginal < BBOX_ANGOLA.minLat || latOriginal > BBOX_ANGOLA.maxLat
        ) {
          marcadoRevisao = true;
          motivoRevisao = motivoRevisao ? `${motivoRevisao}; COORDENADA_FORA_ANGOLA` : 'COORDENADA_FORA_ANGOLA';
        }

        // 3. Perturbação de Privacidade Geográfica (Minimização de Dados)
        // Arredonda para 3 casas decimais (~110m) para impedir reidentificação da soleira da porta
        const lonAgregada = Number(lonOriginal.toFixed(3));
        const latAgregada = Number(latOriginal.toFixed(3));

        if (marcadoRevisao) totalMarcadasRevisao++;

        const valores = [
          v.id,
          campanha_id,
          v.ativista_id,
          lonAgregada,
          latAgregada,
          v.precisao_gps_metros || null,
          v.sentimento,
          v.dores_prioritarias || [],
          v.faixa_etaria || null,
          v.observacoes ? 'REGISTO_NOTAS_GERAIS' : null,
          marcadoRevisao,
          motivoRevisao,
          v.registado_em,
          v.metadados_aparelho ? JSON.stringify({ app_versao: v.metadados_aparelho.app_versao || '1.0' }) : null,
        ];

        const resultado = await client.query(sqlInsert, valores);

        if (resultado.rowCount > 0) {
          totalNovasInseridas++;
          idsProcessados.push(resultado.rows[0].id);
        }
      }

      await client.query('COMMIT');

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Lote de visitas processado com sucesso na base central.',
        resumo: {
          total_recebidas: visitas.length,
          total_novas_inseridas: totalNovasInseridas,
          total_duplicadas_ignoradas: visitas.length - totalNovasInseridas,
          total_marcadas_revisao_humana: totalMarcadasRevisao,
          sincronizado_em: new Date().toISOString(),
        },
        ids_inseridos: idsProcessados,
      });
    } catch (erro) {
      await client.query('ROLLBACK');
      console.error('[Sync Error] Falha na transação de sincronização:', erro);
      return res.status(500).json({
        sucesso: false,
        erro: 'Falha atómica ao sincronizar lote de visitas.',
        detalhes: erro.message,
      });
    } finally {
      client.release();
    }
  },

  /**
   * Lista histórico de visitas sincronizadas com filtros opcionais
   */
  async listarVisitas(req, res, next) {
    try {
      const { campanha_id, limite = 50, ativista_id } = req.query;

      if (!campanha_id) {
        return res.status(400).json({ erro: 'Parâmetro "campanha_id" é obrigatório.' });
      }

      let sql = `
        SELECT 
          id,
          ativista_id,
          ST_X(localizacao::geometry) AS longitude,
          ST_Y(localizacao::geometry) AS latitude,
          precisao_gps_metros,
          sentimento,
          dores_prioritarias,
          faixa_etaria,
          eleitor_jovem,
          marcado_revisao_humana,
          motivo_revisao,
          registado_em,
          sincronizado_em
        FROM visitas_terreno
        WHERE campanha_id = $1
      `;
      const params = [campanha_id];

      if (ativista_id) {
        params.push(ativista_id);
        sql += ` AND ativista_id = $${params.length}`;
      }

      params.push(parseInt(limite, 10));
      sql += ` ORDER BY registado_em DESC LIMIT $${params.length};`;

      const { rows } = await query(sql, params);
      return res.status(200).json({ total: rows.length, visitas: rows });
    } catch (erro) {
      console.error('[Visitas List Error]', erro);
      return res.status(500).json({ erro: 'Erro ao consultar visitas.', detalhes: erro.message });
    }
  },
};

module.exports = visitasController;
