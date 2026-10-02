/**
 * Catálogo comercial B2B — GPS Eleitoral Angola 2027
 * Três SKUs vendáveis: MUNICIPAL, PROVINCIAL, NACIONAL.
 * Preços de tabela em Kwanzas (AOA) para o ciclo eleitoral; a proposta formal prevalece.
 */

const PLANOS = {
  MUNICIPAL: {
    codigo: 'MUNICIPAL',
    nome: 'Plano Municipal',
    publico_alvo: 'Candidatos a administrador municipal, coordenadores de circunscrição e campanhas de um município.',
    tagline: 'O War Room de um município — porta-a-porta, dores e discurso local.',
    ambito: 'MUNICIPIO',
    max_municipios: 1,
    max_provincias: 1,
    limites: {
      contas_war_room: 5,
      brigadistas: 40,
      visitas_mes: 8000,
      discursos_ia_mes: 15,
      assembleias_dia_d: 0,
    },
    funcionalidades: {
      cartografia: true,
      porta_a_porta: true,
      discursos_ia: true,
      simulador_metas: true,
      telemetria_dores: true,
      anomalias_basicas: true,
      invalidar_lote: false,
      dia_d: false,
      casos_juridicos: false,
      malha_dupla_dpa: false,
      api_exportacao: false,
      hq_nacional: false,
    },
    preco_tabela_aoa: 4800000,
    ciclo: 'CICLO_ELEITORAL_2027',
    add_on_municipio_aoa: 2100000,
    add_on_brigadista_bloco_aoa: 350000,
    bloco_brigadistas: 20,
    cor: '#38BDF8',
  },
  PROVINCIAL: {
    codigo: 'PROVINCIAL',
    nome: 'Plano Provincial',
    publico_alvo: 'Direcções provinciais, listas de deputados e coordenadores de uma província.',
    tagline: 'Uma província inteira — priorização, Dia D e governação de discursos.',
    ambito: 'PROVINCIA',
    max_municipios: 40,
    max_provincias: 1,
    limites: {
      contas_war_room: 20,
      brigadistas: 250,
      visitas_mes: 60000,
      discursos_ia_mes: 80,
      assembleias_dia_d: 400,
    },
    funcionalidades: {
      cartografia: true,
      porta_a_porta: true,
      discursos_ia: true,
      simulador_metas: true,
      telemetria_dores: true,
      anomalias_basicas: true,
      invalidar_lote: true,
      dia_d: true,
      casos_juridicos: true,
      malha_dupla_dpa: true,
      api_exportacao: false,
      hq_nacional: false,
    },
    preco_tabela_aoa: 18500000,
    ciclo: 'CICLO_ELEITORAL_2027',
    add_on_municipio_aoa: 0,
    add_on_brigadista_bloco_aoa: 280000,
    bloco_brigadistas: 50,
    cor: '#F97316',
  },
  NACIONAL: {
    codigo: 'NACIONAL',
    nome: 'Plano Nacional / HQ',
    publico_alvo: 'Comissões nacionais, coligações e quartéis-generais de campanha presidencial.',
    tagline: 'As 21 províncias num único comando — isolamento multi-campanha e apuramento nacional.',
    ambito: 'NACIONAL',
    max_municipios: 325,
    max_provincias: 21,
    limites: {
      contas_war_room: 80,
      brigadistas: 2000,
      visitas_mes: 400000,
      discursos_ia_mes: 400,
      assembleias_dia_d: 13000,
    },
    funcionalidades: {
      cartografia: true,
      porta_a_porta: true,
      discursos_ia: true,
      simulador_metas: true,
      telemetria_dores: true,
      anomalias_basicas: true,
      invalidar_lote: true,
      dia_d: true,
      casos_juridicos: true,
      malha_dupla_dpa: true,
      api_exportacao: true,
      hq_nacional: true,
    },
    preco_tabela_aoa: 62000000,
    ciclo: 'CICLO_ELEITORAL_2027',
    add_on_municipio_aoa: 0,
    add_on_brigadista_bloco_aoa: 220000,
    bloco_brigadistas: 100,
    nota_preco: 'Preço de abertura de tabela. A proposta nacional é sempre formal e negociada.',
    cor: '#10B981',
  },
};

