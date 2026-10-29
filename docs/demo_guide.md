# Guia de demonstração comercial

## Posicionamento

Apresente o GPS Eleitoral como uma plataforma de consulta territorial e apoio operacional em desenvolvimento. Separe claramente dados oficiais, estimativas e cenários. A demonstração pública permite explorar cartografia e resultados históricos sem login; não é uma instância apta a guardar dados reais de uma campanha.

Não afirme que a plataforma é a única do mercado, que produz sondagens, que monitora contas privadas/redes sociais, que envia mensagens pelo WhatsApp, que garante resultados eleitorais ou que tem certificação jurídica. Não prometa disponibilidade, suporte, SLA ou integração que não esteja formalmente contratada.

## Roteiro de 10 minutos

1. **Entrada pública:** mostre os indicadores históricos, as fontes CNE/INE e o botão de demonstração sem login. Explique que os indicadores são do acervo disponível, não métricas em tempo real.
2. **Mapa e dados:** compare a malha DPA 2016 (18 províncias) com a DPA 2024 (21). Deixe claro que os resultados oficiais completos por província disponíveis no produto são de 2022; não há resultados municipais completos de 2012, 2017 e 2022.
3. **Projeção presidencial:** mostre a vista `#presidencial`. Os resultados da CNE são eleições gerais por lista; os cenários são extrapolações exploratórias, não sondagens, previsão oficial nem modelo de candidatos.
4. **Redes e mídia:** demonstre a leitura diária de manchetes públicas. Não a descreva como monitoramento de posts, análise de alcance, sentimento de redes sociais ou pesquisa de opinião.
5. **Planos:** mostre as capacidades e limites carregados do catálogo da API. O preço é referência por ciclo eleitoral; território, condições, impostos, suporte e entregáveis precisam constar da proposta formal.
6. **Próximos passos:** recolha requisitos não sensíveis e proponha uma validação técnica antes de qualquer piloto. Não recolha dados de eleitores nesta demonstração.

## Limitações que devem ser comunicadas

- O Render gratuito serve apenas para demonstração: serviços podem dormir, a base de dados gratuita tem prazo de expiração e os ficheiros locais não são persistentes.
- O formulário de proposta gera um protocolo em memória. Não envia e-mail, não garante retenção depois de reinícios e não é um CRM. Use apenas dados de teste até existir armazenamento persistente, canal de notificação e processo de atendimento.
- O simulador móvel é uma pré-visualização; a publicação de um APK/IPA e a configuração de uma conta EAS continuam pendentes.
- O canal WhatsApp não envia respostas pela Cloud API sem credenciais e integração de saída configuradas.
- O modelo de acesso e a proteção por campanha precisam de ser validados num ambiente de produção dedicado antes de inserir dados reais.
- As projeções eleitorais não incorporam pesquisas ou dados individuais. Não use cenários simulados como evidência de intenção de voto.

## Checklist antes da reunião

- Abrir a URL pública e confirmar que a API está disponível.
- Verificar que o mapa e as fontes carregam e que os selos de proveniência estão visíveis.
- Confirmar que `Planos` apresenta os limites retornados por `/api/planos`.
- Não usar contas, palavras-passe, contactos ou dados de eleitores reais numa demonstração pública.
- Se a reunião exigir Dia D, acesso autenticado ou operação móvel, preparar e testar um ambiente separado; não improvisar esses fluxos no deploy gratuito.

## Critério para iniciar um piloto comercial

Antes do piloto, acordar por escrito o âmbito, os dados permitidos, o responsável pelo tratamento, os utilizadores, a retenção, o suporte, o preço e as condições de saída. Configurar armazenamento persistente, backups, monitorização, notificações e credenciais próprias do cliente; testar isolamento entre campanhas e recuperar um backup. Não tratar a demonstração gratuita como ambiente de produção.
