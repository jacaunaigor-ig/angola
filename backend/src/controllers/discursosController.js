const { query } = require('../config/db');

/**
 * Mapeamento de soluções concretas e propostas políticas por dor local em Angola
 */
const BANCO_PROPOSTAS = {
  AGUA: {
    dor_label: 'Falta de Água Potável / Cortes Prolongados',
    proposta_chave: 'Plano de Emergência Hídrica Municipal e Expansão das Ligações Domiciliares',
    detalhes: 'Instalação de sistemas fotovoltaicos nos chafarizes comunitários e aceleração dos ramais secundários de distribuição para acabar com a dependência de camiões-cisterna a preços especulativos.',
    frase_de_impacto: '"Água canalizada não é luxo nem favor político: é dignidade básica inegociável para as nossas famílias."'
  },
  ENERGIA: {
    dor_label: 'Cortes Sistemáticos de Eletricidade e Iluminação Pública',
    proposta_chave: 'Reforço dos Postos de Transformação (PTs) e Iluminação Pública Solar',
    detalhes: 'Fim dos apagões nas zonas periféricas com investimento na rede de média tensão e iluminação das vias principais para garantir segurança no regresso do trabalho e dos estudos à noite.',
    frase_de_impacto: '"Vamos iluminar os nossos bairros para que os nossos jovens estudem e os pequenos negócios possam produzir sem medo."'
  },
  EMPREGO: {
    dor_label: 'Desemprego Jovem e Informalidade Precarizada',
    proposta_chave: 'Polo Municipal de Capacitação Técnica e Fundo de Apoio ao Empreendedorismo Jovem',
    detalhes: 'Parcerias com o setor produtivo para estágios remunerados no primeiro emprego, isenção de taxas municipais para microempresas e facilitação de crédito direto para o comércio e oficinas.',
    frase_de_impacto: '"A nossa juventude não quer esmolas nem promessas requentadas: quer trabalho justo, formação prática e oportunidade para vencer na vida."'
  },
  SANEAMENTO: {
    dor_label: 'Acúmulo de Resíduos e Valas de Drenagem a Céu Aberto',
    proposta_chave: 'Reestruturação da Limpeza Urbana e Macrodrenagem de Águas Pluviais',
    detalhes: 'Contratos transparentes de recolha diária de lixo com cooperativas de jovens locais e desassoreamento preventivo das valas de escoamento antes da época das chuvas.',
    frase_de_impacto: '"Chega de conviver com valas a céu aberto e epidemias evitáveis. Bairro limpo é saúde e respeito aos nossos filhos."'
  },
  ESTRADAS: {
    dor_label: 'Vias Intransitáveis, Buracos e Isolamento Comunitário',
    proposta_chave: 'Plano "Asfalto no Meu Bairro" e Reabilitação Contínua de Estradas Terciárias',
    detalhes: 'Pavimentação com blocos intertravados (gerando mão de obra local) nas vias de ligação e circulação de transportes públicos (táxis azuis e brancos e autocarros).',
    frase_de_impacto: '"Estrada transitável significa táxi na porta, ambulância a chegar a tempo e comida do campo a chegar ao mercado."'
  },
  SAUDE: {
    dor_label: 'Falta de Medicamentos e Filas nos Centros de Saúde',
    proposta_chave: 'Abastecimento Permanente de Farmácias Comunitárias e Atendimento 24h',
    detalhes: 'Garantia de stock de medicamentos essenciais (malária, pediatria, hipertensão) e escala médica reforçada nos centros de saúde de referência municipal.',
    frase_de_impacto: '"Nenhum angolano deve perder a vida num hospital por falta de um kit básico de soro ou medicamento."'
  },
  EDUCACAO: {
    dor_label: 'Falta de Vagas nas Escolas e Ensino Técnico Distante',
    proposta_chave: 'Expansão da Rede Escolar Pública e Centros Integrados de Formação',
    detalhes: 'Construção de novas salas de aula climatizadas para eliminar turmas ao ar livre e ampliação de institutos médios politécnicos próximos dos núcleos residenciais.',
    frase_de_impacto: '"A escola pública de qualidade é o único elevador social que transforma o filho do trabalhador no líder de amanhã."'
  },
  HABITACAO: {
    dor_label: 'Custo Excessivo de Renda e Falta de Títulos de Superfície',
    proposta_chave: 'Programa de Lotes Infraestruturados e Regularização Fundiária',
    detalhes: 'Entrega de lotes urbanizados com arruamento e cadastro seguro, além de linha de apoio à auto-construção assistida.',
    frase_de_impacto: '"O direito a um teto seguro e a um documento de posse é a garantia de paz de espírito para os chefes de família."'
  },
  SEGURANCA: {
    dor_label: 'Assaltos Noturnos e Falta de Efetivo Policial',
    proposta_chave: 'Policiamento Comunitário de Proximidade e Esquadras Móveis',
    detalhes: 'Rondas frequentes nas paragens de táxis e esquinas escuras, com canal direto de comunicação entre as comissões de moradores e a polícia municipal.',
    frase_de_impacto: '"Quem manda nas ruas deve ser a ordem e a família trabalhadora, não a criminalidade."'
  }
};

