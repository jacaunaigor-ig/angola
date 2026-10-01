# Relatório de Auditoria Técnica e Diagnóstico de Maturidade
## Plataforma: GPS de Marketing Político — Angola 2027
**Data da Auditoria:** 01 de Outubro de 2026  
**Branch de Trabalho:** `feat/plataforma-v2`  
**Escopo:** Auditoria completa do código-fonte, bases de dados, segurança, integridade dos dados e alinhamento com a documentação.

---

## 1. Resultados da Execução Inicial do Ambiente

| Teste / Comando | Resultado | Diagnóstico Técnico |
|---|---|---|
| `node tests/test_fluxo_completo.js` | **20/20 PASSOU (100%)** | A suíte de testes de integração correu com sucesso. Os testes utilizam coleções simuladas em memória para o PostgreSQL/PostGIS e validam os cálculos geodésicos (Haversine WGS 84), parsing do GeoJSON e lógica de idempotência. |
| `docker compose up` | **FALHOU (Binário Ausente)** | O comando `docker` não está instalado/reconhecido no PATH do sistema operacional host (`ObjectNotFound: CommandNotFoundException`). Os arquivos `Dockerfile` e `docker-compose.yml` estão sintaticamente definidos, mas a execução em contêineres depende da instalação do Docker Desktop/Engine no ambiente host. |

---

## 2. Mapa de Funcionalidades: Implementado vs. Documentado

Classificação de maturidade para cada componente e recurso anunciado:
- **IMPLEMENTADA:** Código existe, possui lógica real e executa conforme esperado.
- **PARCIAL:** Existe interface ou estrutura preliminar, mas com dependências estáticas, sem persistência real ou faltando integração.
- **SÓ NA DOCUMENTAÇÃO:** Mencionada no README ou nos comentários, mas ausente no código-fonte.

| Módulo / Funcionalidade | Status | Detalhe da Implementação Real |
|---|---|---|
| **Base de Dados Espacial (PostGIS SRID 4326)** | **IMPLEMENTADA** | Esquema SQL completo em `database/01_schema_postgis.sql` com tabelas `locais_voto`, `ativistas`, `visitas_terreno`, `atas_apuramento` e tipo nativo `GEOGRAPHY(Point, 4326)`. Índices espaciais GiST e GIN definidos. |
| **Migrations Versionadas** | **SÓ NA DOCUMENTAÇÃO** | Apenas scripts SQL soltos (`01_`, `02_`, `03_`). Não há motor de migração versionada (como `node-pg-migrate`, `knex` ou `flyway`) para evolução incremental e reversível de schema. |
| **Trigger de Geofencing Anti-Fraude** | **IMPLEMENTADA** | Função PL/pgSQL `trg_auditar_distancia_ata` em `01_schema_postgis.sql` calculando `ST_Distance` e sinalizando `SUSPEITA` se > 300m. Endpoint de submissão grava e expõe o status. |
| **API RESTful (Node.js/Express) - Conexão PG** | **IMPLEMENTADA** | `backend/src/config/db.js` com pool `pg`. Suporte a queries diretas e transações via `getClient()`. |
| **Rota de Sincronização Tardia (`/api/sincronizar-visitas`)** | **IMPLEMENTADA** | `visitasController.js` executa transação `BEGIN / COMMIT / ROLLBACK` atômica com `ON CONFLICT (id) DO NOTHING`. |
| **Rota de Proximidade Espacial (`/api/locais-proximos`)** | **IMPLEMENTADA** | `locaisVotoController.js` executa `ST_DWithin` com suporte a saída GeoJSON. |
| **Resumo Tático de Município (`/api/municipios/:id/resumo`)** | **IMPLEMENTADA** | `dashboardController.js` agrega contagem de assembleias, sentimentos e ranking de dores com `UNNEST`. |
| **Gerador de Discursos Territorializados com IA** | **PARCIAL** | Rota `/api/discurso-territorializado/:municipio` implementada em `discursosController.js`, mas utiliza um dicionário estático de regras heurísticas (`BANCO_PROPOSTAS`). **Não há integração com API de IA (Anthropic/Claude)** nem fluxo de revisão e aprovação humana de rascunhos. |
| **Apuramento Paralelo do Dia D (`/api/dia-d/apuramento-paralelo`)** | **IMPLEMENTADA** | `warRoomController.js` consolida votos por partido, total de votantes e lista atas com anomalia de geofencing. |
| **Autenticação, Sessões e Perfis de Acesso (RBAC)** | **SÓ NA DOCUMENTAÇÃO** | Não há tabela de utilizadores, nem hashing de senhas (bcrypt), nem emissão de JWT, nem verificação de papéis (Admin, Analista, Coordenador, Brigadista). Todos os endpoints estão 100% públicos. |
| **Multi-tenancy e Isolamento de Dados (RLS)** | **PARCIAL** | O campo `campanha_id` existe nas tabelas e em alguns filtros da API, mas **não há Row Level Security (RLS)** ativa no PostgreSQL. Qualquer cliente pode ler ou alterar dados de qualquer campanha se omitir o filtro. |
| **App Mobile Offline-First (React Native / Expo)** | **PARCIAL** | Componentes React Native estruturados em `mobile/src/screens/` com AsyncStorage. No entanto, não há suíte de testes automatizados mobile configurada nem build nativa validada. A demonstração funcional atual corre via `mobile/preview.html`. |
| **Painel War Room Streamlit (`app.py`)** | **PARCIAL** | A interface visual foi construída em Dark Mode com Folium, mas opera de forma **totalmente desconectada da API Node.js**. Utiliza um dicionário embutido em memória com números fixos e gera métricas puramente estáticas. |
| **Cartografia Coroplética Oficial** | **PARCIAL** | O projeto possui pontos (`Point`) para assembleias e centroides de municípios, mas não possui malha vetorial de polígonos municipais/comunais integrada ao mapa do Streamlit. |

