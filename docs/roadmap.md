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

Ordenadas por impacto.

1. **Resposta ao eleitor não sai para a Meta.** O webhook devolve o texto, mas o envio pela Cloud API depende de `WHATSAPP_ACCESS_TOKEN` e de um cliente de saída.
2. **Resultados municipais.** Só existem totais nacionais e círculos provinciais de 2022. Sem municípios, o score não distingue bairros.
3. **Painéis executivos.** `prototipo/pages/1_Paineis_Executivos.py` continua em Streamlit e com dados simulados. A sala operacional é `web/`.
4. **EAS cloud build.** O perfil `preview` gera APK; o build na nuvem Expo exige conta e `eas login`.

## Ordem sugerida

1. Cliente de saída WhatsApp com modelos aprovados.
2. Cruzamento municipal quando a CNE publicar microdados.
3. Build EAS `preview` assinado para distribuição interna em Android de entrada.

## Em curso: redes e mídia

A leitura semanal conta palavras em manchetes públicas. Não é sondagem e não entra no Hondt nem no score.

Entregue nesta etapa:

- Pauta da semana: o tema com mais manchetes sugere uma frase por público (jovem urbano, bairro, interior), com selo `RASCUNHO`.
- A manchete diz se nomeia o cliente ou o adversário escolhidos neste browser. O feed no servidor continua igual para qualquer partido.
- Uma manchete passa ao registo local sem ser reescrita. A leitura a favor ou contra fica por decidir.
- O classificador deixa de tratar «profundo» como fundo e deixa de marcar quase tudo como pacto por causa da palavra «candidato».

A seguir, por esta ordem:

1. Alargar a pesquisa de manchetes. Hoje o feed privilegia MPLA, UNITA, Lourenço e congresso.
2. Guardar o registo de peças na campanha. Hoje fica só neste browser.
3. Exportar o registo da semana em CSV.
4. Separar os números de audiência por fonte e data. Hoje estão num parágrafo único.
