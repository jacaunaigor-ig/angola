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
3. **APK.** O perfil `preview` está definido. O build na nuvem Expo exige `eas login` e um `projectId` UUID — o valor actual em `mobile/app.json` é um marcador, não uma conta Expo.
4. **DPA 2024.** A malha municipal aberta tem 158 unidades, não os 325 municípios da lei nova. Não foram desenhados polígonos em falta.

## Ordem sugerida

1. Quando a CNE publicar microdados, cruzar votos municipais — não inventar números.
2. Cliente de saída WhatsApp com modelos aprovados.
3. `eas login` e substituir `extra.eas.projectId` por o UUID do projecto, depois `npx eas-cli build -p android --profile preview`.
