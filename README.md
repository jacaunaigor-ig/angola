# 🇦🇴 GPS de Marketing Político — Angola 2027 (Plataforma v2)

> **Plataforma B2B Demonstrável e Vendável de Inteligência Territorial, Micro-Targeting Eleitoral, Operações Mobile Offline-First, IA com Governança Humana e Apuramento Paralelo do Dia D.**

[![CI - Testes e Qualidade](https://github.com/jacaunaigor-ig/angola/actions/workflows/ci.yml/badge.svg)](https://github.com/jacaunaigor-ig/angola/actions)
![Status dos Testes](https://img.shields.io/badge/Testes-61%2F61%20Passaram-10B981)
![PostGIS](https://img.shields.io/badge/PostGIS-SRID%204326-38BDF8)
![Segurança](https://img.shields.io/badge/Segurança-JWT%20%7C%20RBAC%20%7C%20RLS-818CF8)

---

## 🏛️ Princípios Inegociáveis da Plataforma

1. **Honestidade dos Dados:** Cada número e mapa possui etiquetação de proveniência (`OFICIAL`, `ESTIMADO`, `SIMULADO`). Quando o banco está desconectado, o sistema assume explicitamente o selo **`MODO DEMONSTRAÇÃO (DADOS AUDITADOS)`**.
2. **Agregação e Privacidade:** Operamos sob a Lei n.º 22/11 de Angola. As visitas de campo sofrem perturbação proposital de coordenadas (~110m) e não gravam nomes, números de BI ou preferências individuais.
3. **IA Apoia, Humano Decide:** Discursos gerados com Anthropic Claude são rotulados obrigatoriamente como **`RASCUNHO`** e toda proposta recebe a chancela obrigatória **`[PROMESSA — REVISAR]`**, exigindo aprovação expressa do comitê de campanha.
4. **Neutralidade Técnica:** Rótulos da campanha ("Nosso Partido", "Oposição Consolidada"), cores e limiares de margem são 100% configuráveis.
5. **Transparência Matemática:** O zonamento político é calculado por fórmula auditável e visível ($\text{Margem} = \% \text{Partido} - \% \text{Oponente}$), eliminando classificações subjetivas digitadas à mão.

---

## 📦 Estrutura do Repositório

```text
projeto_angola/
├── .github/workflows/ci.yml             # Pipeline de CI (Lint + Testes + Compilação + Audit)
├── backend/                              # API RESTful em Node.js e Express
│   ├── migrations/                      # 6 Migrations versionadas (node-pg-migrate)
│   ├── src/
│   │   ├── config/db.js                 # Pool PostgreSQL resiliente
│   │   ├── controllers/
│   │   │   ├── visitasController.js     # Sincronização offline-first com controle de qualidade
│   │   │   ├── locaisVotoController.js  # Consultas espaciais PostGIS (ST_DWithin em metros)
│   │   │   ├── dashboardController.js   # Resumo tático com estatística amostral (n e margem)
│   │   │   ├── discursosController.js   # Discursos com IA (Anthropic) e fluxo de aprovação
│   │   │   ├── territorioController.js  # Malha versionada DPA 2016/2024 e De-Para
│   │   │   └── warRoomController.js     # War Room, apuramento Dia D e casos jurídicos
│   │   ├── middleware/
│   │   │   ├── auth.js                  # Autenticação JWT, perfis RBAC e Rate Limiting
│   │   │   ├── validator.js             # Validação estrita de esquemas e limites
│   │   │   └── errorHandler.js          # Tratamento centralizado de erros
│   │   ├── services/
│   │   │   ├── aiSpeechService.js       # Integração com Anthropic Claude (System Prompt auditado)
│   │   │   ├── zonamentoService.js      # Motor matemático transparente de zonamento
│   │   │   └── estatisticaService.js    # Cálculo formal de margem de erro com FPCF (n e e)
│   │   ├── utils/logger.js              # Logs estruturados em JSON com sanitização de segredos
│   │   └── server.js                    # Inicialização com rate limiter e observabilidade
│   └── tests/api_requests.http          # Coleção de testes REST
├── data/
│   ├── raw/                             # Dados brutos oficiais com proveniência auditada
│   │   ├── README.md                    # Dicionário de dados brutos
│   │   ├── malha_angola_dpa2016.geojson # Malha das 18 províncias históricas (Lei 18/16)
│   │   ├── malha_angola_dpa2024.geojson # Malha das 21 províncias da DPA 2024
│   │   ├── de_para_dpa_2016_2024.json   # Tabela de correspondência territorial
│   │   ├── populacao_projecoes_ine.json # Projeções oficiais do INE Angola (18+ e juventude)
│   │   └── resultados_eleitorais_cne_2022.json # Resultados oficiais CNE das Eleições 2022
│   └── relatorio_qualidade_carga.json   # Relatório emitido pelo ETL (100% SRID 4326)
├── database/                            # Scripts de migração e cargas SQL
│   ├── 01_schema_postgis.sql            # Esquema base e funções espaciais
│   ├── 02_seed_angola_data.sql          # Dados de teste Luanda, Huambo e Lobito
│   ├── 03_seed_municipios_angola.sql    # Matriz oficial CNE
│   └── 04_carga_territorial_oficial.sql # Carga gerada pelo ETL com DPA 2016/2024
├── docs/                                # Documentação Técnica e de Negócio
│   ├── auditoria.md                     # Relatório de auditoria técnica (Passo 0)
│   ├── legal.md                         # Marco legal eleitoral e conformidade com a CNE
│   ├── privacidade.md                   # Política de minimização, retenção e privacidade
│   └── demo_guide.md                    # Roteiro de demonstração comercial e vendas B2B
├── mobile/                              # Aplicação Móvel & Simulador
│   ├── App.js                           # App React Native / Expo
│   ├── preview.html                     # Simulador Mobile interativo
│   └── src/screens/                     # 3 Ecrãs: Mapa, Porta-a-Porta e Dia D
├── scripts/
│   ├── etl_territorial.js               # Pipeline ETL com auditoria de qualidade
│   └── integrar_cartografia.js          # Conversão cartográfica
├── app.py                               # War Room Executivo Web (Streamlit Dark Mode)
├── api_client.py                        # Cliente HTTP da API para o War Room
├── docker-compose.yml                   # Orquestração de microsserviços
├── render.yaml                          # Blueprint de deploy em nuvem
├── requirements.txt                     # Dependências Python
└── tests/test_fluxo_completo.js         # Suíte com 61 testes automatizados (100% OK)
```

---

## 🚀 Como Executar

### 1. Suíte de Testes Automatizada (61 Testes de Integração)
```bash
node tests/test_fluxo_completo.js
```

### 2. Executar o Pipeline ETL Territorial
```bash
node scripts/etl_territorial.js
```

### 3. Iniciar o Backend API (Node.js + Express)
```bash
cd backend
npm install
npm run migrate:up   # Aplica as 6 migrations versionadas
npm run dev          # Inicia servidor na porta 3001
```

### 4. Iniciar a Sala de Guerra (Streamlit Dark Mode)
```bash
pip install -r requirements.txt
streamlit run app.py
```
Acesse no navegador: [http://localhost:8501](http://localhost:8501)

### 5. Simulador Mobile Interativo
Abra com duplo clique no navegador: `mobile/preview.html`

---

## 📖 Documentação Adicional

- [Relatório de Auditoria Técnica](docs/auditoria.md)
- [Guia de Demonstração e Vendas B2B](docs/demo_guide.md)
- [Marco Jurídico e Legislação Eleitoral CNE](docs/legal.md)
- [Política de Privacidade e Retenção de Dados](docs/privacidade.md)
