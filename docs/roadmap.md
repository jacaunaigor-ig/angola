# Roadmap

## Entregue

| Fase | Entrega |
| --- | --- |
| 1. Motor político | Hondt por círculo, votos para virar a cadeira, simulador com choques, custo logístico no score, série nacional 2012–2022 |
| 2. Mobile endurecido | Configuração EAS para APK, assinatura Ed25519 de atas, storage desacoplado com tickets assinados |
| 3. Canal do eleitor | Webhook WhatsApp, mesas de exemplo, queixas agregadas, telefones mascarados |
| 4. Camada visual | Sala de comando em React com barra lateral, selos de proveniência, cartografia da pasta geo_angola |
| 5. Cadeia probatória | Migration 08: colunas Ed25519 nas atas; fotografia real + PUT ao ticket de evidência |
| 6. Persistência do canal | Migration 09: `queixas_eleitor` com RLS e retenção de 90 dias |
| 7. Sala em tempo real | SSE `GET /api/dia-d/stream` e hemiciclo SVG dos 220 assentos (maioria 111) |
| 8. Homologação | `LICENSE`, `ATTRIBUTION.md` (geoBoundaries CC BY 4.0 / OSM ODbL), perfil EAS APK armeabi-v7a + arm64-v8a |

## Lacunas conhecidas

1. **Votos por município e por bairro.** A sala mostra 158 municípios, 558 comunas (geoBoundaries) e 428 bairros OSM. A CNE de 2022 não publicou este nível. A margem no painel é a do círculo provincial.
2. **Resposta ao eleitor não sai para a Meta.** O webhook devolve o texto, mas o envio pela Cloud API depende de `WHATSAPP_ACCESS_TOKEN` e de um cliente de saída.
3. **Painéis executivos do protótipo.** `prototipo/pages/1_Paineis_Executivos.py` ainda usa dados simulados; a sala operacional é `web/`.
4. **APK.** O perfil `preview` está definido. O build na nuvem Expo exige conta e `eas login`; o `projectId` actual em `mobile/app.json` é um marcador, não uma conta Expo.
5. **DPA 2024.** A malha municipal aberta tem 158 unidades, não os 325 municípios da lei nova. Não foram desenhados polígonos em falta.
6. **Pedidos comerciais.** O protocolo de proposta é volátil, sem notificação e sem fila de atendimento. Antes de recolher contactos reais, integrar persistência/CRM, acesso administrativo, prazo de retenção e confirmação de consentimento.
7. **Canal do eleitor.** O webhook de entrada grava relatos, mas o envio de respostas pela WhatsApp Cloud API ainda não existe. Antes de anunciar atendimento público, implementar envio idempotente, templates aprovados, tratamento de falhas e fluxo de encaminhamento humano.

## Ordem sugerida

1. Alargar a pesquisa de manchetes, hoje concentrada em MPLA, UNITA, Lourenço e congresso.
2. Guardar o registo de peças na campanha e exportá-lo em CSV; separar métricas de audiência por fonte e data.
3. Implementar o cliente de saída WhatsApp com modelos aprovados.
4. Integrar microdados municipais apenas quando publicados pela CNE; não inventar resultados.
5. Configurar a conta EAS, substituir `extra.eas.projectId` pelo UUID real e gerar um APK `preview` assinado.

## Em curso: redes e mídia

A leitura diária conta palavras em manchetes públicas das últimas 24 horas. Não é monitorização direta de redes sociais nem sondagem, e não entra no Hondt nem no score.

Entregue nesta etapa:

- Pauta do dia: o tema com mais manchetes sugere uma frase por público (jovem urbano, bairro, interior), com selo `RASCUNHO`.
- Cache renovada ao acessar após 24 horas, botão de actualização manual e hora de publicação visível nas manchetes.
- A manchete diz se nomeia o cliente ou o adversário escolhidos neste browser. O feed no servidor continua igual para qualquer partido.
- Uma manchete passa ao registo local sem ser reescrita. A leitura a favor ou contra fica por decidir.
- O classificador deixa de tratar «profundo» como fundo e deixa de marcar quase tudo como pacto por causa da palavra «candidato».

A seguir, por esta ordem:

1. Alargar a pesquisa de manchetes. Hoje o feed privilegia MPLA, UNITA, Lourenço e congresso.
2. Guardar o registo de peças na campanha. Hoje fica só neste browser.
3. Exportar o registo da semana em CSV.
4. Separar os números de audiência por fonte e data. Hoje estão num parágrafo único.

## Em curso: grão territorial e sync de visitas

Município, comuna e bairro não herdam a acta provincial de 2022. A DPA 2024 só mantém votos OFICIAL nas províncias inalteradas. A sync FastAPI confirma lote idempotente, GPS a ~110 m e resposta sem nome, BI ou telefone.
