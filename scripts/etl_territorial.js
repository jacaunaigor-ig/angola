/**
 * SCRIPT ETL: INGESTÃO E AUDITORIA TERRITORIAL DE ANGOLA
 * Lê arquivos brutos de data/raw/, audita qualidade e gera cargas estruturadas.
 */

const fs = require('fs');
const path = require('path');
const { calcularZonamento, REGRAS_PADRAO } = require('../backend/src/services/zonamentoService');

const ROOT_DIR = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT_DIR, 'data', 'raw');
const OUTPUT_REPORT_PATH = path.join(ROOT_DIR, 'data', 'relatorio_qualidade_carga.json');
const OUTPUT_SQL_PATH = path.join(ROOT_DIR, 'database', '04_carga_territorial_oficial.sql');

// Bounding box geográfico de Angola para validação espacial de coordenadas
const BBOX_ANGOLA = {
  minLon: 11.5,
  maxLon: 24.5,
  minLat: -18.5,
  maxLat: -4.3
};

function sqlLiteral(valor) {
  if (valor === null || valor === undefined) return 'NULL';
  return `'${String(valor).replace(/'/g, "''")}'`;
}

function validarCoordenadaAngola(lon, lat) {
  if (typeof lon !== 'number' || typeof lat !== 'number' || isNaN(lon) || isNaN(lat)) {
    return { valido: false, motivo: 'Coordenadas não são números válidos.' };
  }
  if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
    return { valido: false, motivo: 'Coordenada fora dos limites do elipsoide WGS 84 (SRID 4326).' };
  }
  if (lon < BBOX_ANGOLA.minLon || lon > BBOX_ANGOLA.maxLon || lat < BBOX_ANGOLA.minLat || lat > BBOX_ANGOLA.maxLat) {
    return { valido: false, motivo: `Ponto (${lon}, ${lat}) fora da fronteira geográfica de Angola.` };
  }
  return { valido: true };
}

