const { getClient, query } = require('../config/db');

/**
 * Controller responsável pela ingestão de dados de campo e sincronização tardia
 */
const visitasController = {
  /**
   * Sincronização Tardia (Offline-First) de Visitas de Terreno
   * Executa uma transação atómica (BEGIN / COMMIT / ROLLBACK)
   * Garante idempotência total via ON CONFLICT (id) DO NOTHING
   */
  async sincronizarVisitas(req, res, next) {
    const { campanha_id, visitas } = req.body;
    const client = await getClient();

    try {
      await client.query('BEGIN');

      const idsProcessados = [];
      let totalNovasInseridas = 0;

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
          observacoes,
          registado_em,
          sincronizado_em,
          sincronizado,
          metadados_aparelho
        ) VALUES (
          $1,
          $2,
          $3,
          ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          clock_timestamp(),
          TRUE,
          $12
        )
        ON CONFLICT (id) DO NOTHING
        RETURNING id;
      `;

      for (const v of visitas) {
        const valores = [
          v.id,
          campanha_id,
          v.ativista_id,
          v.localizacao.longitude,
          v.localizacao.latitude,
          v.precisao_gps_metros || null,
          v.sentimento,
          v.dores_prioritarias || [],
          v.faixa_etaria || null,
          v.observacoes || null,
          v.registado_em,
          v.metadados_aparelho ? JSON.stringify(v.metadados_aparelho) : null,
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
          observacoes,
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
