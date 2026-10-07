# Política de Privacidade, Minimização e Retenção de Dados
## Plataforma: GPS de Marketing Político — Angola 2027

**Data da Versão:** 01 de Outubro de 2026  
**Marco Legal:** Lei n.º 22/11, de 17 de Junho (*Lei da Protecção de Dados Pessoais de Angola*)  
**Princípio Central:** *Agregação Territorial e Não-Identificação Individual*

---

## 1. Princípios de Proteção de Dados

A plataforma foi concebida sob os pilares de **Privacy by Design** (Privacidade desde a Concepção) e **Privacy by Default** (Privacidade por Padrão), respeitando com rigor o sigilo da convicção política individual dos cidadãos angolanos:

1. **Princípio da Minimização de Dados:**
   - Coleta-se estritamente o mínimo indispensável para fins de planejamento logístico e compreensão das necessidades comunitárias (ex: falta de água, energia, estradas).
   - **É estritamente proibido** o cadastramento de nomes completos de eleitores, números de Bilhete de Identidade (BI), filiação partidária nominal, fotografias de cidadãos ou dados bancários/financeiros.
2. **Princípio da Agregação Geográfica:**
   - As visitas de campo sofrem perturbação proposital de coordenadas GPS: latitude e longitude são truncadas para 3 casas decimais (~110 metros de raio).
   - O sistema nunca aponta a residência individual de uma família ou cidadão específico, agregando sempre os dados em nível de setor, quarteirão, comuna ou município.
3. **Anonimização de Ativistas e Brigadas:**
   - Os brigadistas operam através de identificadores funcionais anônimos (ex: `BRIGADA-TALATONA-04`).
   - Os números de contato e tokens de aparelho são submetidos a hash criptográfico irreversível (SHA-256) na base de dados para prevenir vazamentos de dados ou perseguição política.

---

## 2. Inventário de Dados Tratados

| Categoria | Dado Coletado | Finalidade | Nível de Sensibilidade | Tratamento de Segurança |
|---|---|---|---|---|
| **Terreno (Porta-a-Porta)** | Coordenada GPS aproximada (~110m) | Mapeamento geoespacial de carências públicas | Média | Arredondamento para 3 casas decimais |
| **Terreno (Porta-a-Porta)** | Sentimento Categórico (`POSITIVO`, `NEUTRO`, `NEGATIVO`) | Humor estatístico do eleitorado no bairro | Alta | Agregação estatística, sem vínculo nominal |
| **Terreno (Porta-a-Porta)** | Faixa Etária (`18-24`, `25-35`, `36-50`, `50+`) | Avaliação de demandas da juventude | Baixa | Dado categórico |
| **Terreno (Porta-a-Porta)** | Carências Prioritárias (`AGUA`, `LUZ`, etc.) | Elaboração de propostas de governo | Baixa | Classificação por categorias fechadas |
| **Dia D (Atas)** | Fotografia da Ata Oficial da Mesa | Apuramento paralelo e fiscalização partidária | Média | Hash SHA-256 da imagem e dados tabulados |
| **Sistema (Operadores)** | E-mail corporativo e senha | Autenticação no War Room | Alta | Senha criptografada com Bcrypt |

---

## 3. Isolamento Multi-Tenancy (Row Level Security - RLS)

Para clientes B2B (partidos e coligações):
- Cada campanha opera em ambiente logicamente isolado através de `campanha_id`.
- Políticas de **Row Level Security (RLS)** no PostgreSQL garantem que operadores de uma campanha jamais consigam visualizar, exportar ou inferir dados de outra campanha armazenada no mesmo banco de dados.

---

## 4. Política de Retenção e Ciclo de Descarte

1. **Ciclo Ativo:**
   - Os dados coletados permanecem ativos nos servidores durante o período de pré-campanha, campanha oficial e apuramento eleitoral de 2027.
2. **Descarte Seguro Pós-Pleito:**
   - No prazo de **90 dias** após a proclamação definitiva dos resultados eleitorais pelo Tribunal Constitucional de Angola, todos os dados brutos de visitas de campo contendo carimbos de tempo detalhados são expurgados do banco de dados operacional.
   - Restam arquivados apenas os relatórios consolidados em nível de província/município para fins de memória histórica da agremiação política contratante.
3. **Canal WhatsApp (`queixas_eleitor`):**
   - Guarda-se só município, categoria, descrição, telefone mascarado e hash HMAC. Sem nome, BI ou número em claro.
   - A API apaga linhas com mais de **90 dias** em cada escrita e leitura (retenção contínua, não só no pós-pleito).

---

## 5. Canal de Governança e Encarregado de Proteção de Dados (DPO)

Qualquer dúvida, solicitação de auditoria ou esclarecimento sobre a custódia e descarte de dados pode ser encaminhada ao Comitê de Governança e Segurança da Informação da plataforma através do canal interno de segurança: `privacidade@campanha2027.ao`.
