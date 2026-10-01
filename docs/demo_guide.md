# Roteiro de Demonstração Comercial e Venda B2B
## Plataforma: GPS de Marketing Político — Angola 2027

Este documento orienta os consultores e arquitetos de soluções durante apresentações ao vivo para lideranças partidárias, diretores de campanha e comitês eleitorais.

---

## 🎯 Proposta de Valor Única (Pitch de 2 Minutos)

> *"As eleições de 2027 em Angola serão decididas na margem de votos dos centros urbanos e no combate à abstenção no interior. A maioria das campanhas ainda usa planilhas dispersas e toma decisões às cegas. O nosso **GPS de Marketing Político** é a única plataforma militarmente estruturada para a realidade de Angola: opera 100% offline no terreno (mesmo em áreas sem sinal 4G), gera discursos territorializados fundamentados em carências reais e audita cada ata de voto com precisão GPS e criptografia SHA-256 no Dia D."*

---

## 🧭 Roteiro da Demonstração (Passo a Passo)

### Bloco 1: Honestidade dos Dados e Transparência Territorial (5 min)
1. **Abrir a Sala de Guerra (`app.py`):**
   - Apontar o selo no cabeçalho: se conectado à infraestrutura real, exibe `🟢 API ONLINE (PostGIS)`; se desconectado, exibe explicitamente `🟡 MODO DEMONSTRAÇÃO (DADOS AUDITADOS)`.
   - Ressaltar o **Princípio da Honestidade dos Dados**: cada número exibido possui selo de proveniência (`OFICIAL - CNE`, `OFICIAL - INE`, `ESTIMADO`).
2. **Mapa Coroplético Interativo:**
   - Alternar entre as divisões político-administrativas: mostrar como o sistema gerencia a transição histórica das **18 Províncias (DPA 2016)** para as **21 Províncias (DPA 2024)**, incluindo as novas províncias de *Icolo e Bengo*, *Moxico Leste* e *Cuando*.
   - Alternar as camadas: *Zonamento Político*, *Abstenção 2022*, *Juventude (18-35 anos)*.
3. **Zonamento com Fórmula Matemática Visível:**
   - Abrir a barra lateral e mostrar que o zonamento **não é digitado à mão**.
   - Alterar o slider do limiar de Bastião (de 15% para 10%) e mostrar o mapa recalculando instantaneamente.

---

### Bloco 2: Priorização Tática e Simulador de Metas com Incerteza (4 min)
1. **Aba "Priorização Territorial":**
   - Demonstrar o cálculo dinâmico do **Índice de Prioridade (0-100)**: a liderança sabe exatamente onde o candidato deve investir o tempo e os recursos da campanha.
   - Mostrar os botões de **Exportação para Excel (`.xlsx`) e CSV** em um clique.
2. **Aba "Simulador de Metas":**
   - Enfatizar o compromisso ético: **nunca vendemos um número mágico único**.
   - Ajustar os sliders de variação de comparecimento e conversão de indecisos: mostrar os 3 cenários com intervalos de confiança (*Conservador*, *Base*, *Otimista*).

---

### Bloco 3: Discursos com IA (Anthropic Claude) & Governança Humana (5 min)
1. **Aba "Discursos com IA":**
   - Selecionar uma província de oposição (ex: *Viana*) e depois um bastião (ex: *Huambo*).
   - Mostrar a diferença imediata no tom estratégico sugerido pela IA.
   - Enfatizar o selo: **`RASCUNHO — SUJEITO A REVISÃO HUMANA`** e as tags obrigatórias **`[PROMESSA — REVISAR]`**.
   - Executar o fluxo ao vivo: preencher o nome do revisor e clicar em **"✅ Aprovar Discurso Oficial"**. Mostrar que a aprovação fica carimbada com data e autor.

---

### Bloco 4: Operação de Campo Mobile Offline-First e Privacidade (4 min)
1. **Abrir o Simulador Mobile (`mobile/preview.html`):**
   - Mostrar os botões táteis grandes de humor: `🙂 Apoio`, `😐 Indeciso`, `🙁 Rejeição`.
   - Mostrar o termo de **Consentimento e Retenção de Dados** visível na tela.
   - Explicar a perturbação proposital de coordenadas GPS: a coordenada é agregada em ~100m para blindar a privacidade do eleitor e respeitar a Lei n.º 22/11 de Angola.
   - Registrar uma visita em modo offline: mostrar o badge superior mudando para `🟡 1 Offline` e depois simular a sincronização atômica.

---

### Bloco 5: Sala de Guerra do Dia D & Apuramento Paralelo (5 min)
1. **Cadeia de Custódia Criptográfica:**
   - Mostrar o escaneamento da ata gerando o hash duplo **SHA-256** (da foto e dos votos tabulados).
2. **Geofencing como Alerta para Revisão Humana:**
   - Simular um envio dentro da escola (48m) ➔ Status: `PENDENTE / VÁLIDO`.
   - Simular um envio a 1.250m de distância ➔ Status: `ALERTA PARA REVISÃO HUMANA` (sem acusação de fraude, mas gerando protocolo formal para auditoria).
3. **Criação de Caso Jurídico Estruturado:**
   - Demonstrar o botão de acionamento jurídico gerando protocolo formal (`CASO-2027-XXX`) com advogado responsável atribuído e anexos.
4. **Declaração de Cobertura e Incerteza:**
   - Apontar o percentual de apuração com declaração explícita de incerteza enquanto a cobertura for parcial.

---

## 🛡️ Principais Respostas a Objeções de Clientes

- **Objeção 1: *"E se os brigadistas ficarem sem internet no interior?"***
  - *Resposta:* "O aplicativo foi desenhado como Offline-First desde a primeira linha de código. A fila local usa SQLite/AsyncStorage com UUIDv4. Os dados ficam guardados no aparelho e sincronizam em lote atômico assim que houver conexão, sem perda ou duplicação."
- **Objeção 2: *"A CNE pode proibir este sistema?"***
  - *Resposta:* "Não. O sistema opera nos termos estritos da Lei Orgânica sobre as Eleições Gerais (Lei n.º 36/11). A ata fotografada é a via oficial que a lei garante por direito ao delegado de lista credenciado do partido. Nosso documento legal (`docs/legal.md`) respalda toda a operação."
- **Objeção 3: *"Os dados de uma campanha podem vazar para outro partido?"***
  - *Resposta:* "A arquitetura utiliza Row Level Security (RLS) diretamente no banco PostgreSQL e criptografia de senhas com Bcrypt e tokens JWT assinados. O isolamento multi-tenant é absoluto em nível de banco de dados."