---

## 3. Origem e Proveniência dos Conjuntos de Dados

Conforme o princípio de **Honestidade dos Dados**, foi auditada cada fonte de dados presente no repositório.

| Conjunto de Dados / Arquivo | Fonte Declarada | Método de Coleta | Classificação Real | Rótulos Indevidos a Corrigir |
|---|---|---|---|---|
| `angola_populacional/populated_places.geojson` | OpenStreetMap via HDX (Humanitarian Data Exchange / HOT) | Extração geoespacial de polígonos e pontos de aglomerados residenciais. | **OFICIAL / COLABORATIVO** (Open Data OSM) | Rótulo legítimo. Pouco utilizado na interface principal até o momento. |
| `database/02_seed_angola_data.sql` | Assembleias de Luanda, Huambo e Benguela | Inserção SQL manual de 6 locais de voto com coordenadas aproximadas. | **SIMULADO / ESTIMADO** | Contém códigos de assembleia como `CNE-LUA-TAL-001` que **não são comprovadamente da CNE**; são convenções criadas para teste. |
| `database/03_seed_municipios_angola.sql` | Matriz gerada por `scripts/integrar_cartografia.js` | Dicionário estático com 18 assembleias em 9 municípios. | **SIMULADO / ESTIMADO** | As contagens de eleitores e mesas foram geradas por estimativa proporcional arbitrária e não refletem o caderno eleitoral real da CNE de 2022. |
| `app.py` (`carregar_dados_demograficos_oficiais()`) | O código declara: `"Base de Dados Demográficos e Eleitorais Oficiais (Estimativas INE / CNE Angola)"` | Dicionário Python hardcoded de 14 municípios com populações redondas (ex: 2.500.000, 1.900.000, 450.000). | **SIMULADO / ESTIMATIVA NÃO AUDITADA** | ⚠️ **GRAVE:** O rótulo *"Oficiais"* é falso e enganoso. Trata-se de dados mockados sem referência a cadernos eleitorais ou folhas do censo oficial. |
| `app.py` (Zonamento Político: Bastião, Campo de Batalha, Oposição) | Classificação textual digitada no código | Rótulo fixo (ex: `"Cinturão Urbano de Oposição"`, `"Reduto Tradicional"`). | **SIMULADO / SUBJETIVO** | Classificações políticas atribuídas manualmente sem fórmula de cálculo transparente ou vinculação com apurações passadas. |
| `app.py` (Aba 3 - Brigadas de Campo) | Visitas e sentimentos | Dicionários fixos com `42.850` visitas, `54.2%` aceitação, etc. | **100% SIMULADO** | Não há conexão com o banco de dados nem com a API. |
| `app.py` (Aba 4 - Dia D) | Afluência e Apuramento de Atas | Dicionários fixos com `3.412` atas, `1.482.350` votantes e 3 atas suspeitas. | **100% SIMULADO** | Valores totalmente estáticos embutidos no script Python. |
| `app.py` (Linha 158) | Badge HTML: `"SISTEMA ONLINE (POSTGIS CONECTADO)"` | String estática renderizada no layout | **FALSO / ENGANOSO** | O badge é exibido mesmo quando o PostgreSQL e a API estão totalmente desligados. |

