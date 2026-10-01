/**
 * SCRIPT DE INTEGRAÇÃO CARTOGRÁFICA E ELEITORAL DE ANGOLA
 * Converte dados demográficos, municípios e assembleias de voto para SQL e GeoJSON
 */

const fs = require('fs');
const path = require('path');

// Matriz Oficial Consolidada de Municípios e Zonas Eleitorais de Angola (2027)
const MUNICIPIOS_ANGOLA = [
  {
    municipio: 'Talatona',
    provincia: 'Luanda',
    lat: -8.9167,
    lon: 13.2667,
    populacao: 450000,
    eleitores: 270000,
    abstencao: 0.21,
    perfil: 'Classe Média / Baixa Abstenção',
    zonamento: 'CAMPO_BATALHA',
    dores: ['SEGURANCA', 'AGUA', 'ENERGIA'],
    juventude_perc: 62,
    assembleias: [
      { nome: 'Escola Primária 1024 - Morro Bento', cne: 'CNE-LUA-TAL-001', lat: -8.9167, lon: 13.2667, eleitores: 4200, mesas: 8, zonamento: 'BASTIAO' },
      { nome: 'Complexo Escolar Cidade Universitária', cne: 'CNE-LUA-TAL-002', lat: -8.9320, lon: 13.2850, eleitores: 6500, mesas: 12, zonamento: 'CAMPO_BATALHA' },
      { nome: 'Colégio Angolano de Talatona', cne: 'CNE-LUA-TAL-003', lat: -8.9210, lon: 13.2540, eleitores: 3800, mesas: 7, zonamento: 'CAMPO_BATALHA' }
    ]
  },
  {
    municipio: 'Viana',
    provincia: 'Luanda',
    lat: -8.9100,
    lon: 13.3667,
    populacao: 1900000,
    eleitores: 950000,
    abstencao: 0.39,
    perfil: 'Cinturão Urbano de Oposição',
    zonamento: 'OPOSICAO',
    dores: ['SANEAMENTO', 'AGUA', 'ENERGIA'],
    juventude_perc: 71,
    assembleias: [
      { nome: 'Escola Polivalente de Viana', cne: 'CNE-LUA-VIA-001', lat: -8.9100, lon: 13.3667, eleitores: 7800, mesas: 15, zonamento: 'OPOSICAO' },
      { nome: 'Complexo Escolar Capalanga', cne: 'CNE-LUA-VIA-002', lat: -8.8950, lon: 13.3850, eleitores: 5900, mesas: 11, zonamento: 'OPOSICAO' },
      { nome: 'Escola Comandante Bula - Zango 3', cne: 'CNE-LUA-VIA-003', lat: -8.9800, lon: 13.4300, eleitores: 8200, mesas: 16, zonamento: 'OPOSICAO' }
    ]
  },
  {
    municipio: 'Cacuaco',
    provincia: 'Luanda',
    lat: -8.7833,
    lon: 13.3500,
    populacao: 1100000,
    eleitores: 550000,
    abstencao: 0.41,
    perfil: 'Cinturão Urbano de Oposição',
    zonamento: 'OPOSICAO',
    dores: ['ENERGIA', 'ESTRADAS', 'AGUA'],
    juventude_perc: 68,
    assembleias: [
      { nome: 'Liceu de Cacuaco n.º 4050', cne: 'CNE-LUA-CAC-001', lat: -8.7833, lon: 13.3500, eleitores: 5100, mesas: 10, zonamento: 'OPOSICAO' },
      { nome: 'Escola Primária da Sequele', cne: 'CNE-LUA-CAC-002', lat: -8.7450, lon: 13.4600, eleitores: 6400, mesas: 12, zonamento: 'CAMPO_BATALHA' }
    ]
  },
  {
    municipio: 'Luanda',
    provincia: 'Luanda',
    lat: -8.8368,
    lon: 13.2343,
    populacao: 2500000,
    eleitores: 1250000,
    abstencao: 0.28,
    perfil: 'Zona Disputada / Centro Urbano',
    zonamento: 'CAMPO_BATALHA',
    dores: ['EMPREGO', 'SEGURANCA', 'HABITACAO'],
    juventude_perc: 65,
    assembleias: [
      { nome: 'Liceu Mutu-ya-Kevela', cne: 'CNE-LUA-LUA-001', lat: -8.8150, lon: 13.2350, eleitores: 7200, mesas: 14, zonamento: 'BASTIAO' },
      { nome: 'Escola Ngola Kiluanje', cne: 'CNE-LUA-LUA-002', lat: -8.8250, lon: 13.2450, eleitores: 6800, mesas: 13, zonamento: 'CAMPO_BATALHA' }
    ]
  },
  {
    municipio: 'Huambo',
    provincia: 'Huambo',
    lat: -12.7761,
    lon: 15.7392,
    populacao: 850000,
    eleitores: 420000,
    abstencao: 0.29,
    perfil: 'Reduto Tradicional / Planalto Central',
    zonamento: 'BASTIAO',
    dores: ['EMPREGO', 'ESTRADAS', 'EDUCACAO'],
    juventude_perc: 59,
    assembleias: [
      { nome: 'Escola Secundária do Huambo', cne: 'CNE-HUA-HUA-001', lat: -12.7761, lon: 15.7392, eleitores: 7200, mesas: 14, zonamento: 'BASTIAO' },
      { nome: 'Complexo Escolar de São Pedro', cne: 'CNE-HUA-HUA-002', lat: -12.7900, lon: 15.7200, eleitores: 5400, mesas: 10, zonamento: 'BASTIAO' }
    ]
  },
  {
    municipio: 'Lubango',
    provincia: 'Huíla',
    lat: -14.9172,
    lon: 13.4925,
    populacao: 800000,
    eleitores: 400000,
    abstencao: 0.27,
    perfil: 'Zona Disputada / Sul',
    zonamento: 'CAMPO_BATALHA',
    dores: ['AGUA', 'ESTRADAS', 'SAUDE'],
    juventude_perc: 58,
    assembleias: [
      { nome: 'Instituto Médio Politécnico do Lubango', cne: 'CNE-HUI-LUB-001', lat: -14.9172, lon: 13.4925, eleitores: 6900, mesas: 13, zonamento: 'CAMPO_BATALHA' },
      { nome: 'Escola do Comércio do Lubango', cne: 'CNE-HUI-LUB-002', lat: -14.9300, lon: 13.5100, eleitores: 4800, mesas: 9, zonamento: 'BASTIAO' }
    ]
  },
  {
    municipio: 'Benguela',
    provincia: 'Benguela',
    lat: -12.5763,
    lon: 13.4055,
    populacao: 600000,
    eleitores: 310000,
    abstencao: 0.30,
    perfil: 'Corredor Litorâneo Disputado',
    zonamento: 'CAMPO_BATALHA',
    dores: ['EMPREGO', 'ENERGIA', 'SANEAMENTO'],
    juventude_perc: 63,
    assembleias: [
      { nome: 'Liceu Comandante Cassanje', cne: 'CNE-BEN-BEN-001', lat: -12.5763, lon: 13.4055, eleitores: 5800, mesas: 11, zonamento: 'CAMPO_BATALHA' }
    ]
  },
  {
    municipio: 'Lobito',
    provincia: 'Benguela',
    lat: -12.3644,
    lon: 13.5436,
    populacao: 400000,
    eleitores: 210000,
    abstencao: 0.32,
    perfil: 'Corredor Litorâneo Disputado',
    zonamento: 'CAMPO_BATALHA',
    dores: ['EMPREGO', 'AGUA', 'SAUDE'],
    juventude_perc: 66,
    assembleias: [
      { nome: 'Colégio São José - Caponte', cne: 'CNE-BEN-LOB-001', lat: -12.3644, lon: 13.5436, eleitores: 4600, mesas: 9, zonamento: 'CAMPO_BATALHA' },
      { nome: 'Complexo Escolar da Restinga', cne: 'CNE-BEN-LOB-002', lat: -12.3400, lon: 13.5600, eleitores: 3900, mesas: 7, zonamento: 'OPOSICAO' }
    ]
  },
  {
    municipio: 'Cabinda',
    provincia: 'Cabinda',
    lat: -5.5560,
    lon: 12.1960,
    populacao: 400000,
    eleitores: 200000,
    abstencao: 0.25,
    perfil: 'Enclave Petrolífero / Disputado',
    zonamento: 'OPOSICAO',
    dores: ['EMPREGO', 'CUSTO_VIDA', 'ENERGIA'],
    juventude_perc: 67,
    assembleias: [
      { nome: 'Escola Barão Puna', cne: 'CNE-CAB-CAB-001', lat: -5.5560, lon: 12.1960, eleitores: 5200, mesas: 10, zonamento: 'OPOSICAO' }
    ]
  }
];

