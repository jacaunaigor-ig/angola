const { query } = require('../config/db');

/**
 * Controller para operações espaciais sobre Locais e Assembleias de Voto
 */
const locaisVotoController = {
  /**
   * Rota de Proximidade: /api/locais-proximos
   * Executa ST_DWithin sobre tipo GEOGRAPHY para garantir busca em metros
   */
  async buscarProximos(req, res, next) {
    try {
      const { longitude, latitude, raio_metros, limite } = req.geoParams;
      const { zonamento, formato } = req.query;

      let sql = `
        SELECT 
          id,
          codigo_cne,
          nome,
          provincia,
          municipio,
          comuna_distrito,
          bairro_aldeia,
          total_mesas,
          total_eleitores_aptos,
          zonamento_historico,
          ROUND(
            ST_Distance(
              localizacao, 
              ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
            )::numeric, 1
          ) AS distancia_metros,
          ST_X(localizacao::geometry) AS longitude,
          ST_Y(localizacao::geometry) AS latitude
        FROM locais_voto
        WHERE ST_DWithin(
          localizacao,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3
        )
      `;

      const params = [longitude, latitude, raio_metros];

      if (zonamento) {
        params.push(zonamento.toUpperCase());
        sql += ` AND zonamento_historico = $${params.length}`;
      }

      params.push(limite);
      sql += ` ORDER BY distancia_metros ASC LIMIT $${params.length};`;

      const { rows } = await query(sql, params);

      // Se o cliente pedir formato GeoJSON (ideal para Mapbox, Folium ou Leaflet)
      if (formato === 'geojson') {
        const geojson = {
          type: 'FeatureCollection',
          features: rows.map((r) => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [r.longitude, r.latitude],
            },
            properties: {
              id: r.id,
              nome: r.nome,
              codigo_cne: r.codigo_cne,
              provincia: r.provincia,
              municipio: r.municipio,
              total_eleitores: r.total_eleitores_aptos,
              zonamento: r.zonamento_historico,
              distancia_metros: r.distancia_metros,
            },
          })),
        };
        return res.status(200).json(geojson);
      }

      return res.status(200).json({
        sucesso: true,
        parametros_busca: {
          origem: { longitude, latitude },
          raio_metros,
          total_encontrados: rows.length,
        },
        locais: rows,
      });
    } catch (erro) {
      console.error('[Locais Proximos Error]', erro);
      return res.status(500).json({
        sucesso: false,
        erro: 'Erro espacial ao consultar locais de voto próximos.',
        detalhes: erro.message,
      });
    }
  },

  /**
   * Detalhes de um local de voto específico
   */
  async obterPorId(req, res, next) {
    try {
      const { id } = req.params;

      const sql = `
        SELECT 
          id,
          codigo_cne,
          nome,
          provincia,
          municipio,
          comuna_distrito,
          bairro_aldeia,
          total_mesas,
          total_eleitores_aptos,
          zonamento_historico,
          ST_X(localizacao::geometry) AS longitude,
          ST_Y(localizacao::geometry) AS latitude,
          criado_em
        FROM locais_voto
        WHERE id = $1;
      `;

      const { rows } = await query(sql, [id]);

      if (rows.length === 0) {
        return res.status(404).json({ erro: 'Assembleia de voto não encontrada.' });
      }

      return res.status(200).json({ sucesso: true, local: rows[0] });
    } catch (erro) {
      console.error('[Locais ObterPorId Error]', erro);
      return res.status(500).json({ erro: 'Erro ao consultar assembleia.', detalhes: erro.message });
    }
  },
};

module.exports = locaisVotoController;
