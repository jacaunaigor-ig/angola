const { query } = require('../config/db');
const { calcularMargemErroAmostral } = require('../services/estatisticaService');

/**
 * Controller responsável pelas métricas agregadas e inteligência de geomarketing
 * Alimenta o Ecrã 1 (Painel Táctico / BottomSheet)
 */
const dashboardController = {
  /**
   * Resumo Táctico por Município
   * Retorna indicador de risco (🟢, 🟡, 🔴), distribuição de sentimentos e ranking de dores
   */
  async obterResumoMunicipio(req, res, next) {
    try {
      const { municipio } = req.params;
      const { campanha_id } = req.query;

      if (!municipio) {
        return res.status(400).json({ erro: 'Parâmetro "municipio" é obrigatório.' });
      }

      // 1. Dados estruturais do município (Assembleias e Eleitores)
      const sqlAssembleias = `
        SELECT 
          COUNT(*) AS total_assembleias,
          COALESCE(SUM(total_eleitores_aptos), 0) AS total_eleitores,
          COUNT(*) FILTER (WHERE zonamento_historico = 'BASTIAO') AS bastioes,
          COUNT(*) FILTER (WHERE zonamento_historico = 'CAMPO_BATALHA') AS campos_batalha,
          COUNT(*) FILTER (WHERE zonamento_historico = 'OPOSICAO') AS oposicao
        FROM locais_voto
        WHERE LOWER(municipio) = LOWER($1);
      `;

      // 2. Sentimento e Dores coletadas em campo
      const sqlVisitas = `
        SELECT 
          COUNT(*) AS total_visitas,
          COUNT(*) FILTER (WHERE sentimento = 'POSITIVO') AS sentimento_positivo,
          COUNT(*) FILTER (WHERE sentimento = 'NEUTRO') AS sentimento_neutro,
          COUNT(*) FILTER (WHERE sentimento = 'NEGATIVO') AS sentimento_negativo,
          COUNT(*) FILTER (WHERE eleitor_jovem = TRUE) AS eleitores_jovens
        FROM visitas_terreno vt
        JOIN locais_voto lv ON ST_DWithin(vt.localizacao, lv.localizacao, 3000)
        WHERE LOWER(lv.municipio) = LOWER($1)
        ${campanha_id ? 'AND vt.campanha_id = $2' : ''};
      `;

      // 3. Ranking das Dores mais citadas (desenrolando o array via UNNEST)
      const sqlDores = `
        SELECT 
          dor,
          COUNT(*) AS frequencia,
          ROUND((COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM visitas_terreno vt JOIN locais_voto lv ON ST_DWithin(vt.localizacao, lv.localizacao, 3000) WHERE LOWER(lv.municipio) = LOWER($1)), 0)), 1) AS percentual
        FROM (
          SELECT UNNEST(dores_prioritarias) AS dor
          FROM visitas_terreno vt
          JOIN locais_voto lv ON ST_DWithin(vt.localizacao, lv.localizacao, 3000)
          WHERE LOWER(lv.municipio) = LOWER($1)
          ${campanha_id ? 'AND vt.campanha_id = $2' : ''}
        ) sub
        GROUP BY dor
        ORDER BY frequencia DESC
        LIMIT 5;
      `;

      const params = campanha_id ? [municipio, campanha_id] : [municipio];

      const [resAssembleias, resVisitas, resDores] = await Promise.all([
        query(sqlAssembleias, [municipio]),
        query(sqlVisitas, params),
        query(sqlDores, params),
      ]);

      const dadosAssembleias = resAssembleias.rows[0] || {};
      const dadosVisitas = resVisitas.rows[0] || {};
      const doresRanking = resDores.rows || [];

      const totalVisitas = parseInt(dadosVisitas.total_visitas || '0', 10);
      const positivo = parseInt(dadosVisitas.sentimento_positivo || '0', 10);
      const neutro = parseInt(dadosVisitas.sentimento_neutro || '0', 10);
      const negativo = parseInt(dadosVisitas.sentimento_negativo || '0', 10);
      const jovens = parseInt(dadosVisitas.eleitores_jovens || '0', 10);

      // Cálculo do Indicador de Risco Táctico (🟢, 🟡, 🔴)
      let indicadorRisco = {
        cor: '🟡',
        status: 'CAMPO_BATALHA',
        rotulo: 'Zona em Disputa',
        descricao: 'Equilíbrio eleitoral; exige intensificação de brigadas de terreno.',
      };

      if (totalVisitas > 0) {
        const percPositivo = (positivo / totalVisitas) * 100;
        const percNegativo = (negativo / totalVisitas) * 100;

        if (percPositivo >= 55) {
          indicadorRisco = {
            cor: '🟢',
            status: 'BASTIAO',
            rotulo: 'Zona Segura / Bastião',
            descricao: 'Forte inclinação favorável; foco em mobilização e combate à abstenção.',
          };
        } else if (percNegativo >= 45) {
          indicadorRisco = {
            cor: '🔴',
            status: 'OPOSICAO',
            rotulo: 'Zona Crítica / Oposição',
            descricao: 'Rejeição acentuada; requer alteração de discurso e resposta às dores locais.',
          };
        }
      }

      const totalEleitoresAptos = parseInt(dadosAssembleias.total_eleitores || '0', 10);
      const metadadosAmostrais = calcularMargemErroAmostral(totalVisitas, totalEleitoresAptos);

      return res.status(200).json({
        sucesso: true,
        municipio,
        indicador_risco: indicadorRisco,
        amostragem_estatistica: metadadosAmostrais,
        estrutura_eleitoral: {
          total_assembleias: parseInt(dadosAssembleias.total_assembleias || '0', 10),
          total_eleitores_aptos: totalEleitoresAptos,
          zonamento_base: {
            bastioes: parseInt(dadosAssembleias.bastioes || '0', 10),
            campos_batalha: parseInt(dadosAssembleias.campos_batalha || '0', 10),
            oposicao: parseInt(dadosAssembleias.oposicao || '0', 10),
          },
        },
        inteligencia_campo: {
          total_visitas: totalVisitas,
          amostra_info: metadadosAmostrais.texto_formatado || `n = ${totalVisitas}`,
          sentimento: {
            positivo: { total: positivo, perc: totalVisitas ? Math.round((positivo / totalVisitas) * 100) : 0 },
            neutro: { total: neutro, perc: totalVisitas ? Math.round((neutro / totalVisitas) * 100) : 0 },
            negativo: { total: negativo, perc: totalVisitas ? Math.round((negativo / totalVisitas) * 100) : 0 },
          },
          demografia_jovem: {
            total_18_35: jovens,
            perc_juventude: totalVisitas ? Math.round((jovens / totalVisitas) * 100) : 0,
          },
          principais_dores: doresRanking,
        },
      });
    } catch (erro) {
      console.error('[Resumo Municipio Error]', erro);
      return res.status(500).json({
        sucesso: false,
        erro: 'Erro ao gerar resumo tático do município.',
        detalhes: erro.message,
      });
    }
  },
};

module.exports = dashboardController;
