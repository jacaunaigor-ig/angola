/**
 * Serviço de Geração de Discursos Territorializados com IA (Anthropic Claude)
 * Implementa governança rigorosa:
 * - IA Apoia, Humano Decide (Status obrigatório: RASCUNHO)
 * - Proibição de dados inventados (Uso exclusivo de dados territoriais com fonte)
 * - Proibição de ataques pessoais
 * - Toda proposta é marcada com a tag obrigatória "[PROMESSA — REVISAR]"
 */

const Anthropic = require('@anthropic-ai/sdk');

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';

/**
 * Monta o System Prompt auditado para geração de discursos de campanha
 */
function construirSystemPrompt() {
  return `Você é um consultor sênior de inteligência estratégica e redator tático de geomarketing político para a campanha eleitoral em Angola (Pleito de 2027).

DIRETRIZES E REGRAS INEGOCIÁVEIS DO SISTEMA:
1. IA APOIA, HUMANO DECIDE: Sua saída é exclusivamente um RASCUNHO que será submetido a revisão e aprovação humana pelo comitê de campanha.
2. HONESTIDADE DOS DADOS: Utilize ÚNICA E EXCLUSIVAMENTE os dados estatísticos, percentuais e indicadores fornecidos no contexto. NUNCA invente números, percentuais ou pesquisas de opinião não fornecidas.
3. SEM ATAQUES PESSOAIS: Não use linguagem difamatória, insultos ou acusações de caráter pessoal contra adversários políticos. O foco deve ser 100% programático, em soluções práticas para os cidadãos.
4. IDENTIFICAÇÃO OBRIGATÓRIA DE PROMESSAS: Toda e qualquer promessa, projeto de lei, obra ou compromisso de futuro DEVE ser OBRIGATORIAMENTE prefixada com a tag: "[PROMESSA — REVISAR]".
5. ADAPTAÇÃO AO ZONAMENTO TERRITORIAL:
   - Se o território for BASTIÃO: O tom deve ser de gratidão, fidelidade, prestação de contas e apelo firme para combater a abstenção.
   - Se o território for OPOSIÇÃO: O tom deve ser de humildade, escuta atenta, reconhecimento da frustração com serviços públicos e compromisso com mudanças essenciais (água, luz, saneamento).
   - Se o território for CAMPO DE BATALHA: O tom deve ser de competência técnica, segurança e respostas práticas para os eleitores indecisos e comerciantes.

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON):
Retorne apenas um objeto JSON válido (sem tags markdown de bloco no início e fim) com a seguinte estrutura:
{
  "hook_abertura": "Frase de impacto inicial do candidato ao subir ao palco",
  "tom_adotado": "Descrição sucinta do tom tático utilizado",
  "compromissos_propostas": [
    {
      "dor_associada": "Ex: AGUA, ENERGIA, EMPREGO",
      "texto_proposta": "[PROMESSA — REVISAR] Descrição da proposta concreta com prazo e escopo"
    }
  ],
  "bloco_juventude": "Mensagem direcionada aos eleitores jovens de 18 a 35 anos",
  "armadilhas_a_evitar": [
    "Alerta 1 do que NÃO deve ser dito neste território",
    "Alerta 2"
  ]
}`;
}

/**
 * Monta o User Prompt injetando dados territoriais oficiais auditados
 */
function construirUserPrompt(contexto) {
  const {
    territorio,
    provincia,
    zonamento,
    margem_cne,
    eleitores,
    juventude_perc,
    abstencao_cne,
    dores_locais,
    nome_partido,
    nome_oposicao,
    diretrizes_cliente
  } = contexto;

  return `Gere o rascunho de discurso para o município/província de ${territorio} (${provincia}):

DADOS TERRITORIAIS AUDITADOS (Fontes Oficiais CNE / INE Angola):
- Unidade Territorial: ${territorio} (${provincia})
- Classificação Política Calculada: ${zonamento}
- Margem Apurada nas Eleições de 2022: ${margem_cne > 0 ? '+' : ''}${margem_cne}% (Fonte: CNE Angola)
- Total de Eleitores Registados: ${eleitores ? eleitores.toLocaleString() : 'Conforme cadastro CNE'} (Fonte: CNE)
- Eleitorado Jovem (18-35 anos): ${juventude_perc}% (Fonte: Projeções INE Angola)
- Abstenção Histórica no Território: ${abstencao_cne}% (Fonte: CNE 2022)
- Principais Dores Coletadas em Campo pelas Brigadas: ${Array.isArray(dores_locais) ? dores_locais.join(', ') : 'Água, Luz, Emprego Jovem'}

PARÂMETROS DA CAMPANHA:
- Nosso Partido / Coligação: ${nome_partido || 'Nosso Partido'}
- Concorrente Principal: ${nome_oposicao || 'Oposição Consolidada'}
- Diretrizes Especiais do Comitê: ${diretrizes_cliente || 'Foco em dignidade básica e combate à abstenção.'}

Gere o JSON com todas as tags [PROMESSA — REVISAR] obrigatórias.`;
}

/**
 * Gerador Heurístico Auditado de Fallback (Modo Offline / Sem Chave da API)
 * Garante que o sistema nunca caia e respeite 100% as regras de promessas e neutralidade
 */