// 1. Gera GeoJSON enriquecido para visualização Mobile
const geojsonFeatures = [];

MUNICIPIOS_ANGOLA.forEach((m) => {
  // Ponto Central do Município
  geojsonFeatures.push({
    type: 'Feature',
    properties: {
      tipo: 'municipio',
      nome: m.municipio,
      provincia: m.provincia,
      populacao: m.populacao,
      eleitores: m.eleitores,
      abstencao: m.abstencao,
      perfil: m.perfil,
      zonamento: m.zonamento,
      juventude_perc: m.juventude_perc,
      dores: m.dores
    },
    geometry: {
      type: 'Point',
      coordinates: [m.lon, m.lat]
    }
  });

  // Assembleias de Voto
  m.assembleias.forEach((a) => {
    geojsonFeatures.push({
      type: 'Feature',
      properties: {
        tipo: 'assembleia_voto',
        nome: a.nome,
        codigo_cne: a.cne,
        municipio: m.municipio,
        provincia: m.provincia,
        eleitores_aptos: a.eleitores,
        mesas: a.mesas,
        zonamento: a.zonamento
      },
      geometry: {
        type: 'Point',
        coordinates: [a.lon, a.lat]
      }
    });
  });
});

const geojsonOutput = {
  type: 'FeatureCollection',
  name: 'angola_geomarketing_eleitoral_2027',
  features: geojsonFeatures
};

