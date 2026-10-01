# Marco Jurídico, Diretrizes de Conformidade e Fiscalização Eleitoral
## Plataforma: GPS de Marketing Político — Angola 2027

**Data do Documento:** 01 de Outubro de 2026  
**Jurisdição:** República de Angola  
**Legislação de Referência:**
- Constituição da República de Angola (CRA)
- Lei n.º 36/11, de 21 de Dezembro — *Lei Orgânica sobre as Eleições Gerais* (alterada pela Lei n.º 30/21, de 30 de Novembro)
- Regulamentos e Editais da Comissão Nacional Eleitoral (CNE de Angola)
- Lei n.º 22/11, de 17 de Junho — *Lei da Protecção de Dados Pessoais*

---

## 1. Natureza Jurídica da Plataforma

O **GPS de Marketing Político — Angola 2027** é um software de gestão logística interna, inteligência territorial, planejamento oratório e apuramento paralelo privado para partidos políticos, coligações de partidos e candidaturas legalmente constituídas junto do Tribunal Constitucional de Angola.

1. **Apuramento Próprio e Não Oficial:**
   - O apuramento paralelo gerido pela plataforma possui natureza estritamente auxiliar e informativa para controle interno da campanha.
   - Os únicos resultados eleitorais vinculativos e com fé pública são aqueles formalmente proclamados pela **Comissão Nacional Eleitoral (CNE)** nos termos do Artigo 135.º da Lei Orgânica sobre as Eleições Gerais.
   - A plataforma declara publicamente sua taxa de cobertura territorial e margem de incerteza em todas as telas executivas.

---

## 2. Credenciamento Obrigatório de Delegados de Lista

A coleta de fotos de atas e registro de votação nas mesas depende estritamente do cumprimento da lei eleitoral:

1. **Estatuto dos Delegados de Lista (Artigo 75.º da Lei n.º 36/11):**
   - Todo ativista ou delegado que opera o módulo do Dia D na assembleia de voto deve estar formalmente credenciado pela Comissão Provincial Eleitoral (CPE) ou Comissão Municipal Eleitoral (CME) competente.
   - O delegado de lista tem o direito legal de assinar e receber cópia idêntica da **Ata das Operações de Votação e Apuramento da Mesa** (Artigo 99.º).
2. **Fotografia e Digitalização da Ata:**
   - A digitalização da via da ata destinada ao partido é legal e legítima como instrumento de fiscalização partidária.
   - É terminantemente proibido registrar imagens do interior da cabine de voto ou do ato de preenchimento do boletim pelo cidadão (respeito irrestrito ao **segredo do voto**, Artigo 85.º).

---

## 3. Protocolo de Geofencing e Gestão de Incidentes (Sem Acusação Precipitada)

A validação espacial da distância entre a coordenada de envio da ata e o local cadastrado da assembleia segue critérios técnicos preventivos:

1. **Desvio Espacial > 300 Metros:**
   - A marcação no sistema é classificada como **`ALERTA PARA REVISÃO HUMANA`** (status técnico: `SUSPEITA`).
   - Não se trata de acusação automática de fraude eleitoral, mas de sinalização de conformidade para a equipe de auditoria interna.
   - Motivos comuns aceitos em revisão: instabilidade do sinal GPS no interior de edifícios escolares, envio realizado a partir da sede municipal por falta de sinal no pátio da assembleia, ou imprecisão no cadastro original da coordenada CNE.
2. **Criação de Caso Jurídico Formal:**
   - O acionamento da equipe jurídica através do botão da plataforma cria um **Caso Formal com Número de Protocolo (`CASO-2027-XXX`)**.
   - O caso registra as evidências técnicas: foto original, hash criptográfico SHA-256, coordenada de envio, distância calculada e horário.
   - **Obrigatoriedade de Validação com Advogado:** Nenhuma reclamação formal ou recurso contencioso perante as Comissões Eleitorais ou o Tribunal Constitucional (Artigo 153.º e seguintes) pode ser submetido sem a prévia revisão e assinatura de advogado inscrito na Ordem dos Advogados de Angola (OAA).

---

## 4. Proteção de Dados, Anonimização e Privacidade

Em cumprimento à Lei n.º 22/11 (Protecção de Dados Pessoais):

1. **Proibição de Registro Individual de Eleitores:**
   - As brigadas de campo e ativistas não coletam, sob hipótese alguma, nomes completos, números de Bilhete de Identidade (BI), moradas exatas ou afiliação política nominal dos cidadãos abordados.
2. **Agregação Territorial Obrigatória:**
   - As pesquisas de sentimento e carências comunitárias (água, energia, emprego) são consolidadas em nível de unidade territorial ou setor (~100m de raio).
3. **Identificadores Operacionais de Brigadistas:**
   - Os ativistas utilizam códigos operacionais anônimos (`BRIGADA-TALATONA-04`). Seus contatos telefônicos são criptografados na base de dados com hash SHA-256 para prevenir perseguições ou vazamento de dados de filiação partidária.
4. **Política de Retenção e Descarte:**
   - Os dados de campo coletados são mantidos exclusivamente durante o ciclo de preparação e realização das Eleições Gerais de 2027.
   - Após o término do contencioso eleitoral e validação dos resultados pelo Tribunal Constitucional, os dados brutos de campo devem ser eliminados ou arquivados em meio criptografado offline.

---

*Este documento estabelece as balizas legais da plataforma e deve ser revisado periodicamente pelo departamento jurídico da campanha contratante.*
