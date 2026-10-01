const { query } = require('../config/db');

/**
 * Controller responsável pelo Quartel-General / War Room e Apuramento Paralelo do Dia D
 */
const warRoomController = {
  /**
   * Resumo Executivo Nacional para a Direção da Campanha
   * Rota: GET /api/war-room/resumo-nacional
   */
  async obterResumoNacional(req, res, next) {
    try {
      const { campanha_id } = req.query;

      // 1. Métricas Globais de Terreno
      const sqlVisitas = `
        SELECT 
          COUNT(*) AS total_visitas,
          COUNT(*) FILTER (WHERE sentimento = 'POSITIVO') AS positivas,
          COUNT(*) FILTER (WHERE sentimento = 'NEUTRO') AS neutras,
          COUNT(*) FILTER (WHERE sentimento = 'NEGATIVO') AS negativas,
          COUNT(*) FILTER (WHERE eleitor_jovem = TRUE) AS jovens,
          COUNT(DISTINCT ativista_id) AS ativistas_ativos,
          MIN(registado_em) AS primeira_visita,
          MAX(registado_em) AS ultima_visita
        FROM visitas_terreno
        ${campanha_id ? 'WHERE campanha_id = $1' : ''};
      `;

      // 2. Ranking Nacional das Dores Mais Citadas
      const sqlDores = `
        SELECT 
          dor,
          COUNT(*) AS frequencia,
          ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM visitas_terreno ${campanha_id ? 'WHERE campanha_id = $1' : ''}), 0), 1) AS percentual
        FROM (
          SELECT UNNEST(dores_prioritarias) AS dor
          FROM visitas_terreno
          ${campanha_id ? 'WHERE campanha_id = $1' : ''}
        ) sub
        GROUP BY dor
        ORDER BY frequencia DESC
        LIMIT 6;
      `;

      // 3. Cobertura Geográfica por Província
      const sqlProvincias = `
        SELECT 
          lv.provincia,
          COUNT(DISTINCT lv.id) AS total_assembleias,
          SUM(lv.total_eleitores_aptos) AS eleitores_provincia,
          COUNT(vt.id) AS total_visitas_provincia
        FROM locais_voto lv
        LEFT JOIN visitas_terreno vt ON ST_DWithin(vt.localizacao, lv.localizacao, 3000)
        GROUP BY lv.provincia
        ORDER BY eleitores_provincia DESC;
      `;

      const params = campanha_id ? [campanha_id] : [];

      const [resVisitas, resDores, resProvincias] = await Promise.all([
        query(sqlVisitas, params),
        query(sqlDores, params),
        query(sqlProvincias, []),
      ]);

      const v = resVisitas.rows[0] || {};
      const total = parseInt(v.total_visitas || '0', 10);
      const pos = parseInt(v.positivas || '0', 10);
      const neu = parseInt(v.neutras || '0', 10);
      const neg = parseInt(v.negativas || '0', 10);
      const jov = parseInt(v.jovens || '0', 10);

      return res.status(200).json({
        sucesso: true,
        gerado_em: new Date().toISOString(),
        painel_nacional: {
          total_visitas: total,
          ativistas_em_campo: parseInt(v.ativistas_ativos || '0', 10),
          indice_aceitacao: total ? Math.round((pos / total) * 100) : 0,
          indice_rejeicao: total ? Math.round((neg / total) * 100) : 0,
          indice_indecisos: total ? Math.round((neu / total) * 100) : 0,
          peso_juventude: total ? Math.round((jov / total) * 100) : 0,
          primeira_visita: v.primeira_visita,
          ultima_visita: v.ultima_visita,
        },
        ranking_nacional_dores: resDores.rows,
        distribuicao_provincias: resProvincias.rows,
      });
    } catch (erro) {
      console.error('[War Room Resumo Error]', erro);
      return res.status(500).json({
        sucesso: false,
        erro: 'Erro ao gerar resumo executivo do War Room.',
        detalhes: erro.message,
      });
    }
  },

  /**
   * Submete uma nova ata com validação de Geofencing e Hash SHA-256
   * Rota: POST /api/dia-d/submeter-ata
   */
  async submeterAta(req, res, next) {
    try {
      const {
        id,
        campanha_id,
        local_voto_id,
        mesa_numero,
        delegado_id,
        votos_favoraveis,
        votos_oponentes,
        votos_nulos,
        votos_brancos,
        total_votantes,
        foto_ata_url,
        foto_hash_sha256,
        localizacao_envio,
        registado_em,
      } = req.body;

      if (!id || !local_voto_id || !foto_hash_sha256 || !localizacao_envio) {
        return res.status(400).json({
          erro: 'Campos obrigatórios em falta.',
          detalhes: 'É obrigatório fornecer id, local_voto_id, foto_hash_sha256 e localizacao_envio.',
        });
      }

      const sqlInsert = `
        INSERT INTO atas_apuramento (
          id,
          campanha_id,
          local_voto_id,
          mesa_numero,
          delegado_id,
          votos_favoraveis,
          votos_oponentes,
          votos_nulos,
          votos_brancos,
          total_votantes,
          foto_ata_url,
          foto_hash_sha256,
          localizacao_envio,
          registado_em,
          sincronizado_em
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
          ST_SetSRID(ST_MakePoint($13, $14), 4326)::geography,
          $15, clock_timestamp()
        )
        ON CONFLICT (id) DO UPDATE SET
          votos_favoraveis = EXCLUDED.votos_favoraveis,
          votos_oponentes = EXCLUDED.votos_oponentes,
          votos_nulos = EXCLUDED.votos_nulos,
          votos_brancos = EXCLUDED.votos_brancos,
          total_votantes = EXCLUDED.total_votantes
        RETURNING id, status, distancia_assembleia_metros;
      `;

      const values = [
        id,
        campanha_id || 'a0000000-0000-0000-0000-000000000001',
        local_voto_id,
        parseInt(mesa_numero || '1', 10),
        delegado_id || 'b0000000-0000-0000-0000-000000000001',
        parseInt(votos_favoraveis || '0', 10),
        parseInt(votos_oponentes || '0', 10),
        parseInt(votos_nulos || '0', 10),
        parseInt(votos_brancos || '0', 10),
        parseInt(total_votantes || '0', 10),
        foto_ata_url || 'https://storage.campanha2027.ao/atas/mock.jpg',
        foto_hash_sha256,
        parseFloat(localizacao_envio.longitude),
        parseFloat(localizacao_envio.latitude),
        registado_em || new Date().toISOString(),
      ];

      const { rows } = await query(sqlInsert, values);
      const ataGravada = rows[0];

      return res.status(201).json({
        sucesso: true,
        mensagem: 'Ata de apuramento registrada com sucesso.',
        ata: {
          id: ataGravada.id,
          status: ataGravada.status,
          distancia_assembleia_metros: ataGravada.distancia_assembleia_metros,
          alerta_fraude: ataGravada.status === 'SUSPEITA',
        },
      });
    } catch (erro) {
      console.error('[Submeter Ata Error]', erro);
      return res.status(500).json({
        sucesso: false,
        erro: 'Erro ao processar ata de apuramento.',
        detalhes: erro.message,
      });
    }
  },

  /**
   * Consolidação do Apuramento Paralelo do Dia D e Auditoria Espacial
   * Rota: GET /api/dia-d/apuramento-paralelo
   */
  async obterApuramentoParalelo(req, res, next) {
    try {
      const { campanha_id } = req.query;

      // 1. Totais consolidados de votos apurados
      const sqlTotais = `
        SELECT 
          COUNT(*) AS total_atas_recebidas,
          COUNT(DISTINCT local_voto_id) AS assembleias_apuradas,
          COALESCE(SUM(votos_favoraveis), 0) AS total_favoraveis,
          COALESCE(SUM(votos_oponentes), 0) AS total_oponentes,
          COALESCE(SUM(votos_nulos), 0) AS total_nulos,
          COALESCE(SUM(votos_brancos), 0) AS total_brancos,
          COALESCE(SUM(total_votantes), 0) AS total_votantes_computados,
          COUNT(*) FILTER (WHERE status = 'SUSPEITA') AS total_atas_suspeitas
        FROM atas_apuramento
        ${campanha_id ? 'WHERE campanha_id = $1' : ''};
      `;

      // 2. Metadados do universo de mesas oficiais da CNE
      const sqlTotalEsperado = `
        SELECT 
          SUM(total_mesas) AS total_mesas_cadastradas,
          SUM(total_eleitores_aptos) AS total_eleitores_aptos
        FROM locais_voto;
      `;

      // 3. Lista de atas assinaladas como SUSPEITAS (Geofencing audit)
      const sqlAtasSuspeitas = `
        SELECT 
          aa.id,
          aa.mesa_numero,
          aa.distancia_assembleia_metros,
          aa.status,
          aa.foto_hash_sha256,
          aa.registado_em,
          lv.nome AS assembleia_nome,
          lv.codigo_cne,
          lv.municipio,
          lv.provincia,
          a.nome AS delegado_nome,
          a.telefone AS delegado_telefone
        FROM atas_apuramento aa
        JOIN locais_voto lv ON aa.local_voto_id = lv.id
        LEFT JOIN ativistas a ON aa.delegado_id = a.id
        WHERE aa.status = 'SUSPEITA'
        ORDER BY aa.distancia_assembleia_metros DESC
        LIMIT 20;
      `;

      const params = campanha_id ? [campanha_id] : [];

      const [resTotais, resEsperado, resSuspeitas] = await Promise.all([
        query(sqlTotais, params),
        query(sqlTotalEsperado, []),
        query(sqlAtasSuspeitas, []),
      ]);

      const totais = resTotais.rows[0] || {};
      const esperado = resEsperado.rows[0] || {};

      const fav = parseInt(totais.total_favoraveis || '0', 10);
      const opo = parseInt(totais.total_oponentes || '0', 10);
      const nulos = parseInt(totais.total_nulos || '0', 10);
      const brancos = parseInt(totais.total_brancos || '0', 10);
      const votantes = parseInt(totais.total_votantes_computados || '0', 10);

      const totalValidos = fav + opo;
      const percFavoravel = totalValidos > 0 ? Math.round((fav / totalValidos) * 1000) / 10 : 0;
      const percOponente = totalValidos > 0 ? Math.round((opo / totalValidos) * 1000) / 10 : 0;

      const totalMesasRecebidas = parseInt(totais.total_atas_recebidas || '0', 10);
      const totalMesasEsperadas = parseInt(esperado.total_mesas_cadastradas || '1', 10);
      const percApuracao = Math.round((totalMesasRecebidas / totalMesasEsperadas) * 1000) / 10;

      return res.status(200).json({
        sucesso: true,
        horario_apuracao: new Date().toISOString(),
        resumo_apuracao: {
          mesas_apuradas: totalMesasRecebidas,
          mesas_esperadas: totalMesasEsperadas,
          percentual_apurado: Math.min(percApuracao, 100),
          total_votantes: votantes,
        },
        contagem_votos: {
          nosso_partido: { votos: fav, percentual: percFavoravel },
          oposicao: { votos: opo, percentual: percOponente },
          nulos: { votos: nulos },
          brancos: { votos: brancos },
          total_validos: totalValidos,
        },
        auditoria_segurança: {
          total_atas_suspeitas: parseInt(totais.total_atas_suspeitas || '0', 10),
          atas_suspeitas_detalhes: resSuspeitas.rows,
        },
      });
    } catch (erro) {
      console.error('[Apuramento Paralelo Error]', erro);
      return res.status(500).json({
        sucesso: false,
        erro: 'Erro ao gerar apuramento paralelo do Dia D.',
        detalhes: erro.message,
      });
    }
  },
};

module.exports = warRoomController;