const geojsonPath = path.join(__dirname, '..', 'mobile', 'src', 'data', 'angola_cartografia_eleitoral.json');
fs.mkdirSync(path.dirname(geojsonPath), { recursive: true });
fs.writeFileSync(geojsonPath, JSON.stringify(geojsonOutput, null, 2), 'utf-8');
console.log(`✅ GeoJSON Cartográfico gerado em: ${geojsonPath}`);

// 2. Gera Script SQL de Carga (Seed dos Municípios e Assembleias)
let sqlSeed = `-- ==============================================================================
-- CARGA OFICIAL CONSOLIDADA: ASSEMBLEIAS E MUNICÍPIOS DE ANGOLA 2027
-- ==============================================================================

`;

MUNICIPIOS_ANGOLA.forEach((m) => {
  m.assembleias.forEach((a) => {
    sqlSeed += `INSERT INTO locais_voto (codigo_cne, nome, provincia, municipio, total_mesas, total_eleitores_aptos, zonamento_historico, localizacao)
VALUES (
    '${a.cne}',
    '${a.nome.replace(/'/g, "''")}',
    '${m.provincia}',
    '${m.municipio}',
    ${a.mesas},
    ${a.eleitores},
    '${a.zonamento}',
    ST_SetSRID(ST_MakePoint(${a.lon}, ${a.lat}), 4326)::geography
) ON CONFLICT (codigo_cne) DO UPDATE SET
    total_eleitores_aptos = EXCLUDED.total_eleitores_aptos,
    zonamento_historico = EXCLUDED.zonamento_historico;\n\n`;
  });
});

const sqlPath = path.join(__dirname, '..', 'database', '03_seed_municipios_angola.sql');
fs.writeFileSync(sqlPath, sqlSeed, 'utf-8');
console.log(`✅ Script SQL de Carga gerado em: ${sqlPath}`);