---

## 4. Pontos do `app.py` com Dados Hardcoded que Devem Consumir a API

Para que a Sala de Guerra (War Room) funcione como um produto real e auditável, os seguintes trechos de `app.py` devem ser refatorados para consumir os endpoints da API:

1. **Cabeçalho de Status e Conexão (Linha 158):**
   - Substituir o badge estático por chamada a `GET /api/health`. Se a API estiver offline, exibir badge vermelho `OFFLINE / DESCONECTADO`.
2. **Dados Territoriais e Demografia (Linhas 20-70):**
   - Eliminar a função `carregar_dados_demograficos_oficiais()` estática.
   - Consumir da API a lista de municípios e suas métricas consolidadas.
3. **Métricas do Topo (Linhas 165-174):**
   - "Eleitores no Alvo", "População", "Juventude Média" e "Abstenção" devem ser agregadas dinamicamente via `GET /api/war-room/resumo-nacional`.
4. **Aba 1 - Marcadores de Assembleias e Zonamento (Linhas 190-230):**
   - Consumir `GET /api/locais-proximos` ou endpoint territorial com coordenadas reais e classificação calculada por regra matemática.
5. **Aba 2 - Gerador de Discursos (Linhas 235-310):**
   - Substituir a lógica estática de `if/else` por requisição direta a `GET /api/discurso-territorializado/:municipio`.
6. **Aba 3 - Painel de Brigadas e Dores (Linhas 315-345):**
   - Métricas de visitas (total, aceitação, indecisos, rejeição) e gráficos de dores devem consumir `GET /api/war-room/resumo-nacional` e `GET /api/visitas`.
7. **Aba 4 - Apuramento Paralelo e Geofencing do Dia D (Linhas 350-410):**
   - Totais de atas recebidas, votantes, contagem de votos e a lista de alertas de geofencing devem consumir em tempo real `GET /api/dia-d/apuramento-paralelo`.

---

## 5. Avaliação de Riscos de Segurança

