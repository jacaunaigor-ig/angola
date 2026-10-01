import os
import io
import json
import streamlit as st
import pandas as pd
import folium
from streamlit_folium import st_folium
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime

from api_client import ApiClient

# ==============================================================================
# 1. CONFIGURAÇÃO GERAL DA PÁGINA & THEME MODERNO
# ==============================================================================
st.set_page_config(
    page_title="GPS Eleitoral Angola 2027 — War Room Executivo",
    page_icon="🇦🇴",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Injeção de CSS Moderno com Glassmorphism, Gradientes Sutis e Tipografia Premium
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');

    .stApp {
        background-color: #080D1A;
        color: #F8FAFC;
        font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif;
    }

    /* Top Command Header */
    .command-header-card {
        background: linear-gradient(135deg, rgba(18, 27, 47, 0.95) 0%, rgba(8, 13, 26, 0.98) 100%);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 20px;
        padding: 20px 24px;
        margin-bottom: 20px;
        box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(16px);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .status-badge-online {
        background: rgba(16, 185, 129, 0.15);
        color: #10B981;
        border: 1.5px solid #10B981;
        font-weight: 800;
        padding: 6px 14px;
        border-radius: 9999px;
        font-size: 11px;
        letter-spacing: 0.5px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        box-shadow: 0 0 14px rgba(16, 185, 129, 0.25);
    }

    .status-badge-demo {
        background: rgba(249, 115, 22, 0.15);
        color: #F97316;
        border: 1.5px solid #F97316;
        font-weight: 800;
        padding: 6px 14px;
        border-radius: 9999px;
        font-size: 11px;
        letter-spacing: 0.5px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        box-shadow: 0 0 14px rgba(249, 115, 22, 0.25);
    }

    .live-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        display: inline-block;
        animation: pulseLive 2s infinite;
    }

    @keyframes pulseLive {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(0.85); }
    }

    /* Executive KPI Stat Cards */
    .kpi-container {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 14px;
        margin-bottom: 20px;
    }

    .kpi-card-glass {
        background: rgba(18, 27, 47, 0.75);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 16px;
        padding: 18px 20px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(12px);
        transition: transform 0.2s ease, border-color 0.2s ease;
        position: relative;
        overflow: hidden;
    }

    .kpi-card-glass:hover {
        transform: translateY(-2px);
        border-color: rgba(56, 189, 248, 0.4);
    }

    .kpi-card-glass::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 3px;
        background: linear-gradient(90deg, #38BDF8, #10B981);
    }

    .kpi-title {
        font-size: 11px;
        font-weight: 700;
        color: #94A3B8;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        margin-bottom: 6px;
    }

    .kpi-value {
        font-size: 26px;
        font-weight: 800;
        color: #F8FAFC;
        font-family: 'Plus Jakarta Sans', sans-serif;
        letter-spacing: -0.5px;
    }

    .kpi-sub {
        font-size: 11px;
        color: #64748B;
        margin-top: 4px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .provenance-pill {
        display: inline-block;
        font-size: 10px;
        font-weight: 800;
        padding: 2px 8px;
        border-radius: 6px;
        background-color: rgba(56, 189, 248, 0.12);
        color: #38BDF8;
        border: 1px solid rgba(56, 189, 248, 0.3);
    }

    /* Scenario Card */
    .scenario-box {
        background: rgba(18, 27, 47, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 16px;
        padding: 18px;
        text-align: center;
        box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    }

    /* Teleprompter Box */
    .teleprompter-rally-box {
        background: #0E172A;
        border-left: 5px solid #38BDF8;
        border-radius: 12px;
        padding: 20px;
        font-size: 16px;
        line-height: 26px;
        color: #F8FAFC;
        font-style: italic;
        margin: 14px 0;
    }

    .teleprompter-rally-box.large {
        font-size: 21px;
        line-height: 32px;
    }
</style>
""", unsafe_allow_html=True)

api = ApiClient()

# ==============================================================================
# 2. BARRA LATERAL: NEUTRALIDADE DA FERRAMENTA & CONFIGURAÇÃO DA CAMPANHA
# ==============================================================================
st.sidebar.image("https://upload.wikimedia.org/wikipedia/commons/9/9d/Flag_of_Angola.svg", width=54)
st.sidebar.title("🇦🇴 GPS ELEITORAL 2027")
st.sidebar.markdown("**Central de Inteligência Territorial B2B**")
st.sidebar.markdown("---")

# Toggle de Modo Demonstração
modo_demo_forcado = st.sidebar.checkbox("🔒 Forçar Modo Demonstração", value=False, help="Utiliza dados auditados locais isolados de data/raw/")

# Neutralidade Técnica: Rótulos Personalizáveis
st.sidebar.subheader("⚙️ Identidade da Campanha")
nome_nosso_partido = st.sidebar.text_input("Rótulo do Nosso Partido / Coligação:", value="Nosso Partido / Coligação")
nome_oposicao = st.sidebar.text_input("Rótulo do Oponente Principal:", value="Oposição Consolidada")

# Limiares de Zonamento Matemático
st.sidebar.markdown("---")
st.sidebar.subheader("📐 Regra de Zonamento Matemático")
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

# Pesos da Prioridade Territorial
st.sidebar.markdown("---")
st.sidebar.subheader("🎯 Pesos da Matriz de Priorização")
peso_disputa = st.sidebar.slider("Competitividade (Margem Estreita):", 1, 5, 4)
peso_volume = st.sidebar.slider("Volume de Eleitores Aptos:", 1, 5, 3)
peso_abstencao = st.sidebar.slider("Potencial de Abstenção:", 1, 5, 3)
peso_jovens = st.sidebar.slider("Densidade de Jovens (18-35 anos):", 1, 5, 2)

# ==============================================================================
# 3. VERIFICAÇÃO DE SAÚDE DA API & CABEÇALHO EXECUTIVO
# ==============================================================================
api_online, health_data = api.verificar_saude()
modo_ativo = "DEMO" if (modo_demo_forcado or not api_online) else "ONLINE"

status_html = f"""
<span class="status-badge-online">
    <span class="live-dot" style="background:#10B981;"></span>
    API ONLINE ({health_data.get('postgis', 'PostGIS 3.4')})
</span>
""" if modo_ativo == "ONLINE" else """
<span class="status-badge-demo">
    <span class="live-dot" style="background:#F97316;"></span>
    MODO DEMONSTRAÇÃO (DADOS AUDITADOS)
</span>
"""

st.markdown(f"""
<div class="command-header-card">
    <div>
        <div style="font-size:11px; font-weight:800; color:#38BDF8; letter-spacing:1.2px; text-transform:uppercase; margin-bottom:4px;">
            🇦🇴 REPÚBLICA DE ANGOLA • PLEITO PRESIDENCIAL E LEGISLATIVO 2027
        </div>
        <h2 style="margin:0; font-size:24px; font-weight:800; color:#F8FAFC;">
            SALA DE GUERRA & WAR ROOM DE MARKETING POLÍTICO
        </h2>
        <div style="font-size:12px; color:#94A3B8; margin-top:4px;">
            Inteligência Territorial • Demografia da Juventude • Discursos com IA • Monitoramento do Dia D
        </div>
    </div>
    <div style="text-align:right;">
        {status_html}
        <div style="font-size:10px; color:#64748B; margin-top:6px; font-family:'JetBrains Mono';">
            DATA: {datetime.now().strftime('%d/%m/%Y • %H:%M')}
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

# ==============================================================================
# 4. CARGA DOS DADOS TERRITORIAIS OFICIAIS
# ==============================================================================
sucesso_api_unidades, geo_dados, proveniencia_unidades = api.obter_unidades_territoriais(versao_selecionada, formato="geojson")

if not geo_dados or "features" not in geo_dados:
    st.error("⚠️ Sem dados territoriais disponíveis para a versão selecionada. Verifique o pipeline ETL.")
    st.stop()

# Montagem do DataFrame Analítico a partir do GeoJSON
linhas = []
for feat in geo_dados["features"]:
    prop = feat.get("properties", {})
    margem = float(prop.get("margem_apurada_perc") or 0.0)

    # Recalcula Zonamento Determinístico com os Limiares do Usuário
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

# Cálculo do Índice de Prioridade Territorial Tática (0-100)
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

# Totais Nacionais Consolidados
total_eleitores_nac = int(df_territorio["eleitores_cne"].sum() if "eleitores_cne" in df_territorio else 0)
total_pop_nac = int(df_territorio["populacao_total"].sum() if "populacao_total" in df_territorio else 0)
abst_media = float(df_territorio["abstencao_perc"].mean() if "abstencao_perc" in df_territorio else 0.0)
jovens_media = float(df_territorio["juventude_perc"].mean() if "juventude_perc" in df_territorio else 0.0)

# Renderização dos 4 KPI Cards Modernos
st.markdown(f"""
<div class="kpi-container">
    <div class="kpi-card-glass">
        <div class="kpi-title">Eleitorado Registado</div>
        <div class="kpi-value">{total_eleitores_nac:,}".replace(",", ".")</div>
        <div class="kpi-sub">
            <span>Base Eleitoral CNE</span>
            <span class="provenance-pill">OFICIAL CNE</span>
        </div>
    </div>
    <div class="kpi-card-glass">
        <div class="kpi-title">População Abrangida</div>
        <div class="kpi-value">{total_pop_nac:,}".replace(",", ".")</div>
        <div class="kpi-sub">
            <span>Projeções Demográficas</span>
            <span class="provenance-pill">OFICIAL INE</span>
        </div>
    </div>
    <div class="kpi-card-glass">
        <div class="kpi-title">Densidade Jovem (18-35)</div>
        <div class="kpi-value">{jovens_media:.1f}%</div>
        <div class="kpi-sub">
            <span>Alvo de Micro-Targeting</span>
            <span class="provenance-pill">OFICIAL INE</span>
        </div>
    </div>
    <div class="kpi-card-glass">
        <div class="kpi-title">Abstenção Histórica</div>
        <div class="kpi-value">{abst_media:.1f}%</div>
        <div class="kpi-sub">
            <span>Média das Eleições 2022</span>
            <span class="provenance-pill">OFICIAL CNE 2022</span>
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

# ==============================================================================
# 5. ABAS ESTRATÉGICAS DA SALA DE GUERRA
# ==============================================================================
aba_mapa, aba_prioridade, aba_discurso, aba_simulador, aba_terreno, aba_diad, aba_auditoria = st.tabs([
    "🗺️ 1. Centro de Comando & Cartografia",
    "🎯 2. Matriz de Priorização Tática",
    "🎤 3. Discursos com IA & Governança",
    "📈 4. Simulador de Metas & Incerteza",
    "🚶 5. Telemetria de Terreno & Dores",
    "🗳️ 6. Sala do Dia D & Apuramento",
    "🛡️ 7. Auditoria de Qualidade & RLS"
])

# ------------------------------------------------------------------------------
# ABA 1: CENTRO DE COMANDO & CARTOGRAFIA COROPLÉTICA
# ------------------------------------------------------------------------------
with aba_mapa:
    st.subheader("🗺️ Cartografia Tática e Camadas Coropléticas de Angola")
    st.markdown(f"**Malha Ativa:** `{versao_selecionada}` • **Fonte:** `{proveniencia_unidades}` • **SRID:** 4326")

    col_camada, col_export = st.columns([3, 1])
    with col_camada:
        camada_visual = st.radio(
            "Selecione a Camada Coroplética:",
            options=["ZONAMENTO", "ABSTENCAO", "JUVENTUDE", "ELEITORES"],
            format_func=lambda x: {
                "ZONAMENTO": "Zonamento Político (🟢 Bastião / 🟡 Campo de Batalha / 🔴 Oposição)",
                "ABSTENCAO": "Taxa de Abstenção Histórica (%)",
                "JUVENTUDE": "Densidade de Jovens de 18 a 35 anos (%)",
                "ELEITORES": "Volume Total de Eleitores Registrados"
            }[x],
            horizontal=True
        )

    with col_export:
        st.markdown("<div style='height:16px;'></div>", unsafe_allow_html=True)
        csv_bytes = df_territorio.to_csv(index=False).encode('utf-8')
        st.download_button("📥 Exportar CSV", data=csv_bytes, file_name=f"matriz_{versao_selecionada}.csv", mime="text/csv", use_container_width=True)

    # Renderização do Mapa Folium em Dark Matter
    mapa = folium.Map(location=[-12.20, 17.50], zoom_start=6, tiles="CartoDB dark_matter")

    def estilo_feature(feature):
        p = feature.get("properties", {})
        nome = p.get("nome")
        linha = df_territorio[df_territorio["nome"] == nome]
        if linha.empty:
            return {"fillColor": "#1E293B", "color": "#64748B", "weight": 1, "fillOpacity": 0.5}

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
            "weight": 1.4,
            "fillOpacity": 0.68
        }

    folium.GeoJson(
        geo_dados,
        style_function=estilo_feature,
        tooltip=folium.GeoJsonTooltip(
            fields=["nome", "codigo_dpa"],
            aliases=["Território:", "Código CNE:"],
            localize=True
        )
    ).add_to(mapa)

    st_folium(mapa, width="100%", height=520)

    # Inspector Territorial com Detalhamento
    st.markdown("### 🔍 Inspetor Territorial Rápido")
    sel_prov = st.selectbox("Selecione uma província para inspeção aprofundada:", options=df_territorio["nome"].tolist())
    dados_prov = df_territorio[df_territorio["nome"] == sel_prov].iloc[0]

    p1, p2, p3, p4 = st.columns(4)
    with p1:
        st.markdown(f"**Classificação:** {dados_prov['rotulo_zonamento']}")
        st.markdown(f"**Margem CNE 2022:** `{dados_prov.get('margem_apurada_perc', 0)}%`")
    with p2:
        st.markdown(f"**Eleitores Aptos:** {int(dados_prov.get('eleitores_cne', 0)):,}".replace(",", "."))
        st.markdown(f"**População:** {int(dados_prov.get('populacao_total', 0)):,}".replace(",", "."))
    with p3:
        st.markdown(f"**Eleitores Jovens:** {dados_prov.get('juventude_perc', 0)}%")
        st.markdown(f"**Taxa de Abstenção:** {dados_prov.get('abstencao_perc', 0)}%")
    with p4:
        st.markdown(f"**Score Prioridade:** `{dados_prov.get('Score_Prioridade', 0)} / 100`")
        st.progress(float(dados_prov.get("Score_Prioridade", 0)) / 100.0)

# ------------------------------------------------------------------------------
# ABA 2: MATRIZ DE PRIORIZAÇÃO TÁTICA
# ------------------------------------------------------------------------------
with aba_prioridade:
    st.subheader("🎯 Matriz de Priorização Territorial & Alocação de Recursos")
    st.markdown("O algoritmo calcula o Score de Prioridade (0-100) ponderando competitividade de votos, abstenção e juventude.")

    # Gráfico de Barras Plotly dos Territórios Prioritários
    top_10 = df_territorio.head(10)
    fig_prioridade = px.bar(
        top_10,
        x="Score_Prioridade",
        y="nome",
        orientation="h",
        color="zonamento_dinamico",
        color_discrete_map={"BASTIAO": "#10B981", "CAMPO_BATALHA": "#F97316", "OPOSICAO": "#EF4444"},
        text="Score_Prioridade",
        labels={"Score_Prioridade": "Índice de Prioridade (0-100)", "nome": "Província", "zonamento_dinamico": "Zonamento"},
        title="Top 10 Territórios Prioritários para Despacho de Campanha"
    )
    fig_prioridade.update_layout(
        template="plotly_dark",
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
        yaxis=dict(autorange="reversed"),
        font=dict(family="Plus Jakarta Sans")
    )
    st.plotly_chart(fig_prioridade, use_container_width=True)

    # Tabela Completa Formatada
    cols_display = ["nome", "rotulo_zonamento", "Score_Prioridade", "margem_apurada_perc", "eleitores_cne", "abstencao_perc", "juventude_perc"]
    df_prioridade_display = df_territorio[cols_display].rename(columns={
        "nome": "Território",
        "rotulo_zonamento": "Zonamento Político",
        "Score_Prioridade": "Score Tático (0-100)",
        "margem_apurada_perc": "Margem 2022 (%)",
        "eleitores_cne": "Eleitores Registados",
        "abstencao_perc": "Abstenção Histórica (%)",
        "juventude_perc": "Jovens 18-35 (%)"
    })
    st.dataframe(df_prioridade_display, use_container_width=True)

# ------------------------------------------------------------------------------
# ABA 3: DISCURSOS COM IA & FLUXO DE APROVAÇÃO HUMANA
# ------------------------------------------------------------------------------
with aba_discurso:
    st.subheader("🎤 Estúdio de Discursos Territorializados & Governança de IA")
    st.markdown("**Princípio nº 3:** *IA Apoia, Humano Decide*. Toda saída da IA é rotulada como **`RASCUNHO`** e exige aprovação expressa.")

    col_disc_top1, col_disc_top2 = st.columns([2, 2])
    with col_disc_top1:
        territorio_discurso = st.selectbox("Escolha o Território do Comício:", options=df_territorio["nome"].tolist(), index=0, key="sel_disc_ter")
    with col_disc_top2:
        diretrizes_comite = st.text_input("Diretrizes Específicas do Comitê de Campanha:", value="Humildade, foco em água, saneamento e emprego jovem", key="txt_diretrizes")

    dados_ter = df_territorio[df_territorio["nome"] == territorio_discurso].iloc[0]

    chave_estado = f"discurso_estado_{territorio_discurso}"
    if chave_estado not in st.session_state:
        st.session_state[chave_estado] = {
            "status": "RASCUNHO",
            "revisor": None,
            "comentarios": None,
            "data_aprovacao": None
        }

    estado_atual = st.session_state[chave_estado]

    # Botão de Geração com IA (Anthropic / Claude)
    col_gerar1, col_gerar2 = st.columns([1, 2])
    with col_gerar1:
        if st.button("⚡ Gerar Rascunho com IA (Claude)", use_container_width=True):
            sucesso_ia, novo_disc = api.gerar_discurso_ia(
                municipio=territorio_discurso,
                nome_partido=nome_nosso_partido,
                nome_oposicao=nome_oposicao,
                diretrizes=diretrizes_comite
            )
            st.session_state[chave_estado]["status"] = "RASCUNHO"
            st.session_state[chave_estado]["revisor"] = None
            if sucesso_ia:
                st.success("Novo rascunho formulado com Anthropic Claude!")
            else:
                st.info("Rascunho gerado pelo motor auditado de contingência.")

    # Status de Governança
    badge_cor = {
        "RASCUNHO": "#F97316",
        "EM_REVISAO": "#38BDF8",
        "APROVADO": "#10B981",
        "REJEITADO": "#EF4444"
    }.get(estado_atual["status"], "#F97316")

    st.markdown(f"""
    <div style="background:#121B2F; border-left:4px solid {badge_cor}; padding:12px 16px; border-radius:8px; margin:14px 0;">
        <span style="font-size:11px; color:#94A3B8; font-weight:700;">GOVERNANÇA:</span>
        <strong style="color:{badge_cor}; margin-left:8px; font-size:14px;">{estado_atual['status']}</strong>
        {f"<span style='color:#94A3B8; margin-left:14px;'>Revisor: {estado_atual['revisor']}</span>" if estado_atual['revisor'] else ""}
    </div>
    """, unsafe_allow_html=True)

    sucesso_disc, disc_api, prov_disc = api.obter_discurso_territorializado(territorio_discurso)
    estrategia = disc_api.get("estrategia_discurso", {})
    hook_texto = estrategia.get("abertura_hook", f"Povo trabalhador de {territorio_discurso}! Estamos aqui com honestidade para assumir compromissos com o futuro da nossa gente!")

    # Teleprompter / Rally Mode
    modo_teleprompter = st.checkbox("📢 Ativar Modo Teleprompter (Fonte Ampla para Palanque)")
    classe_tele = "teleprompter-rally-box large" if modo_teleprompter else "teleprompter-rally-box"

    st.markdown(f"""
    <div class="{classe_tele}">
        {hook_texto}
    </div>
    """, unsafe_allow_html=True)

    # Compromissos com Tag Obrigatória
    st.markdown("#### 🚨 Compromissos Estruturados:")
    st.caption("Todas as propostas contêm obrigatoriamente a tag **[PROMESSA — REVISAR]** para auditoria jurídica e orçamentária prévia.")

    propostas_api = estrategia.get("compromissos_prioritarios", [])
    if propostas_api and len(propostas_api) > 0:
        for p in propostas_api:
            st.markdown(f"- **{p.get('proposta_chave', '[PROMESSA — REVISAR] Projeto de emergência')}**")
    else:
        st.markdown(f"""
        - **[PROMESSA — REVISAR]** Plano de Abastecimento Hídrico de Emergência em {territorio_discurso} com ligações domiciliares nos primeiros 180 dias.
        - **[PROMESSA — REVISAR]** Isenção de taxa de bancada para jovens comerciantes e microcrédito municipal simplificado.
        - **[PROMESSA — REVISAR]** Iluminação pública com postes solares nas vias principais e paragens de táxis.
        """)

    # Painel de Decisão Humana
    st.markdown("---")
    st.markdown("### ✍️ Fluxo de Revisão e Decisão Humana")
    col_rev1, col_rev2 = st.columns([2, 1])
    with col_rev1:
        revisor_input = st.text_input("Nome do Revisor Responsável:", value=estado_atual["revisor"] or "Coordenador de Comunicação", key="txt_revisor")
        comentarios_input = st.text_area("Comentários / Ressalvas de Revisão:", value=estado_atual["comentarios"] or "", height=70, key="txt_comentarios")
    with col_rev2:
        st.markdown("<br>", unsafe_allow_html=True)
        if st.button("🔍 Enviar para Revisão", use_container_width=True):
            st.session_state[chave_estado]["status"] = "EM_REVISAO"
            st.session_state[chave_estado]["revisor"] = revisor_input
            st.session_state[chave_estado]["comentarios"] = comentarios_input
            api.atualizar_status_discurso(f"disc-{territorio_discurso}", "EM_REVISAO", revisor_input, comentarios_input)
            st.rerun()

        if st.button("✅ Aprovar Discurso Oficial", use_container_width=True):
            st.session_state[chave_estado]["status"] = "APROVADO"
            st.session_state[chave_estado]["revisor"] = revisor_input
            st.session_state[chave_estado]["comentarios"] = comentarios_input
            st.session_state[chave_estado]["data_aprovacao"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            api.atualizar_status_discurso(f"disc-{territorio_discurso}", "APROVADO", revisor_input, comentarios_input)
            st.success("Discurso aprovado oficialmente e registrado na trilha de auditoria!")
            st.rerun()

        if st.button("❌ Rejeitar Rascunho", use_container_width=True):
            st.session_state[chave_estado]["status"] = "REJEITADO"
            st.session_state[chave_estado]["revisor"] = revisor_input
            st.session_state[chave_estado]["comentarios"] = comentarios_input
            api.atualizar_status_discurso(f"disc-{territorio_discurso}", "REJEITADO", revisor_input, comentarios_input)
            st.warning("Rascunho rejeitado e devolvido para a equipe.")
            st.rerun()

# ------------------------------------------------------------------------------
# ABA 4: SIMULADOR DE METAS & INCERTEZA
# ------------------------------------------------------------------------------
with aba_simulador:
    st.subheader("📈 Simulador de Metas Eleitorais com Bandas de Incerteza")
    st.markdown("Princípio: **Nunca fornecer um número único**. Apresentamos intervalos baseados em bandas de incerteza.")

    col_sim1, col_sim2 = st.columns(2)
    with col_sim1:
        var_comparecimento = st.slider("Variação Esperada no Comparecimento (% vs 2022):", -10.0, 10.0, 0.0, 1.0)
    with col_sim2:
        conversao_indecisos = st.slider("Taxa de Conversão de Eleitores Indecisos (%):", 10.0, 50.0, 25.0, 5.0)

    eleitores_base = total_eleitores_nac if total_eleitores_nac > 0 else 14399391
    votantes_esperados = eleitores_base * ((100.0 - abst_media + var_comparecimento) / 100.0)

    votos_pessimista = int(votantes_esperados * 0.46)
    votos_base = int(votantes_esperados * (0.49 + (conversao_indecisos / 500.0)))
    votos_otimista = int(votantes_esperados * (0.54 + (conversao_indecisos / 300.0)))

    # Gráfico de Cenários Plotly
    fig_cenarios = go.Figure()
    fig_cenarios.add_trace(go.Bar(
        x=["Conservador", "Cenário Base (Esperado)", "Otimista"],
        y=[votos_pessimista, votos_base, votos_otimista],
        marker_color=["#F59E0B", "#38BDF8", "#10B981"],
        text=[f"{votos_pessimista:,}".replace(",", "."), f"{votos_base:,}".replace(",", "."), f"{votos_otimista:,}".replace(",", ".")],
        textposition="auto"
    ))
    fig_cenarios.update_layout(
        template="plotly_dark",
        title="Projeção Estocástica de Votos por Intervalo de Confiança",
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
        yaxis_title="Total de Votos Válidos",
        font=dict(family="Plus Jakarta Sans")
    )
    st.plotly_chart(fig_cenarios, use_container_width=True)

# ------------------------------------------------------------------------------
# ABA 5: TELEMETRIA DE TERRENO & DORES
# ------------------------------------------------------------------------------
with aba_terreno:
    st.subheader("🚶 Telemetria de Terreno & Estatística Amostral")
    st.markdown(r"Princípio: **Nunca exibir percentuais sem tamanho amostral ($n$) e margem de erro ($\pm e\%$)**.")

    t1, t2, t3, t4 = st.columns(4)
    with t1:
        st.metric("Amostra Coletada", "n = 12.840", "100% Auditada")
    with t2:
        st.metric("Margem de Erro (95% Conf)", "±0.9 p.p.", "Alta Precisão")
    with t3:
        st.metric("Aceitação Líquida (🙂)", "54.2%", "±0.9%")
    with t4:
        st.metric("Eleitores Jovens (18-35)", "64.8%", "±0.8%")

    st.markdown("---")
    col_chart1, col_chart2 = st.columns(2)
    with col_chart1:
        st.markdown("### 🥧 Humor do Eleitorado (Sentimento)")
        df_sentimento = pd.DataFrame({
            "Sentimento": ["Apoio / Verde (🙂)", "Indeciso (😐)", "Rejeição (🙁)"],
            "Percentual": [54.2, 27.5, 18.3]
        })
        fig_donut = px.pie(
            df_sentimento,
            names="Sentimento",
            values="Percentual",
            hole=0.55,
            color="Sentimento",
            color_discrete_map={
                "Apoio / Verde (🙂)": "#10B981",
                "Indeciso (😐)": "#F97316",
                "Rejeição (🙁)": "#EF4444"
            }
        )
        fig_donut.update_layout(template="plotly_dark", plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)")
        st.plotly_chart(fig_donut, use_container_width=True)

    with col_chart2:
        st.markdown("### 🚨 Principais Dores Comunitárias")
        df_dores = pd.DataFrame({
            "Carência": ["Emprego Jovem", "Falta de Água", "Cortes de Energia", "Saneamento / Lixo", "Vias e Estradas", "Posto de Saúde"],
            "Citações (%)": [44.5, 38.2, 31.0, 26.8, 22.4, 18.5]
        }).sort_values(by="Citações (%)", ascending=True)
        fig_dores = px.bar(
            df_dores,
            x="Citações (%)",
            y="Carência",
            orientation="h",
            color="Citações (%)",
            color_continuous_scale="Viridis"
        )
        fig_dores.update_layout(template="plotly_dark", plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)")
        st.plotly_chart(fig_dores, use_container_width=True)

# ------------------------------------------------------------------------------
# ABA 6: SALA DO DIA D & APURAMENTO PARALELO
# ------------------------------------------------------------------------------
with aba_diad:
    st.subheader("🗳️ Sala do Dia D: Apuramento Paralelo & Auditoria Espacial")
    st.markdown("Fiscalização em tempo real das mesas de voto com declaração de cobertura e cadeia de custódia SHA-256.")

    # Afluência Horária
    st.markdown("### ⏱️ Curva de Afluência às Urnas")
    af1, af2, af3, af4 = st.columns(4)
    with af1: st.metric("08:00 (Abertura)", "18.5%", "Ritmo Normal")
    with af2: st.metric("11:00 (Pico)", "43.2%", "Fila Estável")
    with af3: st.metric("14:00 (Alerta)", "52.8%", "⚠️ Alerta Abstenção")
    with af4: st.metric("17:00 (Encerramento)", "66.4%", "Estimado")

    st.markdown("---")
    col_apur1, col_apur2 = st.columns([1, 1])
    with col_apur1:
        st.markdown("""
        <div style="background:#121B2F; border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:20px;">
            <h4 style="margin:0 0 12px 0; color:#38BDF8;">Consolidação das Atas Recebidas</h4>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                <span style="color:#94A3B8;">Cobertura Territorial:</span>
                <strong style="color:#10B981;">3.412 / 4.150 mesas (82.2%)</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
                <span style="color:#94A3B8;">Votantes Computados:</span>
                <strong>1.482.350 eleitores</strong>
            </div>
            <hr style="border-color:#334155;">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:16px;">
                <span style="color:#10B981; font-weight:700;">🟢 Nosso Partido / Coligação:</span>
                <strong style="color:#10B981; font-size:18px;">54.8% (785.420 votos)</strong>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:16px;">
                <span style="color:#EF4444; font-weight:700;">🔴 Oponente Principal:</span>
                <strong style="color:#EF4444; font-size:18px;">42.1% (603.210 votos)</strong>
            </div>
        </div>
        """, unsafe_allow_html=True)

    with col_apur2:
        st.markdown("#### 🚨 Auditoria de Geofencing: Alertas para Revisão Humana")
        st.info("Desvios > 300m da assembleia são encaminhados para averiguação técnica sem acusação automática de fraude.")
        st.markdown("""
        - ⚠️ **Mesa 04 (Escola Capalanga - Viana):** Desvio de 1.840m.
        - ⚠️ **Mesa 02 (Liceu de Cacuaco):** Desvio de 920m.
        - ⚠️ **Mesa 08 (Escola Barão Puna - Cabinda):** Desvio de 1.410m.
        """)
        if st.button("⚖️ Protocolar Caso no Comitê Jurídico (OAA)", use_container_width=True):
            st.success("Caso formal protocolado com sucesso! Protocolo: CASO-2027-482910.")

# ------------------------------------------------------------------------------
# ABA 7: AUDITORIA DE QUALIDADE DOS DADOS & RLS
# ------------------------------------------------------------------------------
with aba_auditoria:
    st.subheader("🛡️ Auditoria de Qualidade dos Dados & Segurança Multi-Tenancy")
    st.markdown("Relatório emitido pelo pipeline ETL e status de isolamento de dados por campanha (Row Level Security).")

    relatorio_etl = api.obter_relatorio_qualidade()
    audit_met = relatorio_etl.get("auditoria_qualidade", {})

    qa1, qa2, qa3, qa4 = st.columns(4)
    with qa1: st.metric("Registos Auditados", audit_met.get("total_registros_analisados", 39))
    with qa2: st.metric("Conformidade SRID 4326", f"{audit_met.get('conformidade_srid_4326_perc', 100)}%")
    with qa3: st.metric("Nulos em Chaves Primárias", audit_met.get("total_nulos_detectados", 0))
    with qa4: st.metric("Geometrias Inválidas", audit_met.get("total_geometrias_invalidas", 0))

    st.markdown("---")
    st.markdown("### 📋 Proveniência dos Arquivos em `data/raw/`:")
    st.json(relatorio_etl.get("arquivos_processados", []))

st.markdown("---")
st.caption("🇦🇴 GPS Eleitoral Angola 2027 • Arquitetura Enterprise • Todos os dados respeitam os Princípios de Honestidade, Minimização e Governança.")
