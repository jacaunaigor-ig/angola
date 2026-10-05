# Roadmap

## Entregue

| Fase | Entrega |
| --- | --- |
| 1. Motor político | Hondt por círculo, votos para virar a cadeira, simulador com choques, custo logístico no score, série nacional 2012–2022 |
| 2. Mobile endurecido | Configuração EAS para APK, assinatura Ed25519 de atas, storage desacoplado com tickets assinados |
| 3. Canal do eleitor | Webhook WhatsApp, mesas de exemplo, queixas agregadas, telefones mascarados |
| 4. Camada visual | Sala de comando em React com barra lateral, selos de proveniência, cartografia da pasta geo_angola |

## Lacunas conhecidas

Ordenadas por impacto.

1. **Postgres não persiste a assinatura Ed25519.** A API verifica-a, mas as colunas de assinatura e chave pública ainda não existem em `atas_apuramento`. Falta uma migration `08`.
2. **Queixas do WhatsApp vivem em memória.** Reiniciar a API apaga a fila. Precisa de tabela com RLS e retenção definida em `docs/privacidade.md`.
3. **Resposta ao eleitor não sai para a Meta.** O webhook devolve o texto, mas o envio pela Cloud API depende de `WHATSAPP_ACCESS_TOKEN` e de um cliente de saída.
4. **Resultados municipais.** Só existem totais nacionais e círculos provinciais de 2022. Sem municípios, o score não distingue bairros.
5. **Apuramento em tempo real.** A sala de comando ainda faz leitura sob pedido. Falta SSE ou WebSocket e o gráfico de assentos da Assembleia (220 lugares).
6. **Fotografia da ata no mobile.** O ecrã assina e transmite a ata, mas ainda simula a captura e não faz o `PUT` ao ticket de evidência.
7. **Painéis executivos.** `pages/1_Paineis_Executivos.py` continua em Streamlit e com dados simulados.
8. **Licença.** O repositório não declara licença.

## Ordem sugerida

1. Migration `08` com assinatura e chave pública; teste de integração com PostGIS.
2. Tabela de queixas com RLS e job de retenção.
3. Captura real da ata e envio ao ticket de evidência.
4. SSE para apuramento e gráfico de assentos.
5. Cliente de saída WhatsApp com modelos aprovados.