| Categoria | Nível de Risco | Vulnerabilidade Identificada | Impacto |
|---|---|---|---|
| **Autenticação & Autorização** | **CRÍTICO** | Inexistência de qualquer camada de autenticação (JWT, API Key, sessão). Endpoints de inserção de visitas e atas abertos para qualquer cliente na internet. | Injeção de dados falsos em massa, desfiguração do mapa eleitoral e espionagem de inteligência tática de campanha por adversários. |
| **Isolamento de Dados (Multi-tenancy)** | **ALTO** | Ausência de Row-Level Security (RLS) no PostgreSQL. A tabela `campanhas` existe, mas não há enforcement no banco nem validação de token do usuário. | Um cliente partidário B2B pode acessar ou adulterar os dados táticos de outro cliente na mesma instância. |
| **Injeção de HTML / XSS no Streamlit** | **ALTO** | O `app.py` utiliza `unsafe_allow_html=True` em múltiplos componentes interpolando variáveis de texto sem sanitização (ex: nomes de municípios, rótulos, trechos de discursos e dados de atas). | Execução de scripts maliciosos no navegador do operador caso dados manipulados sejam injetados via API. |
| **CORS Irrestrito** | **MÉDIO** | `backend/src/server.js` define `app.use(cors())` sem lista branca de domínios permitidos (`origin: "*"`). | Qualquer site de terceiros aberto no navegador de um operador pode fazer requisições contra a API local/remota. |
| **Rate Limiting & Negação de Serviço (DoS)** | **MÉDIO** | O Express não possui middleware de limitação de taxa (`express-rate-limit`). O body parser aceita payloads de até `5mb` em `express.json({ limit: '5mb' })`. | Ataques de força bruta ou estouro de requisições de 5MB podem travar o servidor Node.js por exaustão de memória. |
| **Credenciais no Repositório** | **MÉDIO** | Senhas padrão em texto claro em `docker-compose.yml` (`postgres2027secure`), `backend/.env.example` (`postgres:postgres`) e fallbacks em `db.js`. | Comprometimento imediato da base se o docker-compose for levantado em servidor público sem alteração manual do `.env`. |
| **SQL Injection** | **BAIXO** | As consultas principais utilizam queries parametrizadas (`$1, $2`). Porém, a concatenação de filtros em `dashboardController.js` e `locaisVotoController.js` utiliza concatenação manual de strings SQL (`AND vt.campanha_id = $2`), o que aumenta a suscetibilidade a erros em futuras alterações. | Risco potencial de quebra de sintaxe ou vazamento se novos filtros forem introduzidos sem parametrização rígida. |

---

## 6. Mapeamento de Dados Pessoais e Privacidade

Em conformidade com a legislação de proteção de dados e com os princípios da plataforma (minimização e agregação territorial):

| Tabela / Estrutura | Campos com Dados Pessoais / Identificadores | Risco de Privacidade / Reidentificação | Ação Corretiva Obrigatória |
|---|---|---|---|
| `ativistas` | `nome`, `telefone`, `device_id` | Identificadores diretos do cidadão ativista/brigadista. Vinculação direta de telefone pessoal com filiação ou preferência partidária. | Pseudoanonimizar no banco: armazenar hash irreversível do telefone para unicidade; expor na API apenas matrícula/código anônimo (`BRIGADA-04`, `ATIVISTA-A19`). |
| `visitas_terreno` | `localizacao` (ponto GPS com precisão métrica) + `observacoes` textuais + `faixa_etaria` | **ALTO RISCO DE REIDENTIFICAÇÃO:** Uma coordenada GPS exata na porta de uma residência combinada com observações livres (ex: *"Dona Maria viúva com filho técnico..."*) permite identificar perfeitamente a convicção política de um cidadão individual sem consentimento. | 1. **Agregação Geográfica:** Arredondar coordenadas GPS para nível de quarteirão/setor censitário ou centroide da rua (redução de precisão proposital para ~100m).<br>2. **Minimização de Notas:** Remover ou estruturar observações para eliminar nomes e referências familiares.<br>3. **Consentimento:** Exibir termo formal de política de retenção no app. |
| `visitas_terreno` | `metadados_aparelho` (`JSONB`) | Pode conter IMEI, modelo exato, nível de bateria e IP que facilitam fingerprinting do aparelho do brigadista. | Restringir aos metadados estritamente técnicos de versão do app (`app_version`). |
| `atas_apuramento` | `delegado_id`, `localizacao_envio`, `foto_ata_url` | A foto da ata contém assinaturas manuscritas de delegados de mesa da CNE e cidadãos mesários. | Tratar imagem com canal restrito e criptografado; acesso exclusivo para o módulo de auditoria jurídica da campanha. |
| Logs do Backend | Payloads de requisição de sincronização | Logs de erro podem imprimir arrays de visitas contendo notas de campo no console/arquivos de log. | Mascarar payloads e dados sensíveis antes de emitir logs estruturados. |