function executarETL() {
  console.log('================================================================');
  console.log('🇦🇴 EXECUTANDO PIPELINE ETL DE DADOS TERRITORIAIS - ANGOLA 2027');
  console.log('================================================================\n');

  const relatorio = {
    data_execucao: new Date().toISOString(),
    arquivos_processados: [],
    auditoria_qualidade: {
      total_registros_analisados: 0,
      total_nulos_detectados: 0,
      total_duplicados_detectados: 0,
      total_geometrias_invalidas: 0,
      total_fora_srid_4326: 0,
      conformidade_srid_4326_perc: 100.0,
      status_geral: 'APROVADO_COM_RESTRICOES'
    },
    versoes_malha_carregadas: [],
    resumo_zonamento_calculado: {
      regra_aplicada: REGRAS_PADRAO.formula_texto,
      total_unidades: 0,
      bastioes: 0,
      campos_batalha: 0,
      oposicao: 0
    },
    avisos: []
  };

  // 1. CARREGAR RESULTADOS CNE 2022
  const cnePath = path.join(RAW_DIR, 'resultados_eleitorais_cne_2022.json');
  if (!fs.existsSync(cnePath)) throw new Error(`Arquivo obrigatório ausente: ${cnePath}`);
  const cneData = JSON.parse(fs.readFileSync(cnePath, 'utf-8'));
  relatorio.arquivos_processados.push({ arquivo: 'resultados_eleitorais_cne_2022.json', proveniencia: cneData.metadados.proveniencia, fonte: cneData.metadados.orgao_emissor });

  // 2. CARREGAR PROJEÇÕES DEMOGRÁFICAS INE
  const inePath = path.join(RAW_DIR, 'populacao_projecoes_ine.json');
  if (!fs.existsSync(inePath)) throw new Error(`Arquivo obrigatório ausente: ${inePath}`);
  const ineData = JSON.parse(fs.readFileSync(inePath, 'utf-8'));
  relatorio.arquivos_processados.push({ arquivo: 'populacao_projecoes_ine.json', proveniencia: ineData.metadados.proveniencia, fonte: ineData.metadados.orgao_emissor });

  // 3. CARREGAR MALHAS VETORIAIS DPA 2016 e DPA 2024
  const malha2016Path = path.join(RAW_DIR, 'malha_angola_dpa2016.geojson');
  const malha2024Path = path.join(RAW_DIR, 'malha_angola_dpa2024.geojson');
  const deParaPath = path.join(RAW_DIR, 'de_para_dpa_2016_2024.json');

  const malha2016 = JSON.parse(fs.readFileSync(malha2016Path, 'utf-8'));
  const malha2024 = JSON.parse(fs.readFileSync(malha2024Path, 'utf-8'));
  const deParaData = JSON.parse(fs.readFileSync(deParaPath, 'utf-8'));

  relatorio.arquivos_processados.push({ arquivo: 'malha_angola_dpa2016.geojson', proveniencia: 'OFICIAL' });
  relatorio.arquivos_processados.push({ arquivo: 'malha_angola_dpa2024.geojson', proveniencia: 'OFICIAL/ESTIMADO' });
  relatorio.arquivos_processados.push({ arquivo: 'de_para_dpa_2016_2024.json', proveniencia: deParaData.metadados.proveniencia });

  // Indexação em mapas para junção e detecção de duplicados
  const mapaCNE = new Map();
  cneData.provincias.forEach(p => {
    if (mapaCNE.has(p.codigo_cne)) {
      relatorio.auditoria_qualidade.total_duplicados_detectados++;
      relatorio.avisos.push(`Código CNE duplicado: ${p.codigo_cne}`);
    } else {
      mapaCNE.set(p.codigo_cne, p);
    }
  });

  const mapaINE = new Map();
  ineData.provincias.forEach(p => {
    mapaINE.set(p.codigo_ine, p);
  });

  // GERAÇÃO DO SCRIPT SQL E AUDITORIA DE GEOMETRIAS
  let sqlBuffer = `-- ==============================================================================
-- CARGA DE DADOS TERRITORIAIS OFICIAIS VERSIONADOS - PIPELINE ETL
-- Gerado em: ${new Date().toISOString()}
-- Proveniência: OFICIAL (CNE 2022 / INE Projeções / Lei DPA)
-- ==============================================================================

`;

  // Inserir Versões de Malha
  sqlBuffer += `INSERT INTO versoes_malha (codigo, nome, diploma_legal, ano_vigencia, total_provincias, total_municipios, ativo_para_campanha_2027)
VALUES 
('DPA_2016_18P', 'Divisão Político-Administrativa Lei 18/16 (18 Províncias)', 'Lei n.º 18/16 de 17 de Outubro', 2016, 18, 164, FALSE),
('DPA_2024_21P', 'Nova Divisão Político-Administrativa 2024 (21 Províncias)', 'Lei da Divisão Político-Administrativa 2024', 2024, 21, 325, TRUE)
ON CONFLICT (codigo) DO UPDATE SET ativo_para_campanha_2027 = EXCLUDED.ativo_para_campanha_2027;\n\n`;

  // Inserir Regra Padrão de Zonamento Matemático
  sqlBuffer += `INSERT INTO regras_zonamento (nome_regra, formula_codigo, descricao_formula, limiar_bastiao_margem, limiar_oposicao_margem, padrao_sistema, ativo)
VALUES (
    '${REGRAS_PADRAO.nome.replace(/'/g, "''")}',
    '${REGRAS_PADRAO.codigo.replace(/'/g, "''")}',
    '${REGRAS_PADRAO.formula_texto.replace(/'/g, "''")}',
    ${REGRAS_PADRAO.limiar_bastiao_margem},
    ${REGRAS_PADRAO.limiar_oposicao_margem},
    TRUE,
    TRUE
) ON CONFLICT DO NOTHING;\n\n`;

  // Processar Malha 2016 (18 Províncias)
  console.log('📦 Processando Malha DPA 2016 (18 Províncias)...');
  relatorio.versoes_malha_carregadas.push({ codigo: 'DPA_2016_18P', total_features: malha2016.features.length });

  malha2016.features.forEach((feat, idx) => {
    relatorio.auditoria_qualidade.total_registros_analisados++;
    const prop = feat.properties;
    const geom = feat.geometry;

    // Auditoria de nulos
    if (!prop.codigo_dpa || !prop.nome) {
      relatorio.auditoria_qualidade.total_nulos_detectados++;
      relatorio.avisos.push(`Feature #${idx} com campos obrigatórios nulos.`);
    }

    // Auditoria espacial (SRID 4326)
    const [cLon, cLat] = prop.centroide || [];
    const validacaoPonto = validarCoordenadaAngola(cLon, cLat);
    if (!validacaoPonto.valido) {
      relatorio.auditoria_qualidade.total_fora_srid_4326++;
      relatorio.avisos.push(`Centroide da província ${prop.nome} inválido: ${validacaoPonto.motivo}`);
    }

    if (!geom || !geom.coordinates || geom.coordinates.length === 0) {
      relatorio.auditoria_qualidade.total_geometrias_invalidas++;
      relatorio.avisos.push(`Geometria inválida para província ${prop.nome}`);
    }

    // Enriquecimento com CNE e INE
    const dadosCNE = mapaCNE.get(prop.codigo_dpa) || {};
    const dadosINE = mapaINE.get(prop.codigo_dpa) || {};

    const popTotal = dadosINE.populacao_total || null;
    const pop18 = dadosINE.populacao_18_mais || null;
    const juventudePerc = dadosINE.jovens_perc_eleitorado || null;
    const eleitoresCNE = dadosCNE.eleitores_registados || null;

    // Cálculo Determinístico do Zonamento Político (Fórmula Matemática Transparente)
    const calculo = calcularZonamento({
      votos_partido: dadosCNE.votos_partido_a || 0,
      votos_oposicao: dadosCNE.votos_partido_b || 0,
      total_validos: dadosCNE.votos_validos || 0
    });

    relatorio.resumo_zonamento_calculado.total_unidades++;
    if (calculo.zonamento === 'BASTIAO') relatorio.resumo_zonamento_calculado.bastioes++;
    else if (calculo.zonamento === 'OPOSICAO') relatorio.resumo_zonamento_calculado.oposicao++;
    else relatorio.resumo_zonamento_calculado.campos_batalha++;

    // Inserção da Unidade Territorial no SQL
    const geomJsonStr = JSON.stringify(geom).replace(/'/g, "''");
    sqlBuffer += `INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, populacao_18_mais, juventude_perc, eleitores_registados_cne, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P'),
    ${sqlLiteral(prop.codigo_dpa)},
    ${sqlLiteral(prop.nome)},
    ${sqlLiteral(String(prop.nome || '').toUpperCase())},
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(${cLon}, ${cLat}), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('${geomJsonStr}'), 4326),
    ${popTotal !== null ? popTotal : 'NULL'},
    ${pop18 !== null ? pop18 : 'NULL'},
    ${juventudePerc !== null ? juventudePerc : 'NULL'},
    ${eleitoresCNE !== null ? eleitoresCNE : 'NULL'},
    'OFICIAL',
    'CNE Eleições 2022 / INE Projeções População',
    '2022-08-29',
    ${sqlLiteral(JSON.stringify({ capital: prop.capital, regiao: prop.regiao, zonamento_calculado: calculo.zonamento, margem_cne: calculo.margem_perc }))}
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    populacao_total = EXCLUDED.populacao_total,
    populacao_18_mais = EXCLUDED.populacao_18_mais,
    eleitores_registados_cne = EXCLUDED.eleitores_registados_cne,
    metadados = EXCLUDED.metadados;\n\n`;

    // Inserção da Métrica Territorial e Histórico Eleitoral Auditável
    if (dadosCNE.votos_validos) {
      sqlBuffer += `INSERT INTO metricas_territoriais (
    unidade_territorial_id, eleicao_ano, total_eleitores_aptos, total_votantes, abstencao_indice,
    votos_partido_referencia, votos_oposicao_referencia, votos_partido_referencia_perc, votos_oposicao_referencia_perc,
    margem_apurada_perc, zonamento_calculado, formula_explicativa, proveniencia, fonte_detalhada, data_referencia
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE codigo_oficial = ${sqlLiteral(prop.codigo_dpa)} AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P')),
    2022,
    ${dadosCNE.eleitores_registados},
    ${dadosCNE.votantes_total},
    ${(dadosCNE.abstencao_perc / 100).toFixed(4)},
    ${dadosCNE.votos_partido_a},
    ${dadosCNE.votos_partido_b},
    ${calculo.votos_partido_perc},
    ${calculo.votos_oposicao_perc},
    ${calculo.margem_perc},
    '${calculo.zonamento}',
    '${calculo.formula_aplicada.replace(/'/g, "''")}',
    'OFICIAL',
    'Ata de Apuramento Geral da CNE de Angola - Eleições 2022',
    '2022-08-29'
) ON CONFLICT (unidade_territorial_id, eleicao_ano) DO UPDATE SET
    margem_apurada_perc = EXCLUDED.margem_apurada_perc,
    zonamento_calculado = EXCLUDED.zonamento_calculado,
    formula_explicativa = EXCLUDED.formula_explicativa;\n\n`;
    }
  });

  // Processar Malha 2024 (21 Províncias)
  console.log('📦 Processando Malha DPA 2024 (21 Províncias)...');
  relatorio.versoes_malha_carregadas.push({ codigo: 'DPA_2024_21P', total_features: malha2024.features.length });

  malha2024.features.forEach((feat, idx) => {
    relatorio.auditoria_qualidade.total_registros_analisados++;
    const prop = feat.properties;
    const geom = feat.geometry;
    const [cLon, cLat] = prop.centroide || [];

    const geomJsonStr = JSON.stringify(geom).replace(/'/g, "''");
    sqlBuffer += `INSERT INTO unidades_territoriais (
    versao_malha_id, codigo_oficial, nome, nome_normalizado, nivel_territorial, centroide, geometria_delimitacao,
    populacao_total, proveniencia_dados, fonte_referencia, data_referencia, metadados
) VALUES (
    (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P'),
    ${sqlLiteral(prop.codigo_dpa)},
    ${sqlLiteral(prop.nome)},
    ${sqlLiteral(String(prop.nome || '').toUpperCase())},
    'PROVINCIA',
    ST_SetSRID(ST_MakePoint(${cLon}, ${cLat}), 4326)::geography,
    ST_SetSRID(ST_GeomFromGeoJSON('${geomJsonStr}'), 4326),
    NULL,
    'OFICIAL',
    'Lei da Divisão Político-Administrativa 2024',
    '2024-03-01',
    ${sqlLiteral(JSON.stringify({ capital: prop.capital, nova_provincia: prop.codigo_dpa === 'AO-ICB' || prop.codigo_dpa === 'AO-MXL' || prop.codigo_dpa === 'AO-CDO' }))}
) ON CONFLICT (versao_malha_id, codigo_oficial) DO UPDATE SET
    metadados = EXCLUDED.metadados;\n\n`;
  });

  // Inserir Tabela de Correspondência (De-Para)
  console.log('🔄 Registrando correspondência territorial De-Para...');
  deParaData.correspondencias_provincias.forEach(corr => {
    corr.provincias_2024_resultantes.forEach(dest => {
      const sqlTipo = dest.tipo === 'NOVA_PROVINCIA' ? 'NOVA_UNIDADE' : (dest.tipo === 'REMANESCENTE_URBANA' || dest.tipo === 'REMANESCENTE_OESTE' ? 'REMANESCENTE' : 'INALTERADA');
      sqlBuffer += `INSERT INTO correspondencia_territorial (
    unidade_origem_id, unidade_destino_id, tipo_relacao, notas_explicativas
) VALUES (
    (SELECT id FROM unidades_territoriais WHERE nome = ${sqlLiteral(corr.provincia_2016)} AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2016_18P') LIMIT 1),
    (SELECT id FROM unidades_territoriais WHERE nome = ${sqlLiteral(dest.nome)} AND versao_malha_id = (SELECT id FROM versoes_malha WHERE codigo = 'DPA_2024_21P') LIMIT 1),
    '${sqlTipo}',
    'Transição DPA 2016 para DPA 2024: ${dest.tipo}'
) ON CONFLICT DO NOTHING;\n\n`;
    });
  });

  // Salvar Arquivo SQL e Relatório JSON
  fs.mkdirSync(path.dirname(OUTPUT_REPORT_PATH), { recursive: true });
  fs.mkdirSync(path.dirname(OUTPUT_SQL_PATH), { recursive: true });

  const totalAuditados = relatorio.auditoria_qualidade.total_registros_analisados || 0;
  const foraSrid = relatorio.auditoria_qualidade.total_fora_srid_4326 || 0;
  relatorio.auditoria_qualidade.conformidade_srid_4326_perc = totalAuditados
    ? Number((((totalAuditados - foraSrid) / totalAuditados) * 100).toFixed(2))
    : 0;

  fs.writeFileSync(OUTPUT_REPORT_PATH, JSON.stringify(relatorio, null, 2), 'utf-8');
  fs.writeFileSync(OUTPUT_SQL_PATH, sqlBuffer, 'utf-8');

  console.log('\n================================================================');
  console.log(`✅ RELATÓRIO DE QUALIDADE GERADO: ${OUTPUT_REPORT_PATH}`);
  console.log(`✅ SCRIPT SQL CONSOLIDADO GERADO: ${OUTPUT_SQL_PATH}`);
  console.log(`📊 Total Registros Auditados: ${relatorio.auditoria_qualidade.total_registros_analisados}`);
  console.log(`🧭 Conformidade SRID 4326: ${relatorio.auditoria_qualidade.conformidade_srid_4326_perc}%`);
  console.log(`🗳️ Zonamento Calculado por Fórmula: ${relatorio.resumo_zonamento_calculado.bastioes} Bastiões, ${relatorio.resumo_zonamento_calculado.campos_batalha} Campos de Batalha, ${relatorio.resumo_zonamento_calculado.oposicao} Oposição.`);
  console.log('================================================================\n');

  return relatorio;
}

if (require.main === module) {
  executarETL();
}

module.exports = { executarETL, validarCoordenadaAngola };