/**
 * Controller de Gestão de Promessas e Geração de Discursos Territorializados
 */
const discursosController = {
  /**
   * Gera a cábula e estrutura tática de discurso para o candidato com base no município
   * Rota: GET /api/discurso-territorializado/:municipio
   */
  async gerarDiscursoMunicipio(req, res, next) {
    try {
      const { municipio } = req.params;
      const { campanha_id } = req.query;

      if (!municipio) {
        return res.status(400).json({ erro: 'Parâmetro "municipio" é obrigatório.' });
      }

      // 1. Consulta dados estruturais e zonamento do município
      const sqlLocal = `
        SELECT 
          municipio,
          provincia,
          COUNT(*) AS total_assembleias,
          COALESCE(SUM(total_eleitores_aptos), 0) AS total_eleitores,
          MODE() WITHIN GROUP (ORDER BY zonamento_historico) AS zonamento_predominante
        FROM locais_voto
        WHERE LOWER(municipio) = LOWER($1)
        GROUP BY municipio, provincia;
      `;

      // 2. Consulta sentimentos e dores nas visitas de campo
      const sqlVisitas = `
        SELECT 
          COUNT(*) AS total_visitas,
          COUNT(*) FILTER (WHERE sentimento = 'POSITIVO') AS sentimento_positivo,
          COUNT(*) FILTER (WHERE sentimento = 'NEUTRO') AS sentimento_neutro,
          COUNT(*) FILTER (WHERE sentimento = 'NEGATIVO') AS sentimento_negativo,
          COUNT(*) FILTER (WHERE eleitor_jovem = TRUE) AS eleitores_jovens
        FROM visitas_terreno vt
        JOIN locais_voto lv ON ST_DWithin(vt.localizacao, lv.localizacao, 4000)
        WHERE LOWER(lv.municipio) = LOWER($1)
        ${campanha_id ? 'AND vt.campanha_id = $2' : ''};
      `;

      // 3. Ranking das 3 maiores dores locais registradas
      const sqlDores = `
        SELECT 
          dor,
          COUNT(*) AS frequencia,
          ROUND((COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM visitas_terreno vt JOIN locais_voto lv ON ST_DWithin(vt.localizacao, lv.localizacao, 4000) WHERE LOWER(lv.municipio) = LOWER($1)), 0)), 1) AS percentual
        FROM (
          SELECT UNNEST(dores_prioritarias) AS dor
          FROM visitas_terreno vt
          JOIN locais_voto lv ON ST_DWithin(vt.localizacao, lv.localizacao, 4000)
          WHERE LOWER(lv.municipio) = LOWER($1)
          ${campanha_id ? 'AND vt.campanha_id = $2' : ''}
        ) sub
        GROUP BY dor
        ORDER BY frequencia DESC
        LIMIT 4;
      `;

      const params = campanha_id ? [municipio, campanha_id] : [municipio];

      const [resLocal, resVisitas, resDores] = await Promise.all([
        query(sqlLocal, [municipio]),
        query(sqlVisitas, params),
        query(sqlDores, params),
      ]);

      const local = resLocal.rows[0] || {
        municipio,
        provincia: 'Angola',
        total_assembleias: 10,
        total_eleitores: 45000,
        zonamento_predominante: 'CAMPO_BATALHA'
      };

      const visitas = resVisitas.rows[0] || {};
      const doresColetadas = resDores.rows || [];

      // Dores padrão de fallback caso ainda não haja visitas cadastradas naquele município
      const doresFinais = doresColetadas.length > 0 
        ? doresColetadas.map(d => d.dor) 
        : ['EMPREGO', 'AGUA', 'ENERGIA'];

      const zonamento = local.zonamento_predominante || 'CAMPO_BATALHA';

      // 4. Determinação do Tom e Postura Tática do Candidato
      let tomEstrategico = {};
      let aberturaHook = '';
      let armadilhasEvitar = [];

      if (zonamento === 'BASTIAO') {
        tomEstrategico = {
          classificacao: '🟢 BASTIÃO SEGURO (ZONA VERDE)',
          postura: 'Tom de Gratidão, Firmeza e Mobilização Máxima contra a Abstenção',
          objetivo_chave: 'Garantir que 100% dos eleitores fiéis compareçam às urnas; transformar simpatia em votos na urna.',
          ritmo: 'Enérgico, inspirador, comemorativo e firme.'
        };
        aberturaHook = `Minhas irmãs e meus irmãos de ${local.municipio}! Sentir a vossa energia e lealdade é o maior combustível da nossa caminhada. Esta terra sempre foi exemplo de trabalho e confiança, e é com essa mesma confiança que vim aqui olhar nos vossos olhos!`;
        armadilhasEvitar = [
          'Não cair no triunfalismo ou no "já ganhou", que induz os eleitores a faltarem no domingo.',
          'Não prometer obras grandiosas sem data fixa de início; os eleitores locais exigem prestação de contas.',
          'Não ignorar a juventude local assumindo que votarão automaticamente como os pais votaram.'
        ];
      } else if (zonamento === 'OPOSICAO') {
        tomEstrategico = {
          classificacao: '🔴 ZONA DE OPOSIÇÃO / CRÍTICA (ZONA VERMELHA)',
          postura: 'Tom de Humildade, Escuta Ativa, Respeito à Indignação e Compromisso de Mudança Prática',
          objetivo_chave: 'Quebrar a barreira da rejeição, demonstrar que ouviu as queixas e desarmar a militância adversária.',
          ritmo: 'Sereno, respeitoso, sem arrogância e focado em soluções imediatas.'
        };
        aberturaHook = `Povo trabalhador de ${local.municipio}! Sei muito bem que muitos de vós estão cansados de promessas que não chegaram ao vosso bairro. Não vim aqui pedir o vosso apoio cego: vim para assumir compromissos com quem acorda às 5 da manhã e precisa de água, luz e respeito!`;
        armadilhasEvitar = [
          'JAMAIS culpar a população local ou diminuir os problemas de lixo, água ou segurança.',
          'Evitar discursos teóricos ou ideológicos distantes do quotidiano das ruas.',
          'Não prometer resolver tudo em 100 dias: seja cirúrgico nas 2 prioridades absolutas da zona.'
        ];
      } else {
        tomEstrategico = {
          classificacao: '🟡 CAMPO DE BATALHA / EM DISPUTA (ZONA CINZENTA)',
          postura: 'Tom de Decisão, Competência Técnica e Soluções Pragmáticas',
          objetivo_chave: 'Conquistar os indecisos (especialmente a classe média urbana e jovens que hesitam entre a mudança e a estabilidade).',
          ritmo: 'Direto, moderno, focado em entregas e eficiência de gestão.'
        };
        aberturaHook = `Companheiras e companheiros de ${local.municipio}! Esta eleição decide o futuro do vosso município. A questão aqui não são discursos bonitos: é saber quem tem capacidade real para colocar água nas torneiras, iluminar as ruas e abrir caminhos para o emprego dos nossos jovens!`;
        armadilhasEvitar = [
          'Não fazer ataques pessoais desnecessários que afastem os indecisos moderados.',
          'Não dar respostas evasivas sobre o custo de vida e abastecimento público.',
          'Não deixar o palco sem um apelo claro à mobilização dos indecisos.'
        ];
      }

      // 5. Montagem das Promessas Territorializadas baseadas nas Dores Reais
      const compromissosDetalhados = doresFinais.map(dorKey => {
        const itemInfo = BANCO_PROPOSTAS[dorKey] || {
          dor_label: dorKey,
          proposta_chave: `Plano Prioritário para Solução de ${dorKey}`,
          detalhes: 'Alocação imediata de verba do orçamento municipal participativo.',
          frase_de_impacto: '"Resolver este problema é o nosso compromisso inabalável com esta comunidade."'
        };
        return {
          dor_identificada: dorKey,
          ...itemInfo
        };
      });

      // 6. Bloco da Juventude (18-35 anos)
      const totalVisitas = parseInt(visitas.total_visitas || '0', 10);
      const jovens = parseInt(visitas.eleitores_jovens || '0', 10);
      const percJovem = totalVisitas > 0 ? Math.round((jovens / totalVisitas) * 100) : 64;

      const moduloJuventude = {
        peso_eleitoral: `${percJovem}% do eleitorado abordado tem entre 18 e 35 anos`,
        mensagem_central: 'Geração do Futuro e Emprego Produtivo',
        diretrizes_comunicacao: [
          'Utilizar linguagem descontraída, evitando jargões burocráticos ou promessas institucionais enfadonhas.',
          'Focar em conectividade gratuita em praças municipais, cursos de programação/tecnologia e microcrédito.',
          'Incentivar a partilha instantânea no WhatsApp e TikTok durante e após o evento.'
        ],
        apelo_final: `"Você, jovem de ${local.municipio}: o teu voto não é uma formalidade, é a tua voz para decidir onde serão investidos os recursos do teu país!"`
      };

      return res.status(200).json({
        sucesso: true,
        municipio: local.municipio,
        provincia: local.provincia,
        dados_eleitorais: {
          total_eleitores: parseInt(local.total_eleitores || '0', 10),
          total_assembleias: parseInt(local.total_assembleias || '0', 10),
          zonamento_predominante: zonamento
        },
        estrategia_discurso: {
          tom: tomEstrategico,
          abertura_hook: aberturaHook,
          compromissos_prioritarios: compromissosDetalhados,
          modulo_juventude: moduloJuventude,
          armadilhas_a_evitar: armadilhasEvitar,
          gerado_em: new Date().toISOString()
        }
      });
    } catch (erro) {
      console.error('[Discurso Territorializado Error]', erro);
      return res.status(500).json({
        sucesso: false,
        erro: 'Erro ao gerar discurso territorializado para o município.',
        detalhes: erro.message
      });
    }
  }
};

module.exports = discursosController;