const MUNICIPIOS_VENDAVEIS = [
  { municipio: 'Talatona', provincia: 'Luanda' },
  { municipio: 'Viana', provincia: 'Luanda' },
  { municipio: 'Cacuaco', provincia: 'Luanda' },
  { municipio: 'Luanda', provincia: 'Luanda' },
  { municipio: 'Cazenga', provincia: 'Luanda' },
  { municipio: 'Belas', provincia: 'Luanda' },
  { municipio: 'Huambo', provincia: 'Huambo' },
  { municipio: 'Caála', provincia: 'Huambo' },
  { municipio: 'Lobito', provincia: 'Benguela' },
  { municipio: 'Benguela', provincia: 'Benguela' },
  { municipio: 'Lubango', provincia: 'Huíla' },
  { municipio: 'Cabinda', provincia: 'Cabinda' },
  { municipio: 'Malanje', provincia: 'Malanje' },
  { municipio: 'Uíge', provincia: 'Uíge' },
  { municipio: 'Saurimo', provincia: 'Lunda Sul' },
];

function obterPlano(codigo) {
  const chave = String(codigo || '').toUpperCase();
  return PLANOS[chave] || null;
}

function listarPlanos() {
  return Object.values(PLANOS).map((p) => ({
    ...p,
    preco_tabela_formatado: formatarAoa(p.preco_tabela_aoa),
  }));
}

function formatarAoa(valor) {
  return `${Number(valor || 0).toLocaleString('pt-AO').replace(/,/g, '.')} AOA`;
}