---

## 7. Proposta de Ordem de Execução das Etapas

Para evoluir a plataforma para um produto profissional, vendável, auditável e defensável perante clientes B2B, propõe-se o seguinte sequenciamento iterativo em commits pequenos:

```
[Passo 0: Auditoria Concluída] (Atual)
         │
         ▼
[Etapa 1: Dados Territoriais Confiáveis e Migrations]
├── Migrations versionadas (node-pg-migrate) substituindo scripts soltos
├── Estrutura de versionamento da malha político-administrativa de Angola
├── Pipeline ETL em scripts/ para ingestão de dados oficiais em data/raw/ com relatório de qualidade
└── Regra transparente e configurável de Zonamento (fórmula matemática auditável)
         │
         ▼
[Etapa 2: Ligação Real API ↔ War Room (Streamlit)]
├── Refatoração completa de app.py para consumir 100% da API RESTful
├── Mapa coroplético por unidade territorial com camadas temáticas
├── Exportação de relatórios (XLSX, CSV) e mapas em alta resolução (PNG)
├── Simulador de metas eleitorais com intervalos de confiança e incerteza
└── Tratamento rigoroso de estados (Carregando, Vazio, Erro de Conexão)
         │
         ▼
[Etapa 3: Inteligência Artificial (Anthropic) e Governança de Discursos]
├── Integração da API da Anthropic (Claude) em discursosController
├── Prompt auditado: restrição exclusiva aos dados da base e marcação [PROMESSA — REVISAR]
├── Fluxo formal de aprovação: Rascunho ➔ Em Revisão ➔ Aprovado (com trilha de auditoria)
└── Eliminação de qualquer geração de conteúdo difamatório ou não fundamentado
         │
         ▼
[Etapa 4: Robustez do App Mobile Offline-First e Privacidade]
├── Testes de estresse da fila offline: queda na conexão, reenvio, relógio adulterado
├── Detecção e flag para revisão humana de registros duplicados ou fora do território
├── Painel com cálculo de margem de erro por tamanho amostral (n amostral)
├── Implementação do Termo de Consentimento e Política de Retenção na interface móvel
└── Anonimização e perturbação de privacidade nas coordenadas das visitas
         │
         ▼
[Etapa 5: Dia D — Integridade, Cadeia de Custódia e Gestão de Incidentes]
├── Reformulação do Geofencing: Alerta para "Revisão Humana", sem acusação precipitada
├── Trilha de custódia append-only com hash SHA-256 e carimbo de tempo
├── Criação de casos jurídicos estruturados com anexos e atribuição de responsável
├── Relatório de cobertura e projeções com incerteza declarada
└── Elaboração de docs/legal.md com diretrizes da legislação eleitoral da CNE
         │
         ▼
[Etapa 6: Segurança, Governança, RBAC e Multi-Cliente]
├── Autenticação JWT com perfis (Admin, Analista, Coordenador, Brigadista, Leitor)
├── Row Level Security (RLS) no PostgreSQL por campanha_id
├── Rate limiting, validação de esquemas (Zod/Joi) e sanitização estrita de HTML
├── Higienização de segredos em variáveis de ambiente (.env)
└── Elaboração de docs/privacidade.md
         │
         ▼
[Etapa 7: Observabilidade, Testes Expandidos e Demonstração Vendável]
├── Expansão da suíte de testes unitários e de integração
├── Logs estruturados em JSON e monitoramento do endpoint /api/health
└── Ambiente de demonstração vendável com toggle "MODO DEMONSTRAÇÃO" destacado
```

---
*Fim do Relatório de Auditoria Técnica. Aguardando aprovação para prosseguir para a Etapa 1.*
