# Arquitectura

## Visão geral

| Camada | Tecnologia | Responsabilidade |
| --- | --- | --- |
| Sala de comando | React 18, Vite, Leaflet | Decisão: território, Hondt, planos, discursos, Dia D, canal do eleitor |
| App móvel | Expo / React Native | Campo offline, Dia D, assinatura Ed25519 |
| API | FastAPI, psycopg 3 | Autenticação, RBAC, regras de negócio, contrato HTTP |
| Núcleo analítico | Python puro (`war_room/`) | Hondt, custo logístico, assinaturas, canal do eleitor, planos |
| Dados | PostgreSQL 16 + PostGIS, `data/raw/` | Operação por campanha (RLS) e dados de referência com proveniência |
| Evidências | Storage em ficheiros com tickets HMAC | Fotografias de atas, fora do PostgreSQL |

O núcleo analítico não importa nada de web nem de base de dados. Isso permite testá-lo sozinho e reutilizá-lo no Streamlit, na API e em scripts.

## Fluxos principais

**Zonamento.** `GET /api/territorio/unidades` cruza a malha DPA com os resultados CNE 2022 e as projecções INE, calcula a margem, o Hondt do círculo e o score integrado. O cliente pode reclassificar com outros limiares sem nova chamada.

**Dia D.** O delegado fotografa a ata, o aparelho calcula o SHA-256, monta a cadeia canónica `local|mesa|votos…|foto|data|lon|lat` e assina com Ed25519 (chave guardada no `SecureStore`). A API refaz a cadeia, verifica a assinatura (HTTP 400 se falhar) e só então grava. Sem rede, a ata fica assinada numa fila local e a interface diz que **não foi transmitida**.

**Evidências.** `POST /api/evidencias/presigned-upload` devolve um URL `PUT` com `expires` e `signature` (HMAC-SHA256 da chave de armazenamento, 15 min). O ficheiro é imutável: um segundo envio dá 409. A leitura exige sessão da mesma campanha. A interface é a de um bucket S3/R2, e trocar o armazenamento não muda os clientes.

**Canal do eleitor.** O webhook valida `X-Hub-Signature-256` quando `WHATSAPP_APP_SECRET` existe (obrigatório em produção). Responde com assembleias de exemplo e grava queixas em `queixas_eleitor` (RLS, retenção 90 dias). Telefones ficam mascarados (`***222`) e guardados como HMAC. Sem PostgreSQL, a fila fica em memória só para demonstração.

**Apuramento em tempo real.** `GET /api/dia-d/stream` envia Server-Sent Events à sala de comando sempre que uma ata da campanha autenticada é aceite. O nginx desliga o buffering nesse caminho.

## Segurança

- JWT com emissor, expiração e perfis `ADMIN`, `ANALISTA`, `COORDENADOR`, `BRIGADISTA`, `LEITOR`.
- Isolamento por campanha com Row-Level Security; cada transacção define `app.current_campanha_id`.
- Limite de pedidos por IP (`429` com `Retry-After`), CORS com origens explícitas (sem `*`), pedidos com `X-Request-ID`.
- Em produção: segredo JWT de desenvolvimento é recusado, simulador do canal desligado, queixas só para perfis de análise.
- Planos comerciais controlam funcionalidades (`402` quando o plano não inclui).

## Proveniência dos dados

| Selo | Significado | Exemplo |
| --- | --- | --- |
| `OFICIAL` | Publicado por CNE ou INE | Totais nacionais 2012, 2017 e 2022 |
| `ESTIMADO` | Projecção ou agregação documentada | População por província |
| `SIMULADO` | Demonstração ou cenário | Assembleias de exemplo, choques de Hondt |
| `PROVISORIO` | Apuramento parcial | Recortes provinciais de 2017 (97,82 % das mesas) |

Resultados por município e por mesa **não** estão no repositório e não são inventados.

## Decisões

1. **Uma API de produção.** É FastAPI (`backend/app`). A API Node está arquivada em `arquivo/api-node` e não entra no arranque.
2. **A API sobe sem base de dados.** Se o PostgreSQL falhar, as rotas de ficheiros (cartografia, Hondt, série) continuam e `/health/ready` devolve 503. Rotas de campanha respondem erro explícito.
3. **Imagem Docker com layout do repositório.** A API importa `war_room/` e lê `data/raw/`, por isso o contexto de build é a raiz (`docker build -f backend/Dockerfile .`).
4. **Ed25519 em vez de só SHA-256.** O hash prova integridade; a assinatura prova autoria.
5. **Sem caderno eleitoral.** Por privacidade e legalidade, nenhum canal devolve dados pessoais de terceiros.
