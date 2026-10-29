# Arcabouço de produto — GPS Eleitoral Angola 2027

Modelo de operação da sala de comando para campanhas (não o laboratório de engenharia).

## Superfícies

| Superfície | Quem usa | Precisa de sessão |
|---|---|---|
| Consulta CNE | Qualquer visitante / reunião comercial | Não. Cartografia e resultados CNE, mais cenários matemáticos claramente identificados. |
| Sala de comando | Coordenação da campanha | Sim. JWT + SKU + `campanha_id`. |
| App de campo | Brigadista / delegado | Sim. Mesa ou município atribuídos. |
| Canal eleitor | Público via WhatsApp | Não. Sem caderno, telefone só hash. |

## Cabeçalho de produção

- Marca: GPS Eleitoral · Angola 2027
- Estado: campanha, SKU, e-mail, perfil
- Sem interruptor Desktop/Mobile/Auto (isso é laboratório: `?lab=1`)
- Entrar / Sair visíveis

## Briefing do dia (Dashboard)

Três perguntas, nesta ordem:

1. Onde ir hoje? (top 5 pelo score de prioridade)
2. Onde está a cadeira? (círculos em disputa)
3. O que levar para o Excel da manhã? (exportação CSV)

O mapa e a série 2012–2022 ficam abaixo desta faixa.

## Corrida presidencial

A aplicação não contém sondagens presidenciais. A vista Presidencial mostra três cenários nacionais: resultado oficial CNE mais recente, extrapolação linear da quota MPLA/UNITA em 2012–2022 e continuação linear da última variação entre eleições. As simulações mantêm constante a quota conjunta das outras forças observada na eleição-base. São extrapolações ilustrativas, sem intervalo de confiança, e não modelam participação, candidaturas ou coligações futuras; não devem ser apresentadas como sondagem ou previsão oficial.

## Redes e mídia

A leitura diária é a mesma para qualquer lista: manchetes de imprensa pública publicadas nas últimas 24 horas, com proveniência estimada e horário de publicação. O cache é renovado ao acessar após 24 horas e também pode ser atualizado manualmente. A pauta do dia é um rascunho por público. Esta versão não monitora posts, alcance ou sentimento em redes sociais, nem lê contas ou grupos privados; não é sondagem. Nomear o cliente ou o adversário acontece só neste browser e não altera o mapa nem as cadeiras.

## Discursos e canal do eleitor

Discursos exigem sessão autorizada e base de dados: a geração grava rascunhos na campanha, permite consultar histórico e regista revisão/aprovação com responsável. O contexto usa carências agregadas das visitas no município e a classificação territorial; sem visitas, o sistema informa a ausência. O modelo utilizado (Anthropic ou fallback heurístico) é apresentado; nenhum texto é publicação automática.

O painel Eleitor exige sessão da campanha e consulta contagens agregadas de queixas no âmbito dessa campanha. O simulador de mensagens existe apenas em desenvolvimento local, não no deploy público. A recepção pelo webhook depende da configuração Meta; a resposta automática de saída pela Cloud API ainda não está implementada. Sem credenciais e validação, não anunciar número ou atendimento oficial.

## Estado

- `consulta` — dados CNE/INE, sem atas nem discursos
- `autenticado` — Discursos, Dia D e queixas da campanha
- `laboratorio` — viewport forçado e credenciais de teste

## Planos e pedidos comerciais

Os cartões de planos devem refletir o catálogo servido por `/api/planos`; limites e funcionalidades não são definidos independentemente no frontend. Os preços são valores de referência por ciclo eleitoral e só uma proposta confirmada define o âmbito contratado.

No deploy Render gratuito, a área de planos está identificada como demonstração. O pedido de proposta gera um protocolo em memória na API, não envia e-mail e não oferece retenção após reinícios; não utilizar dados de contacto reais neste ambiente. Para uso comercial, falta integrar armazenamento persistente/CRM, canal de notificação e processo de atendimento.
