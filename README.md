# 🇦🇴 GPS de Marketing Político — Angola 2027 (Plataforma v2)

> **Plataforma B2B Demonstrável e Vendável de Inteligência Territorial, Micro-Targeting Eleitoral, Operações Mobile Offline-First, IA com Governança Humana e Apuramento Paralelo do Dia D.**

[![CI - Testes e Qualidade](https://github.com/jacaunaigor-ig/angola/actions/workflows/ci.yml/badge.svg)](https://github.com/jacaunaigor-ig/angola/actions)
![Status dos Testes](https://img.shields.io/badge/Testes-66%2F66%20Passaram-10B981)
![Planos](https://img.shields.io/badge/Planos-Municipal%20%7C%20Provincial%20%7C%20Nacional-F97316)
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
├── backend/                              # API RESTful em Python e FastAPI
│   ├── app/                             # Rotas, configurações, autenticação e observabilidade
│   ├── tests/                           # Contratos e integração real PostgreSQL/PostGIS
│   ├── requirements.txt                 # Dependências do backend
│   ├── boot.py                          # Valida PostGIS e inicia Uvicorn
│   └── create_user.py                   # Provisionamento seguro de contas da API
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
│   ├── 04_carga_territorial_oficial.sql # Carga gerada pelo ETL com DPA 2016/2024
│   ├── 05_migration_fastapi_evidence.sql # Persistência de evidências de campo
│   └── 06_migration_fastapi_users.sql   # Contas e associação a mobilizadores
├── docs/                                # Documentação Técnica e de Negócio
│   ├── auditoria.md                     # Relatório de auditoria técnica (Passo 0)
│   ├── legal.md                         # Marco legal eleitoral e conformidade com a CNE
│   ├── privacidade.md                   # Política de minimização, retenção e privacidade
│   └── demo_guide.md                    # Roteiro de demonstração comercial e vendas B2B
├── mobile/                              # Aplicação Móvel & Simulador
│   ├── App.js                           # App React Native / Expo
│   ├── index.js                         # Entrada Expo
│   ├── preview.html                    # Simulador Mobile interativo
│   └── src/screens/                     # 3 Ecrãs: Mapa, Porta-a-Porta e Dia D
├── pages/1_Paineis_Executivos.py        # Quatro painéis executivos Streamlit
├── scripts/
│   ├── etl_territorial.js               # Pipeline ETL com auditoria de qualidade
│   └── integrar_cartografia.js          # Conversão cartográfica
├── app.py                               # War Room Executivo Web (Streamlit Dark Mode)
├── api_client.py                        # Cliente HTTP da API para o War Room
├── docker-compose.yml                   # Orquestração de microsserviços
├── render.yaml                          # Blueprint de deploy em nuvem
├── requirements.txt                     # Dependências Python
└── tests/test_fluxo_completo.js         # Suíte de validação do fluxo funcional
```

---

## 🚀 Como Executar

### 1. Suíte de Testes Automatizada
```bash
node tests/test_fluxo_completo.js
```
Os testes FastAPI de integração necessitam de PostgreSQL/PostGIS real, configurado em `TEST_DATABASE_URL` para um banco isolado terminado em `_test`:
```bash
python -m pytest backend/tests -q
```

### 2. Executar o Pipeline ETL Territorial
```bash
node scripts/etl_territorial.js
```

### 3. Iniciar o Backend API (Python + FastAPI)
```bash
python -m pip install -r backend/requirements.txt
copy .env.example .env
python boot.py        # Valida ambiente e PostGIS, depois inicia a API na porta 8000
```
Em bases existentes, aplique as migrations SQL `05` e `06` antes de iniciar a API. Em novas bases, o Docker Compose executa os scripts SQL por ordem no primeiro arranque.
Para uma base nova fora do Compose, execute os scripts `01` a `06` de `database/` em ordem, usando `psql` com `ON_ERROR_STOP=1`, antes do primeiro deploy.

Crie uma conta ligada a um mobilizador já cadastrado na campanha (não passe a senha como argumento):
```bash
python backend/create_user.py --campanha-id <UUID> --ativista-id <UUID> --nome "Mobilizador" --email mobilizador@example.org --perfil BRIGADISTA
```
Para a conta do War Room, configure um JWT válido em `API_AUTH_TOKEN`; o token respeita a expiração definida por `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`.

### 4. Iniciar a Sala de Guerra (Streamlit Dark Mode)
```bash
pip install -r requirements.txt
streamlit run app.py
```
Acesse no navegador: [http://localhost:8501](http://localhost:8501)

### 5. Simulador Mobile Interativo
Abra com duplo clique no navegador: `mobile/preview.html`
Para executar o aplicativo Expo, instale as dependências com `npm ci` dentro de `mobile/` e use `npx expo start`.

### 6. Painéis executivos
A página `Painéis Executivos` apresenta abas para redes sociais, intenção de voto, tráfego pago e finanças. Os valores estão marcados como simulados; conecte fontes auditadas antes de uso operacional.

---

## 📖 Documentação Adicional

- [Relatório de Auditoria Técnica](docs/auditoria.md)
- [Guia de Demonstração e Vendas B2B](docs/demo_guide.md)
- [Marco Jurídico e Legislação Eleitoral CNE](docs/legal.md)
- [Política de Privacidade e Retenção de Dados](docs/privacidade.md)