function normalizarNome(nome) {
  return String(nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function resolverCircunscricao(territorio) {
  if (!territorio) return null;
  if (typeof territorio === 'object') {
    return {
      municipio: territorio.municipio || null,
      provincia: territorio.provincia || territorio.nome || null,
    };
  }
  const texto = String(territorio).trim();
  const mun = MUNICIPIOS_VENDAVEIS.find(
    (m) => normalizarNome(m.municipio) === normalizarNome(texto)
  );
  if (mun) return mun;
  return { municipio: null, provincia: texto };
}

function nomesNoAmbito(planoCodigo, territorio) {
  const plano = obterPlano(planoCodigo);
  if (!plano) return { ok: false, erro: 'Plano desconhecido.', nomes: [] };
  if (plano.ambito === 'NACIONAL') {
    return { ok: true, nomes: [], irrestrito: true, plano };
  }

  const circ = resolverCircunscricao(territorio);
  if (!circ || !circ.provincia) {
    return { ok: false, erro: 'Indique o território contratado.', nomes: [], plano };
  }

  if (plano.ambito === 'MUNICIPIO') {
    return {
      ok: true,
      nomes: [circ.provincia],
      municipio_contratado: circ.municipio || circ.provincia,
      provincia_contratada: circ.provincia,
      irrestrito: false,
      plano,
    };
  }

  return {
    ok: true,
    nomes: [circ.provincia],
    municipio_contratado: null,
    provincia_contratada: circ.provincia,
    irrestrito: false,
    plano,
  };
}

function unidadeNoAmbito(propriedades, ambito) {
  if (!ambito || ambito.irrestrito) return true;
  const candidatos = [
    propriedades.nome,
    propriedades.provincia,
    propriedades.municipio,
    propriedades.codigo_dpa,
    propriedades.codigo_oficial,
  ];
  const alvos = new Set((ambito.nomes || []).map(normalizarNome));
  return candidatos.some((c) => alvos.has(normalizarNome(c)));
}

function filtrarFeatures(features, planoCodigo, territorio) {
  const ambito = nomesNoAmbito(planoCodigo, territorio);
  if (!ambito.ok) return { ...ambito, features: [] };
  if (ambito.irrestrito) return { ...ambito, features };
  const filtradas = (features || []).filter((f) => unidadeNoAmbito(f.properties || f, ambito));
  return { ...ambito, features: filtradas };
}

function funcionalidadePermitida(planoCodigo, chave) {
  const plano = obterPlano(planoCodigo);
  if (!plano) return false;
  return Boolean(plano.funcionalidades[chave]);
}

function calcularOrcamento({
  plano: planoCodigo,
  territorio,
  brigadistas_contratados,
  municipios_extra = 0,
} = {}) {
  const plano = obterPlano(planoCodigo);
  if (!plano) {
    return { ok: false, erro: 'Seleccione MUNICIPAL, PROVINCIAL ou NACIONAL.' };
  }

  const circ = resolverCircunscricao(territorio);
  if (plano.ambito !== 'NACIONAL' && !circ?.provincia) {
    return { ok: false, erro: 'O plano escolhido exige um território (município ou província).' };
  }

  const brigadistas = Math.max(Number(brigadistas_contratados) || plano.limites.brigadistas, 0);
  const extraBrig = Math.max(0, brigadistas - plano.limites.brigadistas);
  const blocos = extraBrig > 0 ? Math.ceil(extraBrig / plano.bloco_brigadistas) : 0;
  const extraMun = plano.codigo === 'MUNICIPAL' ? Math.max(0, Number(municipios_extra) || 0) : 0;

  const extras = (blocos * plano.add_on_brigadista_bloco_aoa) + (extraMun * plano.add_on_municipio_aoa);
  const total = plano.preco_tabela_aoa + extras;

  return {
    ok: true,
    plano: plano.codigo,
    territorio: circ,
    ciclo: plano.ciclo,
    moeda: 'AOA',
    preco_base_aoa: plano.preco_tabela_aoa,
    extras_aoa: extras,
    total_aoa: total,
    preco_base_formatado: formatarAoa(plano.preco_tabela_aoa),
    extras_formatado: formatarAoa(extras),
    total_formatado: formatarAoa(total),
    limites: {
      ...plano.limites,
      brigadistas_contratados: brigadistas,
    },
    funcionalidades: plano.funcionalidades,
    aviso: 'Preço de tabela do ciclo 2027. A proposta comercial formal prevalece. IVA e condições de pagamento definidos em contrato.',
  };
}

function avaliarUsoContraLimites(planoCodigo, uso = {}) {
  const plano = obterPlano(planoCodigo);
  if (!plano) return { ok: false, erros: ['Plano desconhecido.'] };
  const estouro = [];
  if (uso.brigadistas != null && uso.brigadistas > plano.limites.brigadistas) {
    estouro.push(`Brigadistas ${uso.brigadistas} excedem o limite de ${plano.limites.brigadistas}.`);
  }
  if (uso.visitas_mes != null && uso.visitas_mes > plano.limites.visitas_mes) {
    estouro.push(`Visitas do mês excedem o tecto de ${plano.limites.visitas_mes}.`);
  }
  if (uso.discursos_ia_mes != null && uso.discursos_ia_mes > plano.limites.discursos_ia_mes) {
    estouro.push(`Discursos IA do mês excedem ${plano.limites.discursos_ia_mes}.`);
  }
  return { ok: estouro.length === 0, estouro, limites: plano.limites };
}

module.exports = {
  PLANOS,
  MUNICIPIOS_VENDAVEIS,
  obterPlano,
  listarPlanos,
  formatarAoa,
  resolverCircunscricao,
  nomesNoAmbito,
  unidadeNoAmbito,
  filtrarFeatures,
  funcionalidadePermitida,
  calcularOrcamento,
  avaliarUsoContraLimites,
  normalizarNome,
};
