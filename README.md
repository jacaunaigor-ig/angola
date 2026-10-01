# 🇦🇴 GPS de Marketing Político — Angola 2027

> **Plataforma B2B de Inteligência Territorial, Micro-Targeting Eleitoral, Operações Mobile Offline-First e Painel de Apuramento do Dia D.**

---

## 🏛️ Visão Geral da Arquitetura

O sistema é desenhado especificamente para a realidade territorial, demográfica e de infraestrutura de conectividade das Eleições Gerais de Angola em 2027:

1. **Inteligência Territorial e Micro-Targeting:** Classificação histórica de assembleias e municípios (*🟢 Bastiões Seguros, 🟡 Campos de Batalha, 🔴 Zonas de Oposição*), com camada de demografia jovem focada no eleitorado de 18 a 35 anos.
2. **Logística de Terreno Offline-First:** Coleta porta-a-porta via aplicativo móvel resiliente, permitindo aos brigadistas registrar visitas sem acesso à internet, com sincronização atómica e idempotente (`BEGIN / COMMIT`, `ON CONFLICT (id) DO NOTHING`).
3. **Gestão de Promessas e Discursos:** Cruzamento das carências registradas em campo (*Água, Energia, Emprego, Saneamento, Estradas, Saúde*) para geração automatizada da cábula do candidato por município.
4. **Painel do Dia D & Apuramento Paralelo:** Telemetria de afluência horária e submissão fotográfica de atas com validação de geofencing (**PostGIS ST_DWithin ≤ 300m**) e cálculo de hash **SHA-256** anti-fraude.

---

## 📦 Estrutura do Projeto

```text
projeto_angola/
├── backend/                              # API RESTful em Node.js e Express
│   ├── src/
│   │   ├── config/db.js                 # Pool PostgreSQL resiliente
│   │   ├── controllers/
│   │   │   ├── visitasController.js     # Sincronização offline atómica
│   │   │   ├── locaisVotoController.js  # Consultas espaciais PostGIS
│   │   │   ├── dashboardController.js   # Resumo tático do BottomSheet
│   │   │   ├── discursosController.js   # Cábula e promessas territorializadas
│   │   │   └── warRoomController.js     # War Room e apuramento do Dia D
│   │   └── server.js                    # Inicialização e Graceful Shutdown
│   ├── Dockerfile                       # Container do Backend
│   └── tests/api_requests.http          # Coleção de testes REST
├── database/                            # Scripts SQL PostgreSQL / PostGIS
│   ├── 01_schema_postgis.sql            # Tabelas, enums, triggers e índices GiST/GIN
│   ├── 02_seed_angola_data.sql          # Dados de teste (Luanda, Huambo, Lobito)
│   └── 03_seed_municipios_angola.sql    # Matriz oficial de municípios e assembleias
├── mobile/                              # Aplicação Móvel & Simulador
│   ├── App.js                           # App React Native / Expo
│   ├── preview.html                     # Simulador Mobile interativo
│   └── src/
│       ├── screens/                     # 3 Ecrãs: Mapa, Porta-a-Porta e Dia D
│       ├── services/offlineStorage.js   # Gestão de fila offline e UUIDv4
│       └── theme/theme.js               # Design System Dark Mode (#0F172A)
├── app.py                               # Sala de Guerra Executiva (Streamlit Dark Mode)
├── docker-compose.yml                   # Orquestração: PostGIS + API + Streamlit + Nginx
├── render.yaml                          # Blueprint para Deploy 1-Click no Render.com
└── tests/test_fluxo_completo.js         # Suíte de 20 testes de integração (100% OK)
```

---

## 🚀 Como Executar Localmente

### Opção 1: Via Docker Compose (Recomendado para Produção)

```bash
# Inicia PostGIS, Backend Node.js, War Room Streamlit e Simulador Mobile
docker compose up -d
```
- **Painel War Room (Streamlit):** [http://localhost:8501](http://localhost:8501)
- **API RESTful (Node.js):** [http://localhost:3001/api/health](http://localhost:3001/api/health)
- **Simulador Mobile:** [http://localhost:8080](http://localhost:8080)

---

### Opção 2: Execução Manual dos Serviços

#### 1. Base de Dados (PostgreSQL + PostGIS)
Execute os scripts da pasta `database/` no seu banco:
```bash
psql -U postgres -d angola_geomarketing -f database/01_schema_postgis.sql
psql -U postgres -d angola_geomarketing -f database/02_seed_angola_data.sql
psql -U postgres -d angola_geomarketing -f database/03_seed_municipios_angola.sql
```

#### 2. Backend Node.js
```bash
cd backend
npm install
npm run dev
```

#### 3. Painel Executivo War Room (Streamlit)
```bash
pip install -r requirements.txt
streamlit run app.py
```

#### 4. Testes de Integração Ponta a Ponta
```bash
node tests/test_fluxo_completo.js
```

---

## 🎨 Design System Tático (Dark Mode)

- **Fundo Principal:** `#0F172A` (Azul-Noite profundo)
- **Bastiões Seguros:** `#10B981` (Verde Esmeralda)
- **Campos de Batalha:** `#F97316` (Laranja Alerta)
- **Zonas Críticas (Oposição):** `#EF4444` (Vermelho Carmim)
- **Tipografia:** `Inter, SF Pro, system-ui`

---

## 📄 Licença
Distribuído sob licença proprietária para uso em campanhas e consultoria política.
