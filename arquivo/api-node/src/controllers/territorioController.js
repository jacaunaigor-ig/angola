const fs = require('fs');
const path = require('path');
const { query } = require('../config/db');
const { calcularZonamento, REGRAS_PADRAO } = require('../services/zonamentoService');
const { filtrarFeatures } = require('../services/planosComerciaisService');

const ROOT_DIR = path.resolve(__dirname, '../../..');
const REPORT_PATH = path.join(ROOT_DIR, 'data', 'relatorio_qualidade_carga.json');
const DPA_2016_PATH = path.join(ROOT_DIR, 'data', 'raw', 'malha_angola_dpa2016.geojson');
const DPA_2024_PATH = path.join(ROOT_DIR, 'data', 'raw', 'malha_angola_dpa2024.geojson');
const DE_PARA_PATH = path.join(ROOT_DIR, 'data', 'raw', 'de_para_dpa_2016_2024.json');
const CNE_PATH = path.join(ROOT_DIR, 'data', 'raw', 'resultados_eleitorais_cne_2022.json');
const INE_PATH = path.join(ROOT_DIR, 'data', 'raw', 'populacao_projecoes_ine.json');

const territorioController = {
  /**
   * Retorna o Relatório de Qualidade do último pipeline ETL
   */
  async obterRelatorioQualidade(req, res) {
    try {
      if (fs.existsSync(REPORT_PATH)) {
        const relatorio = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf-8'));
        return res.status(200).json({ sucesso: true, relatorio });
      }

      return res.status(200).json({
        sucesso: true,
        relatorio: {
          status: 'PENDENTE_EXECUCAO',
          mensagem: 'O pipeline ETL ainda não foi executado neste ambiente.'
        }
      });
    } catch (err) {
      console.error('[Territorio Controller] Erro ao carregar relatório:', err);
      return res.status(500).json({ sucesso: false, erro: err.message });
    }
  },

  /**
   * Lista as versões da Malha Político-Administrativa
   */
  async listarVersoesMalha(req, res) {
    try {
      // Tenta consultar banco de dados primeiro
      try {
        const { rows } = await query('SELECT * FROM versoes_malha ORDER BY ano_vigencia ASC');
        if (rows && rows.length > 0) {
          return res.status(200).json({ sucesso: true, versoes: rows, proveniencia: 'OFICIAL' });
        }
      } catch (dbErr) {
        // Fallback gracioso com metadados oficiais dos arquivos brutos
      }

      const versoes = [
        {
          codigo: 'DPA_2016_18P',
          nome: 'Divisão Político-Administrativa Lei 18/16 (18 Províncias)',
          diploma_legal: 'Lei n.º 18/16 de 17 de Outubro',
          ano_vigencia: 2016,
          total_provincias: 18,
          total_municipios: 164,
          ativo_para_campanha_2027: false,
          proveniencia: 'OFICIAL'
        },
        {
          codigo: 'DPA_2024_21P',
          nome: 'Nova Divisão Político-Administrativa 2024 (21 Províncias)',
          diploma_legal: 'Lei da Divisão Político-Administrativa 2024',
          ano_vigencia: 2024,
          total_provincias: 21,
          total_municipios: 325,
          ativo_para_campanha_2027: true,
          proveniencia: 'OFICIAL'
        }
      ];

      return res.status(200).json({ sucesso: true, versoes, proveniencia: 'OFICIAL' });
    } catch (err) {
      return res.status(500).json({ sucesso: false, erro: err.message });
    }
  },

  /**
   * Retorna a Tabela de Correspondência De-Para entre as versões da DPA
   */
  async obterCorrespondencia(req, res) {
    try {
      if (fs.existsSync(DE_PARA_PATH)) {
        const dePara = JSON.parse(fs.readFileSync(DE_PARA_PATH, 'utf-8'));
        return res.status(200).json({ sucesso: true, de_para: dePara });
      }

      return res.status(404).json({ erro: 'Tabela de correspondência não encontrada.' });
    } catch (err) {
      return res.status(500).json({ sucesso: false, erro: err.message });
    }
  },

  /**
   * Retorna as unidades territoriais com métricas eleitorais e zonamento matemático
   * Suporta parâmetro ?versao=DPA_2016_18P ou DPA_2024_21P e ?formato=geojson
   */
  async listarUnidades(req, res) {
    try {
      const versao = req.query.versao || 'DPA_2016_18P';
      const formato = req.query.formato || 'json';
      const plano = req.query.plano || req.headers['x-plano-campanha'];
      const territorio = req.query.territorio;

      // 1. Tenta carregar do PostgreSQL se disponível
      try {
        const sql = `
          SELECT 
            ut.id, ut.codigo_oficial, ut.nome, ut.nivel_territorial,
            ut.populacao_total, ut.populacao_18_mais, ut.juventude_perc, ut.eleitores_registados_cne,
            ut.proveniencia_dados, ut.fonte_referencia,
            ST_X(ut.centroide::geometry) AS lon, ST_Y(ut.centroide::geometry) AS lat,
            ST_AsGeoJSON(ut.geometria_delimitacao)::json AS geojson,
            mt.abstencao_indice, mt.margem_apurada_perc, mt.zonamento_calculado, mt.formula_explicativa
          FROM unidades_territoriais ut
          JOIN versoes_malha vm ON ut.versao_malha_id = vm.id
          LEFT JOIN metricas_territoriais mt ON ut.id = mt.unidade_territorial_id
          WHERE vm.codigo = $1
          ORDER BY ut.nome ASC;
        `;
        const { rows } = await query(sql, [versao]);
        if (rows && rows.length > 0) {
          if (formato === 'geojson') {
            const brutas = rows.map(r => ({
              type: 'Feature',
              properties: {
                codigo: r.codigo_oficial,
                codigo_oficial: r.codigo_oficial,
                nome: r.nome,
                nivel: r.nivel_territorial,
                populacao_total: r.populacao_total,
                populacao_18_mais: r.populacao_18_mais,
                juventude_perc: r.juventude_perc,
                eleitores_cne: r.eleitores_registados_cne,
                eleitores: r.eleitores_registados_cne,
                abstencao_perc: r.abstencao_indice != null ? Number(r.abstencao_indice) * 100 : null,
                margem_apurada_perc: r.margem_apurada_perc,
                zonamento: r.zonamento_calculado,
                formula: r.formula_explicativa,
                proveniencia: r.proveniencia_dados
              },
              geometry: r.geojson
            }));
            const scoped = filtrarFeatures(brutas, plano, territorio);
            return res.status(200).json({
              type: 'FeatureCollection',
              features: scoped.features,
              ambito_contratado: {
                plano: scoped.plano?.codigo || plano || 'NACIONAL',
                irrestrito: Boolean(scoped.irrestrito),
                nomes: scoped.nomes,
              },
            });
          }
          const scopedRows = filtrarFeatures(rows, plano, territorio);
          return res.status(200).json({ sucesso: true, versao, unidades: scopedRows.features });
        }
      } catch (dbErr) {
        // Fallback gracioso lendo do repositório data/raw/
      }

      // 2. Fallback de dados oficiais brutos auditados
      const filePath = versao === 'DPA_2024_21P' ? DPA_2024_PATH : DPA_2016_PATH;
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ erro: `Versão ${versao} não encontrada.` });
      }

      const geojson = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const cneData = fs.existsSync(CNE_PATH) ? JSON.parse(fs.readFileSync(CNE_PATH, 'utf-8')).provincias : [];
      const ineData = fs.existsSync(INE_PATH) ? JSON.parse(fs.readFileSync(INE_PATH, 'utf-8')).provincias : [];

      const mapaCNE = new Map(cneData.map(p => [p.codigo_cne, p]));
      const mapaINE = new Map(ineData.map(p => [p.codigo_ine, p]));

      const featuresEnriquecidas = geojson.features.map(feat => {
        const prop = feat.properties;
        const cne = mapaCNE.get(prop.codigo_dpa) || {};
        const ine = mapaINE.get(prop.codigo_dpa) || {};

        const calculo = calcularZonamento({
          votos_partido: cne.votos_partido_a || 0,
          votos_oposicao: cne.votos_partido_b || 0,
          total_validos: cne.votos_validos || 0
        });

        return {
          ...feat,
          properties: {
            ...prop,
            populacao_total: ine.populacao_total || null,
            populacao_18_mais: ine.populacao_18_mais || null,
            juventude_perc: ine.jovens_perc_eleitorado || null,
            eleitores_cne: cne.eleitores_registados || null,
            abstencao_perc: cne.abstencao_perc || null,
            margem_apurada_perc: calculo.margem_perc,
            zonamento: calculo.zonamento,
            zonamento_rotulo: calculo.rotulo,
            formula_explicativa: calculo.formula_aplicada,
            proveniencia_dados: 'OFICIAL'
          }
        };
      });

      const scoped = filtrarFeatures(featuresEnriquecidas, plano, territorio);
      if (formato === 'geojson') {
        return res.status(200).json({
          type: 'FeatureCollection',
          name: `malha_${versao}`,
          proveniencia: 'OFICIAL',
          features: scoped.features,
          ambito_contratado: {
            plano: scoped.plano?.codigo || plano || 'NACIONAL',
            irrestrito: Boolean(scoped.irrestrito),
          },
        });
      }

      return res.status(200).json({
        sucesso: true,
        versao,
        total: scoped.features.length,
        unidades: scoped.features.map(f => f.properties)
      });
    } catch (err) {
      console.error('[Listar Unidades Error]', err);
      return res.status(500).json({ sucesso: false, erro: err.message });
    }
  },

  /**
   * Endpoint de cálculo e simulação de Zonamento com Fórmula Matemática Visível
   */
  async simularZonamento(req, res) {
    try {
      const { votos_partido, votos_oposicao, total_validos, limiar_bastiao_margem, limiar_oposicao_margem } = req.body;

      const resultado = calcularZonamento(
        {
          votos_partido: Number(votos_partido || 0),
          votos_oposicao: Number(votos_oposicao || 0),
          total_validos: Number(total_validos || 0)
        },
        {
          limiar_bastiao_margem,
          limiar_oposicao_margem
        }
      );

      return res.status(200).json({
        sucesso: true,
        resultado,
        regra_padrao: REGRAS_PADRAO
      });
    } catch (err) {
      return res.status(400).json({ sucesso: false, erro: err.message });
    }
  }
};

module.exports = territorioController;
