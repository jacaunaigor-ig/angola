# Arcabouço de produto — GPS Eleitoral Angola 2027

Modelo de operação da sala de comando para campanhas (não o laboratório de engenharia).

## Superfícies

| Superfície | Quem usa | Precisa de sessão |
|---|---|---|
| Consulta CNE | Qualquer visitante / reunião comercial | Não. Só cartografia e Hondt oficiais. |
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

## Redes e mídia

A leitura diária é a mesma para qualquer lista: manchetes de imprensa pública publicadas nas últimas 24 horas, com proveniência estimada e horário de publicação. O cache é renovado ao acessar após 24 horas e também pode ser atualizado manualmente. A pauta do dia é um rascunho por público. Esta versão não monitora posts, alcance ou sentimento em redes sociais, nem lê contas ou grupos privados; não é sondagem. Nomear o cliente ou o adversário acontece só neste browser e não altera o mapa nem as cadeiras.

## Estado

- `consulta` — dados CNE/INE, sem atas nem discursos
- `autenticado` — Discursos, Dia D e queixas da campanha
- `laboratorio` — viewport forçado e credenciais de teste