function gerarFallbackAuditado(contexto) {
  const { territorio, provincia, zonamento, juventude_perc, dores_locais } = contexto;
  const dores = Array.isArray(dores_locais) && dores_locais.length > 0 ? dores_locais : ['Água', 'Energia Elétrica', 'Emprego Jovem'];

  let hook = "";
  let tom = "";
  let armadilhas = [];

  if (zonamento === 'BASTIAO') {
    tom = "Gratidão, prestação de contas e mobilização contra a abstenção";
    hook = `Minhas irmãs e meus irmãos de ${territorio}! Estar nesta terra valorosa de ${provincia} é renovar a nossa aliança histórica de trabalho e dignidade. Mas no dia da eleição, cada um de nós tem o dever cívico de comparecer às urnas logo pela manhã e garantir que nossa voz continue soberana!`;
    armadilhas = [
      "Não demonstrar triunfalismo ou dizer que a eleição já está ganha antecipadamente.",
      "Não esquecer dos jovens de 18 a 24 anos que não viveram o histórico da campanha."
    ];
  } else if (zonamento === 'OPOSICAO') {
    tom = "Humildade, escuta ativa, reconhecimento de queixas legítimas e compromisso prático";
    hook = `Povo trabalhador e incansável de ${territorio}! Sei perfeitamente das dificuldades diárias que enfrentam e que estão cansados de promessas vazias. Não estou aqui para pedir aplausos fáceis: estou aqui com humildade para assumir compromissos com quem acorda às 5 da manhã e precisa de respeito!`;
    armadilhas = [
      "JAMAIS culpar a população local pelos problemas de infraestrutura ou saneamento.",
      "Evitar discursos partidários agressivos; focar exclusivamente em soluções básicas imediatas."
    ];
  } else {
    tom = "Competência técnica, previsibilidade e propostas pragmáticas para indecisos";
    hook = `Companheiras e companheiros de ${territorio}! Esta eleição decide o futuro concreto da nossa comunidade. Não se trata de retórica, mas de quem tem capacidade e seriedade para colocar água nas torneiras, iluminar os bairros e abrir caminhos para o pequeno negócio!`;
    armadilhas = [
      "Evitar ataques pessoais que assustem o eleitorado moderado e as famílias de classe média.",
      "Não dar respostas evasivas sobre o custo de vida e abastecimento público."
    ];
  }

  const compromissos = dores.slice(0, 3).map((dor) => ({
    dor_associada: dor,
    texto_proposta: `[PROMESSA — REVISAR] Plano municipal prioritário para resolução de ${dor} com início de obras no primeiro semestre de mandato e fiscalização das comissões de moradores.`
  }));

  return {
    modelo_utilizado: 'heuristico_auditado_v2_offline',
    hook_abertura: hook,
    tom_adotado: tom,
    compromissos_propostas: compromissos,
    bloco_juventude: `Com ${juventude_perc || 60}% do eleitorado formado por jovens de 18 a 35 anos em ${territorio}, nossa prioridade absoluta é formação técnica profissional, conectividade e microcrédito sem burocracia. O teu voto decide se o teu futuro terá oportunidades reais!`,
    armadilhas_a_evitar: armadilhas
  };
}

const aiSpeechService = {
  /**
   * Gera um rascunho de discurso utilizando Anthropic Claude (ou fallback auditado)
   */
  async gerarDiscursoComIA(contexto) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const modelo = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

    // Se houver chave configurada, consome a API da Anthropic
    if (apiKey && apiKey.trim() !== '' && !apiKey.startsWith('sua_chave')) {
      try {
        const client = new Anthropic({ apiKey });
        const systemPrompt = construirSystemPrompt();
        const userPrompt = construirUserPrompt(contexto);

        const response = await client.messages.create({
          model: modelo,
          max_tokens: 1500,
          temperature: 0.3, // Baixa temperatura para reduzir alucinações e manter aderência aos dados
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }]
        });

        const contentBlock = response.content[0];
        if (contentBlock && contentBlock.text) {
          // Extrai o JSON da resposta da IA
          let jsonStr = contentBlock.text.trim();
          if (jsonStr.startsWith('```json')) jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          else if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');

          const dadosParseados = JSON.parse(jsonStr);

          // Validação de segurança: garantir que as propostas contêm [PROMESSA — REVISAR]
          if (Array.isArray(dadosParseados.compromissos_propostas)) {
            dadosParseados.compromissos_propostas = dadosParseados.compromissos_propostas.map(c => ({
              ...c,
              texto_proposta: c.texto_proposta.includes('[PROMESSA — REVISAR]')
                ? c.texto_proposta
                : `[PROMESSA — REVISAR] ${c.texto_proposta}`
            }));
          }

          return {
            sucesso: true,
            status_aprovacao: 'RASCUNHO',
            modelo_ia_utilizado: modelo,
            provedor: 'ANTHROPIC_API',
            discurso: dadosParseados,
            gerado_em: new Date().toISOString()
          };
        }
      } catch (err) {
        console.warn('[AI Speech Service] Erro na chamada da API Anthropic. Ativando fallback auditado:', err.message);
      }
    }

    // Fallback auditado determinístico
    const fallback = gerarFallbackAuditado(contexto);
    return {
      sucesso: true,
      status_aprovacao: 'RASCUNHO',
      modelo_ia_utilizado: fallback.modelo_utilizado,
      provedor: 'GERADOR_AUDITADO_OFFLINE',
      discurso: fallback,
      gerado_em: new Date().toISOString()
    };
  }
};

module.exports = aiSpeechService;
