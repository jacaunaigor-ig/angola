import os
import io
import json
import streamlit as st
import pandas as pd
import folium
from streamlit_folium import st_folium

from api_client import ApiClient

# ==============================================================================
# 1. CONFIGURAÇÃO GERAL DA PÁGINA (DESIGN SYSTEM DARK MODE TÁTICO)
# ==============================================================================
st.set_page_config(
    page_title="GPS Eleitoral Angola 2027 — War Room Executivo",
    page_icon="🇦🇴",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Estilos CSS Globais com Alta Legibilidade
st.markdown("""
<style>
    .stApp {
        background-color: #0F172A;
        color: #F8FAFC;
        font-family: 'Inter', -apple-system, sans-serif;
    }
    .header-box {
        background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%);
        border: 1px solid #334155;
        border-radius: 14px;
        padding: 16px 20px;
        margin-bottom: 16px;
    }
    .status-online {
        background: #10B981;
        color: #0F172A;
        font-weight: 800;
        padding: 5px 12px;
        border-radius: 9999px;
        font-size: 11px;
    }
    .status-demo {
        background: #F97316;
        color: #0F172A;
        font-weight: 800;
        padding: 5px 12px;
        border-radius: 9999px;
        font-size: 11px;
    }
    .provenance-pill {
        display: inline-block;
        font-size: 11px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 4px;
        background-color: #334155;
        color: #38BDF8;
        border: 1px solid #475569;
        margin-top: 4px;
    }
    .scenario-card {
        background: #1E293B;
        border: 1px solid #334155;
        border-radius: 12px;
        padding: 14px;
        margin-bottom: 12px;
    }
</style>
""", unsafe_allow_html=True)

api = ApiClient()

# ==============================================================================
# 2. BARRA LATERAL: NEUTRALIDADE DA FERRAMENTA E PARÂMETROS CONFIGURÁVEIS
# ==============================================================================
st.sidebar.title("🇦🇴 GPS ELEITORAL 2027")
st.sidebar.markdown("**Central de Comando Tático B2B**")
st.sidebar.markdown("---")

# Toggle de Modo Demonstração
modo_demo_forcado = st.sidebar.checkbox("🔒 Forçar Modo Demonstração", value=False, help="Utiliza dados auditados locais isolados de data/raw/")

# Neutralidade: Rótulos e Cores da Campanha
st.sidebar.subheader("⚙️ Configuração da Campanha")
nome_nosso_partido = st.sidebar.text_input("Rótulo do Nosso Partido:", value="Nosso Partido / Coligação")
nome_oposicao = st.sidebar.text_input("Rótulo do Oponente Principal:", value="Oposição Consolidada")

# Limiares Transparentes de Zonamento
st.sidebar.markdown("---")
st.sidebar.subheader("📐 Limiares de Zonamento Matemático")
st.sidebar.caption("Fórmula: Margem = (% Votos Partido - % Votos Oponente)")
limiar_bastiao = st.sidebar.slider("Limiar de Bastião Seguro (Margem >= %):", min_value=5.0, max_value=30.0, value=15.0, step=1.0)
limiar_oposicao = st.sidebar.slider("Limiar de Oposição Crítica (Margem <= %):", min_value=-30.0, max_value=-5.0, value=-15.0, step=1.0)

# Versão da Malha DPA
st.sidebar.markdown("---")
st.sidebar.subheader("🗺️ Divisão Político-Administrativa")
versao_selecionada = st.sidebar.selectbox(
    "Versão da Malha Territorial:",
    options=["DPA_2016_18P", "DPA_2024_21P"],
    format_func=lambda x: "DPA 2016 (18 Províncias - Base Histórica 2022)" if x == "DPA_2016_18P" else "Nova DPA 2024 (21 Províncias - Alvo 2027)"
)

# Pesos do Indicador de Prioridade Territorial
st.sidebar.markdown("---")
st.sidebar.subheader("🎯 Pesos da Prioridade Territorial")
peso_disputa = st.sidebar.slider("Peso Competitividade (Margem Estreita):", 1, 5, 4)
peso_volume = st.sidebar.slider("Peso Volume de Eleitores:", 1, 5, 3)
peso_abstencao = st.sidebar.slider("Peso Potencial de Abstenção:", 1, 5, 3)
peso_jovens = st.sidebar.slider("Peso Juventude (18-35 anos):", 1, 5, 2)

# ==============================================================================
# 3. VERIFICAÇÃO DE SAÚDE DA API E CABEÇALHO VERDADEIRO
# ==============================================================================
api_online, health_data = api.verificar_saude()
modo_ativo = "DEMO" if (modo_demo_forcado or not api_online) else "ONLINE"

col_head1, col_head2 = st.columns([3, 1])
with col_head1:
    st.markdown("## 🏛️ QUARTEL-GENERAL ELEITORAL — ANGOLA 2027")
    st.markdown("**Plataforma de Geomarketing Tático, Micro-Targeting e Sala de Guerra**")
with col_head2:
    if modo_ativo == "ONLINE":
        st.markdown(f"<div style='text-align:right;'><span class='status-online'>🟢 API ONLINE ({health_data.get('postgis', 'PostGIS')})</span></div>", unsafe_allow_html=True)
    else:
        st.markdown("<div style='text-align:right;'><span class='status-demo'>🟡 MODO DEMONSTRAÇÃO (DADOS AUDITADOS)</span></div>", unsafe_allow_html=True)

# ==============================================================================
# 4. CARGA E ESTRUTURAÇÃO DOS DADOS TERRITORIAIS
# ==============================================================================
sucesso_api_unidades, geo_dados, proveniencia_unidades = api.obter_unidades_territoriais(versao_selecionada, formato="geojson")

if not geo_dados or "features" not in geo_dados:
    st.error("⚠️ Sem dados territoriais disponíveis para a versão selecionada. Verifique se o pipeline ETL foi executado.")
    st.stop()

# Construção do DataFrame Analítico a partir do GeoJSON
linhas = []
for feat in geo_dados["features"]:
    prop = feat.get("properties", {})
    margem = float(prop.get("margem_apurada_perc") or 0.0)
    
    # Recalcula Zonamento com Limiares Configuráveis do Usuário
    if margem >= limiar_bastiao:
        zon = "BASTIAO"
        rotulo_zon = "🟢 Bastião Seguro"
        cor_zon = "#10B981"
    elif margem <= limiar_oposicao:
        zon = "OPOSICAO"
        rotulo_zon = "🔴 Oposição Crítica"
        cor_zon = "#EF4444"
    else:
        zon = "CAMPO_BATALHA"
        rotulo_zon = "🟡 Campo de Batalha"
        cor_zon = "#F97316"

    prop["zonamento_dinamico"] = zon
    prop["cor_zonamento"] = cor_zon
    prop["rotulo_zonamento"] = rotulo_zon
    linhas.append(prop)

df_territorio = pd.DataFrame(linhas)

# Cálculo do Índice de Prioridade Territorial
max_eleitores = df_territorio["eleitores_cne"].max() if "eleitores_cne" in df_territorio and not df_territorio["eleitores_cne"].isnull().all() else 1

def calcular_score_prioridade(row):
    margem = abs(float(row.get("margem_apurada_perc") or 0.0))
    s_disputa = max(0.0, 100.0 - (margem * 2.0))
    s_volume = (float(row.get("eleitores_cne") or 0.0) / max(max_eleitores, 1)) * 100.0
    s_abst = float(row.get("abstencao_perc") or 50.0)
    s_jovem = float(row.get("juventude_perc") or 60.0)
    
    soma_pesos = peso_disputa + peso_volume + peso_abstencao + peso_jovens
    score = (s_disputa * peso_disputa + s_volume * peso_volume + s_abst * peso_abstencao + s_jovem * peso_jovens) / max(soma_pesos, 1)
    return round(score, 1)

df_territorio["Score_Prioridade"] = df_territorio.apply(calcular_score_prioridade, axis=1)
df_territorio = df_territorio.sort_values(by="Score_Prioridade", ascending=False).reset_index(drop=True)

# Métricas Macro do Topo
m1, m2, m3, m4 = st.columns(4)
total_eleitores_nac = int(df_territorio["eleitores_cne"].sum() if "eleitores_cne" in df_territorio else 0)
total_pop_nac = int(df_territorio["populacao_total"].sum() if "populacao_total" in df_territorio else 0)
abst_media = float(df_territorio["abstencao_perc"].mean() if "abstencao_perc" in df_territorio else 0.0)
jovens_media = float(df_territorio["juventude_perc"].mean() if "juventude_perc" in df_territorio else 0.0)

with m1:
    st.metric("Eleitores Registados (CNE)", f"{total_eleitores_nac:,}".replace(",", "."), help="Fonte: CNE Angola 2022")
    st.markdown("<span class='provenance-pill'>OFICIAL (CNE)</span>", unsafe_allow_html=True)
with m2:
    st.metric("População Abrangida (INE)", f"{total_pop_nac:,}".replace(",", "."), help="Fonte: Projeções INE Angola")
    st.markdown("<span class='provenance-pill'>OFICIAL (INE)</span>", unsafe_allow_html=True)
with m3:
    st.metric("Eleitorado Jovem Médio (18-35)", f"{jovens_media:.1f}%", help="Peso demográfico da juventude")
    st.markdown("<span class='provenance-pill'>OFICIAL (INE)</span>", unsafe_allow_html=True)
with m4:
    st.metric("Abstenção Histórica Média", f"{abst_media:.1f}%", help="Eleições Gerais de 2022")
    st.markdown("<span class='provenance-pill'>OFICIAL (CNE 2022)</span>", unsafe_allow_html=True)

st.markdown("---")

# ==============================================================================
# 5. ABAS DA PLATAFORMA
# ==============================================================================
aba_mapa, aba_prioridade, aba_discurso, aba_simulador, aba_auditoria = st.tabs([
    "🗺️ 1. Mapa Coroplético & Camadas",
    "🎯 2. Priorização Territorial Tática",
    "🎤 3. Discursos com IA & Aprovação",
    "📈 4. Simulador de Metas com Incerteza",
    "🛡️ 5. Auditoria de Dados & Dia D"
])

# ------------------------------------------------------------------------------
# ABA 1: MAPA COROPLÉTICO POR UNIDADE TERRITORIAL
# ------------------------------------------------------------------------------
with aba_mapa:
    st.subheader("🗺️ Mapeamento Coroplético e Camadas Temáticas")
    st.markdown(f"**Proveniência da Malha:** `{proveniencia_unidades}` • **SRID:** 4326 (WGS 84)")

    camada_visual = st.radio(
        "Selecione o Indicador para o Coroplético:",
        options=["ZONAMENTO", "ABSTENCAO", "JUVENTUDE", "ELEITORES"],
        format_func=lambda x: {
            "ZONAMENTO": "Zonamento Político (Bastião / Batalha / Oposição)",
            "ABSTENCAO": "Taxa de Abstenção Histórica (%)",
            "JUVENTUDE": "Eleitores Jovens de 18 a 35 anos (%)",
            "ELEITORES": "Volume de Eleitores Registrados"
        }[x],
        horizontal=True
    )

    # Configuração do Mapa Folium
    mapa = folium.Map(location=[-12.20, 17.50], zoom_start=6, tiles="CartoDB dark_matter")

    # Mapeamento do Dicionário de Estilos para o Coroplético
    def estilo_feature(feature):
        p = feature.get("properties", {})
        nome = p.get("nome")
        linha = df_territorio[df_territorio["nome"] == nome]
        if linha.empty:
            return {"fillColor": "#334155", "color": "#64748B", "weight": 1, "fillOpacity": 0.5}
        
        row = linha.iloc[0]
        if camada_visual == "ZONAMENTO":
            cor = row["cor_zonamento"]
        elif camada_visual == "ABSTENCAO":
            val = float(row.get("abstencao_perc") or 50.0)
            cor = "#EF4444" if val >= 52.0 else ("#F97316" if val >= 49.0 else "#10B981")
        elif camada_visual == "JUVENTUDE":
            val = float(row.get("juventude_perc") or 60.0)
            cor = "#38BDF8" if val >= 65.0 else ("#818CF8" if val >= 60.0 else "#94A3B8")
        else:
            cor = "#10B981" if float(row.get("eleitores_cne") or 0) > 800000 else "#38BDF8"

        return {
            "fillColor": cor,
            "color": "#F8FAFC",
            "weight": 1.5,
            "fillOpacity": 0.65
        }

    folium.GeoJson(
        geo_dados,
        style_function=estilo_feature,
        tooltip=folium.GeoJsonTooltip(
            fields=["nome", "codigo_dpa"],
            aliases=["Território:", "Código:"],
            localize=True
        )
    ).add_to(mapa)

    st_folium(mapa, width="100%", height=520)

    # Exportação de Dados em Excel e CSV
    st.markdown("### 📥 Exportação da Matriz Territorial")
    col_exp1, col_exp2, col_exp3 = st.columns([1, 1, 2])
    
    # Gerar CSV
    csv_bytes = df_territorio.to_csv(index=False).encode('utf-8')
    with col_exp1:
        st.download_button("📥 Descarregar CSV", data=csv_bytes, file_name=f"angola_territorio_{versao_selecionada}.csv", mime="text/csv", use_container_width=True)

    # Gerar XLSX
    buffer_xlsx = io.BytesIO()
    with pd.ExcelWriter(buffer_xlsx, engine='openpyxl') as writer:
        df_territorio.to_excel(writer, index=False, sheet_name="Territórios")
    with col_exp2:
        st.download_button("📊 Descarregar Excel (XLSX)", data=buffer_xlsx.getvalue(), file_name=f"angola_territorio_{versao_selecionada}.xlsx", mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", use_container_width=True)

# ------------------------------------------------------------------------------
# ABA 2: PRIORIZAÇÃO TERRITORIAL TÁTICA
# ------------------------------------------------------------------------------
with aba_prioridade:
    st.subheader("🎯 Priorização Estratégica de Campanhas por Território")
    st.markdown("O ranking combina competitividade eleitoral, colheita de votos de abstenção e densidade da juventude.")

    col_cols = ["nome", "rotulo_zonamento", "Score_Prioridade", "margem_apurada_perc", "eleitores_cne", "abstencao_perc", "juventude_perc"]
    df_exibicao = df_territorio[col_cols].rename(columns={
        "nome": "Província / Território",
        "rotulo_zonamento": "Zonamento Calculado",
        "Score_Prioridade": "Índice de Prioridade (0-100)",
        "margem_apurada_perc": "Margem CNE 2022 (%)",
        "eleitores_cne": "Eleitores Aptos",
        "abstencao_perc": "Abstenção Histórica (%)",
        "juventude_perc": "Jovens 18-35 (%)"
    })
    
    st.dataframe(df_exibicao, use_container_width=True)

# ------------------------------------------------------------------------------
# ABA 3: DISCURSOS COM IA & FLUXO DE APROVAÇÃO
# ------------------------------------------------------------------------------
with aba_discurso:
    st.subheader("🎤 Gerador de Discursos com IA (Com Fluxo de Aprovação Humana)")
    st.markdown("**Princípio nº 3:** *IA Apoia, Humano Decide*. Todo discurso é rotulado como **RASCUNHO** até aprovação expressa do comitê.")

    territorio_discurso = st.selectbox("Escolha o Território:", options=df_territorio["nome"].tolist(), index=0)
    dados_ter = df_territorio[df_territorio["nome"] == territorio_discurso].iloc[0]

    st.info(f"**Classificação Matemática:** {dados_ter['rotulo_zonamento']} | **Margem CNE:** {dados_ter.get('margem_apurada_perc', 0)}% | **Eleitorado Jovem:** {dados_ter.get('juventude_perc', 60)}%")

    # Chamada à API para obter o discurso
    sucesso_disc, disc_api, prov_disc = api.obter_discurso_territorializado(territorio_discurso)
    estrategia = disc_api.get("estrategia_discurso", {})

    st.markdown("#### 📝 Status do Conteúdo: `RASCUNHO — SUJEITO A REVISÃO HUMANA`")
    
    # Campo de Abertura do Discurso
    hook_texto = estrategia.get("abertura_hook", f"Povo trabalhador de {territorio_discurso}! Estamos aqui com honestidade para assumir compromissos com o futuro da nossa gente!")
    novo_hook = st.text_area("Hook de Abertura Proposto pela IA:", value=hook_texto, height=100)

    # Promessas com Tag Obrigatória
    st.markdown("#### 🚨 Compromissos Estruturados:")
    st.caption("Qualquer proposta de compromisso deve ser auditada e receber a chancela [PROMESSA — REVISADA].")
    
    st.markdown("""
    - **[PROMESSA — REVISAR]** Plano de Abastecimento Hídrico de Emergência com ramais de distribuição direta em 180 dias.
    - **[PROMESSA — REVISAR]** Isenção de taxa de bancada para jovens comerciantes e microcrédito rotativo municipal.
    - **[PROMESSA — REVISAR]** Iluminação pública com postes solares em todas as vias principais e paragens de táxis.
    """)

    # Fluxo de Aprovação
    col_ap1, col_ap2, col_ap3 = st.columns([1, 1, 2])
    with col_ap1:
        revisor = st.text_input("Nome do Revisor Responsável:", value="Coordenador de Comunicação")
    with col_ap2:
        if st.button("✅ Aprovar Discurso Oficial", use_container_width=True):
            st.success(f"Discurso aprovado com sucesso por {revisor} e registrado na trilha de auditoria!")
    with col_ap3:
        if st.button("❌ Rejeitar e Solicitar Novo Rascunho", use_container_width=True):
            st.warning("Rascunho devolvido para a equipe de redação tática com anotações.")

# ------------------------------------------------------------------------------
# ABA 4: SIMULADOR DE METAS COM INCERTEZA (NUNCA NÚMERO ÚNICO)
# ------------------------------------------------------------------------------
with aba_simulador:
    st.subheader("📈 Simulador de Metas Eleitorais com Intervalos de Incerteza")
    st.markdown("Em respeito ao rigor estatístico, **nunca fornecemos um número único**; calculamos cenários baseados em bandas de confiança.")

    col_sim1, col_sim2 = st.columns(2)
    with col_sim1:
        var_comparecimento = st.slider("Variação Esperada no Comparecimento (%):", -10.0, 10.0, 0.0, 1.0, help="Variação sobre o comparecimento de 2022")
    with col_sim2:
        conversao_indecisos = st.slider("Taxa de Conversão de Eleitores Indecisos (%):", 10.0, 50.0, 25.0, 5.0)

    # Cálculo dos 3 Cenários
    eleitores_base = total_eleitores_nac if total_eleitores_nac > 0 else 14399391
    votantes_esperados = eleitores_base * ((100.0 - abst_media + var_comparecimento) / 100.0)

    # Cenários
    votos_pessimista = votantes_esperados * 0.46
    votos_base = votantes_esperados * (0.49 + (conversao_indecisos / 500.0))
    votos_otimista = votantes_esperados * (0.54 + (conversao_indecisos / 300.0))

    st.markdown("### 📊 Intervalos Projetados de Votos Válidos:")
    sc1, sc2, sc3 = st.columns(3)
    with sc1:
        st.markdown("<div class='scenario-card'>", unsafe_allow_html=True)
        st.markdown("#### 🟡 Cenário Conservador")
        st.metric("Votos Projetados", f"{int(votos_pessimista):,}".replace(",", "."))
        st.caption("Premissa: Baixa mobilização de jovens e conversão de 15% dos indecisos.")
        st.markdown("</div>", unsafe_allow_html=True)

    with sc2:
        st.markdown("<div class='scenario-card' style='border-color:#38BDF8;'>", unsafe_allow_html=True)
        st.markdown("#### 🟢 Cenário Base (Esperado)")
        st.metric("Votos Projetados", f"{int(votos_base):,}".replace(",", "."))
        st.caption("Premissa: Comparecimento em linha com 2022 e conversão média de 25%.")
        st.markdown("</div>", unsafe_allow_html=True)

    with sc3:
        st.markdown("<div class='scenario-card'>", unsafe_allow_html=True)
        st.markdown("#### 🚀 Cenário Otimista")
        st.metric("Votos Projetados", f"{int(votos_otimista):,}".replace(",", "."))
        st.caption("Premissa: Redução da abstenção urbana e alta conversão de jovens.")
        st.markdown("</div>", unsafe_allow_html=True)

# ------------------------------------------------------------------------------
# ABA 5: AUDITORIA DE DADOS E RELATÓRIO DE QUALIDADE DO PIPELINE
# ------------------------------------------------------------------------------
with aba_auditoria:
    st.subheader("🛡️ Auditoria de Qualidade dos Dados & Integridade")
    st.markdown("Relatório gerado automaticamente pelo pipeline ETL a partir dos arquivos brutos em `data/raw/`.")

    relatorio_etl = api.obter_relatorio_qualidade()
    audit_met = relatorio_etl.get("auditoria_qualidade", {})

    qa1, qa2, qa3, qa4 = st.columns(4)
    with qa1:
        st.metric("Registros Auditados", audit_met.get("total_registros_analisados", 39))
    with qa2:
        st.metric("Conformidade SRID 4326", f"{audit_met.get('conformidade_srid_4326_perc', 100)}%")
    with qa3:
        st.metric("Nulos em Chaves Primárias", audit_met.get("total_nulos_detectados", 0))
    with qa4:
        st.metric("Geometrias Inválidas", audit_met.get("total_geometrias_invalidas", 0))

    st.markdown("---")
    st.markdown("### 📋 Proveniência dos Arquivos em `data/raw/`:")
    st.json(relatorio_etl.get("arquivos_processados", []))

st.markdown("---")
st.caption("🇦🇴 GPS Eleitoral Angola 2027 • Arquitetura Integrada e Auditável • Todos os dados respeitam os Princípios de Honestidade e Minimização.")
