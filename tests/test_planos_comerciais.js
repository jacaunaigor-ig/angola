const assert = require('assert');
const {
  calcularOrcamento,
  filtrarFeatures,
  funcionalidadePermitida,
  listarPlanos,
  nomesNoAmbito,
} = require('../backend/src/services/planosComerciaisService');

function asserir(desc, cond) {
  if (!cond) {
    console.error(`❌ ${desc}`);
    process.exitCode = 1;
  } else {
    console.log(`✅ ${desc}`);
  }
}

const planos = listarPlanos();
asserir('Catálogo tem exactamente 3 SKUs vendáveis', planos.length === 3);

asserir('Municipal não inclui Dia D', funcionalidadePermitida('MUNICIPAL', 'dia_d') === false);
asserir('Provincial inclui Dia D e casos jurídicos', funcionalidadePermitida('PROVINCIAL', 'dia_d') && funcionalidadePermitida('PROVINCIAL', 'casos_juridicos'));
asserir('Nacional inclui HQ e API', funcionalidadePermitida('NACIONAL', 'hq_nacional') && funcionalidadePermitida('NACIONAL', 'api_exportacao'));

const features = [
  { properties: { nome: 'Luanda' } },
  { properties: { nome: 'Huambo' } },
  { properties: { nome: 'Cabinda' } },
];

const mun = filtrarFeatures(features, 'MUNICIPAL', 'Talatona');
asserir('Municipal Talatona restringe à província de Luanda', mun.ok && mun.features.length === 1 && mun.features[0].properties.nome === 'Luanda');

const prov = filtrarFeatures(features, 'PROVINCIAL', 'Huambo');
asserir('Provincial Huambo devolve só Huambo', prov.features.length === 1 && prov.features[0].properties.nome === 'Huambo');

const nac = filtrarFeatures(features, 'NACIONAL');
asserir('Nacional não restringe a malha', nac.irrestrito && nac.features.length === 3);

const orc = calcularOrcamento({ plano: 'MUNICIPAL', territorio: 'Viana' });
asserir('Orçamento municipal em AOA com território', orc.ok && orc.total_aoa === 4800000 && orc.territorio.provincia === 'Luanda');

const falha = calcularOrcamento({ plano: 'PROVINCIAL' });
asserir('Provincial sem território é recusado', falha.ok === false);

const ambito = nomesNoAmbito('MUNICIPAL', 'Lobito');
asserir('Lobito resolve para Benguela', ambito.ok && ambito.provincia_contratada === 'Benguela');

if (process.exitCode) {
  console.error('Falhas no catálogo comercial.');
  process.exit(1);
}
console.log('Planos comerciais: todos os testes passaram.');
