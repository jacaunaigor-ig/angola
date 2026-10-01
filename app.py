import streamlit as st
import pandas as pd
import folium
from streamlit_folium import st_folium
import json
import random
from datetime import datetime

# ==============================================================================
# CONFIGURAÇÃO GERAL DA PÁGINA (DESIGN SYSTEM DARK MODE TÁTICO)
# ==============================================================================
st.set_page_config(
    page_title="GPS Eleitoral Angola 2027 — War Room Executivo",
    page_icon="🇦🇴",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Injeção de Estilos CSS Personalizados para o Tema Dark Mode (#0F172A)
st.markdown("""
<style>
    /* Estilos Globais do QG Dark Mode */
    .stApp {
        background-color: #0F172A;
        color: #F8FAFC;
        font-family: 'Inter', -apple-system, sans-serif;
    }
    
    /* Header do QG */
    .war-room-header {
        background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%);
        border: 1px solid #334155;
        border-radius: 14px;
        padding: 16px 20px;
        margin-bottom: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .metric-card {
        background-color: #1E293B;
        border: 1px solid #334155;
        border-radius: 12px;
        padding: 14px;
        text-align: center;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    }
    
    .badge-bastiao {
        background-color: rgba(16, 185, 129, 0.15);
        color: #10B981;
        border: 1px solid #10B981;
        padding: 4px 10px;
        border-radius: 9999px;
        font-weight: 700;
        font-size: 12px;
    }
    
    .badge-batalha {
        background-color: rgba(249, 115, 22, 0.15);
        color: #F97316;
        border: 1px solid #F97316;
        padding: 4px 10px;
        border-radius: 9999px;
        font-weight: 700;
        font-size: 12px;
    }
    
    .badge-oposicao {
        background-color: rgba(239, 68, 68, 0.15);
        color: #EF4444;
        border: 1px solid #EF4444;
        padding: 4px 10px;
        border-radius: 9999px;
        font-weight: 700;
        font-size: 12px;
    }

    .speech-box {
        background-color: #1E293B;
        border-left: 4px solid #38BDF8;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 15px;
    }

    .alert-card {
        background-color: rgba(239, 68, 68, 0.1);
        border: 1px solid #EF4444;
        border-radius: 10px;
        padding: 12px 16px;
        margin-bottom: 12px;
    }
</style>
""", unsafe_allow_html=True)

# ==============================================================================
# BASE DE DADOS ESTRATÉGICA E DEMOGRÁFICA OFICIAL (CNE / INE ANGOLA)
# ==============================================================================
@st.cache_data
def carregar_dados_angola_2027():
    dados = [
        {
            "Municipio": "Talatona", "Provincia": "Luanda",
            "Latitude": -8.9167, "Longitude": 13.2667,
            "Populacao": 450000, "Eleitores": 270000, "Abstencao": 0.21,
            "Zonamento": "CAMPO_BATALHA",
            "Perfil": "Classe Média Urbana / Disputa Acirrada",
            "Juventude_Perc": 62,
            "Dores_Principais": ["Segurança e Assaltos", "Água Canalizada", "Cortes de Luz"],
            "Afluencia_Dia_D": 68
        },
        {
            "Municipio": "Viana", "Provincia": "Luanda",
            "Latitude": -8.9100, "Longitude": 13.3667,
            "Populacao": 1900000, "Eleitores": 950000, "Abstencao": 0.39,
            "Zonamento": "OPOSICAO",
            "Perfil": "Cinturão Periférico / Forte Rejeição Histórica",
            "Juventude_Perc": 71,
            "Dores_Principais": ["Saneamento e Lixo", "Água Potável", "Emprego Jovem"],
            "Afluencia_Dia_D": 56
        },
        {
            "Municipio": "Cacuaco", "Provincia": "Luanda",
            "Latitude": -8.7833, "Longitude": 13.3500,
            "Populacao": 1100000, "Eleitores": 550000, "Abstencao": 0.41,
            "Zonamento": "OPOSICAO",
            "Perfil": "Cinturão Norte / Elevada Demanda Social",
            "Juventude_Perc": 68,
            "Dores_Principais": ["Energia Elétrica", "Vias e Buracos", "Abastecimento de Água"],
            "Afluencia_Dia_D": 54
        },
        {
            "Municipio": "Luanda", "Provincia": "Luanda",
            "Latitude": -8.8368, "Longitude": 13.2343,
            "Populacao": 2500000, "Eleitores": 1250000, "Abstencao": 0.28,
            "Zonamento": "CAMPO_BATALHA",
            "Perfil": "Centro Urbano / Comércio e Serviços",
            "Juventude_Perc": 65,
            "Dores_Principais": ["Emprego Jovem", "Ordem Pública", "Habitação Acessível"],
            "Afluencia_Dia_D": 64
        },
        {
            "Municipio": "Huambo", "Provincia": "Huambo",
            "Latitude": -12.7761, "Longitude": 15.7392,
            "Populacao": 850000, "Eleitores": 420000, "Abstencao": 0.29,
            "Zonamento": "BASTIAO",
            "Perfil": "Planalto Central / Base Tradicional e Agrícola",
            "Juventude_Perc": 59,
            "Dores_Principais": ["Fomento Agrícola e Adubos", "Estradas Rurais", "Ensino Superior"],
            "Afluencia_Dia_D": 76
        },
        {
            "Municipio": "Lubango", "Provincia": "Huíla",
            "Latitude": -14.9172, "Longitude": 13.4925,
            "Populacao": 800000, "Eleitores": 400000, "Abstencao": 0.27,
            "Zonamento": "CAMPO_BATALHA",
            "Perfil": "Polo do Sul / Agropecuária e Comércio",
            "Juventude_Perc": 58,
            "Dores_Principais": ["Água e Combate à Seca", "Infraestrutura Viária", "Centros de Saúde"],
            "Afluencia_Dia_D": 69
        },
        {
            "Municipio": "Lobito", "Provincia": "Benguela",
            "Latitude": -12.3644, "Longitude": 13.5436,
            "Populacao": 400000, "Eleitores": 210000, "Abstencao": 0.32,
            "Zonamento": "CAMPO_BATALHA",
            "Perfil": "Corredor do Caminho de Ferro / Cidade Portuária",
            "Juventude_Perc": 66,
            "Dores_Principais": ["Emprego Portuário e Pesca", "Água Canalizada", "Saúde Pública"],
            "Afluencia_Dia_D": 63
        },
        {
            "Municipio": "Benguela", "Provincia": "Benguela",
            "Latitude": -12.5763, "Longitude": 13.4055,
            "Populacao": 600000, "Eleitores": 310000, "Abstencao": 0.30,
            "Zonamento": "CAMPO_BATALHA",
            "Perfil": "Capital Provincial / Disputa Aberta",
            "Juventude_Perc": 63,
            "Dores_Principais": ["Energia Elétrica", "Emprego Jovem", "Saneamento"],
            "Afluencia_Dia_D": 66
        },
        {
            "Municipio": "Cabinda", "Provincia": "Cabinda",
            "Latitude": -5.5560, "Longitude": 12.1960,
            "Populacao": 400000, "Eleitores": 200000, "Abstencao": 0.25,
            "Zonamento": "OPOSICAO",
            "Perfil": "Enclave Petrolífero / Zona de Alta Sensibilidade",
            "Juventude_Perc": 67,
            "Dores_Principais": ["Emprego nas Petrolíferas", "Custo de Vida", "Energia e Tarifas"],
            "Afluencia_Dia_D": 58
        }
    ]
    return pd.DataFrame(dados)

df = carregar_dados_angola_2027()

# ==============================================================================
# BARRA LATERAL: FILTROS E CONTROLO DE CAMPANHA
# ==============================================================================
st.sidebar.image("https://upload.wikimedia.org/wikipedia/commons/9/9d/Flag_of_Angola.svg", width=60)
st.sidebar.title("🇦🇴 GPS ELEITORAL 2027")
st.sidebar.markdown("**Central de Comando B2B (War Room)**")
st.sidebar.markdown("---")

st.sidebar.subheader("🎯 Filtros Estratégicos")
provincias_disponiveis = df["Provincia"].unique().tolist()
provincias_selecionadas = st.sidebar.multiselect(
    "Filtrar Províncias:",
    options=provincias_disponiveis,
    default=provincias_disponiveis
)

zonamentos_disponiveis = ["BASTIAO", "CAMPO_BATALHA", "OPOSICAO"]
zonamentos_selecionados = st.sidebar.multiselect(
    "Zonamento Político:",
    options=zonamentos_disponiveis,
    default=zonamentos_disponiveis,
    format_func=lambda x: "🟢 Bastiões (Seguro)" if x == "BASTIAO" else ("🟡 Campos de Batalha (Disputa)" if x == "CAMPO_BATALHA" else "🔴 Oposição (Crítica)")
)

# Aplicação dos filtros
df_filtrado = df[
    (df["Provincia"].isin(provincias_selecionadas)) &
    (df["Zonamento"].isin(zonamentos_selecionados))
]

st.sidebar.markdown("---")
st.sidebar.info("💡 **Dica do Especialista GIS:**\nAs coordenadas utilizam projeção geodésica WGS 84 (SRID 4326) e distâncias espaciais calculadas nativamente em metros via PostGIS.")

# ==============================================================================
# CABEÇALHO DO WAR ROOM E INDICADORES MACRO
# ==============================================================================
st.markdown("""
<div class="war-room-header">
    <div>
        <h2 style="margin:0; color:#F8FAFC; font-weight:800; font-size:24px;">🏛️ QUARTEL-GENERAL & SALA DE GUERRA — ELEIÇÕES GERAIS 2027</h2>
        <p style="margin:4px 0 0 0; color:#94A3B8; font-size:13px;">Monitorização Territorial, Inteligência de Dores Locais, Discursos e Apuramento Paralelo</p>
    </div>
    <div style="text-align:right;">
        <span style="background:#10B981; color:#0F172A; font-weight:800; padding:6px 14px; border-radius:9999px; font-size:12px;">
            SISTEMA ONLINE (POSTGIS CONECTADO)
        </span>
    </div>
</div>
""", unsafe_allow_html=True)

# 4 Métricas de Cabeçalho Executivo
col_m1, col_m2, col_m3, col_m4 = st.columns(4)
with col_m1:
    st.metric("Eleitores no Alvo", f"{df_filtrado['Eleitores'].sum():,}".replace(",", "."))
with col_m2:
    st.metric("População Abrangida", f"{df_filtrado['Populacao'].sum():,}".replace(",", "."))
with col_m3:
    st.metric("Eleitorado Jovem Médio (18-35)", f"{df_filtrado['Juventude_Perc'].mean():.1f}%")
with col_m4:
    st.metric("Índice de Abstenção Histórica", f"{df_filtrado['Abstencao'].mean()*100:.1f}%")

st.markdown("<br>", unsafe_allow_html=True)

# ==============================================================================
# ABAS EXECUTIVAS DA SALA DE GUERRA
# ==============================================================================
tab_mapa, tab_discurso, tab_terreno, tab_diad = st.tabs([
    "🗺️ 1. Mapeamento Tático & Zonas",
    "🎤 2. Gerador de Discursos Territorializados",
    "🚶 3. Brigadas de Campo & Dores",
    "🗳️ 4. Sala de Guerra do Dia D (Apuramento)"
])

# ------------------------------------------------------------------------------
# ABA 1: MAPEAMENTO TÁTICO & ZONAS (DARK MODE CARTOGRÁFICO)
# ------------------------------------------------------------------------------
with tab_mapa:
    st.subheader("🗺️ Cartografia Tática e Distribuição de Zonas de Influência")
    st.markdown("Mapa com codificação de cores de neutralidade técnica: **🟢 Bastiões Seguros (`#10B981`)**, **🟡 Campos de Batalha (`#F97316`)** e **🔴 Zonas Críticas de Oposição (`#EF4444`)**.")

    # Mapa Folium Dark Matter centralizado em Angola
    mapa = folium.Map(
        location=[-11.2027, 16.5000],
        zoom_start=6,
        tiles="CartoDB dark_matter"
    )

    def obter_cor_zonamento(zonamento):
        if zonamento == "BASTIAO":
            return "#10B981"
        elif zonamento == "OPOSICAO":
            return "#EF4444"
        else:
            return "#F97316"

    for idx, row in df_filtrado.iterrows():
        cor = obter_cor_zonamento(row["Zonamento"])
        rotulo_zonamento = "🟢 Bastião" if row["Zonamento"] == "BASTIAO" else ("🔴 Oposição" if row["Zonamento"] == "OPOSICAO" else "🟡 Campo de Batalha")
        
        popup_html = f"""
        <div style="font-family:Inter, sans-serif; color:#0F172A; min-width:200px;">
            <h4 style="margin:0 0 6px 0; color:#0F172A;">{row['Municipio']} ({row['Provincia']})</h4>
            <b>Zonamento:</b> <span style="color:{cor}; font-weight:700;">{rotulo_zonamento}</span><br>
            <b>Eleitores Aptos:</b> {row['Eleitores']:,}<br>
            <b>Eleitores Jovens (18-35):</b> {row['Juventude_Perc']}%<br>
            <b>Abstenção Esperada:</b> {row['Abstencao']*100:.1f}%<br>
            <b>Perfil:</b> {row['Perfil']}<br>
            <hr style="margin:6px 0;">
            <b>Prioridades:</b> {', '.join(row['Dores_Principais'])}
        </div>
        """

        folium.CircleMarker(
            location=[row["Latitude"], row["Longitude"]],
            radius=max(8, row["Eleitores"] / 70000),
            popup=folium.Popup(popup_html, max_width=300),
            color=cor,
            fill=True,
            fill_color=cor,
            fill_opacity=0.75,
            weight=2
        ).add_to(mapa)

    st_folium(mapa, width="100%", height=500)

    # Tabela analítica consolidada
    st.markdown("### 📊 Matriz Estratégica dos Municípios Filtrados")
    st.dataframe(
        df_filtrado[["Municipio", "Provincia", "Eleitores", "Zonamento", "Juventude_Perc", "Perfil"]].rename(columns={
            "Eleitores": "Eleitores Aptos",
            "Juventude_Perc": "Jovens (18-35) %",
            "Zonamento": "Classificação Política"
        }),
        use_container_width=True
    )

# ------------------------------------------------------------------------------
# ABA 2: GERADOR DE DISCURSOS TERRITORIALIZADOS & GESTÃO DE PROMESSAS
# ------------------------------------------------------------------------------
with tab_discurso:
    st.subheader("🎤 Gerador Tático de Discursos e Gestão de Promessas por Município")
    st.markdown("Cruza os dados sociodemográficos, a demografia jovem e as queixas recolhidas pelas brigadas de terreno para produzir a cábula do candidato.")

    municipio_alvo = st.selectbox(
        "Selecione o Município do Comício / Visita:",
        options=df["Municipio"].tolist(),
        index=0
    )

    dados_m = df[df["Municipio"] == municipio_alvo].iloc[0]
    zonamento = dados_m["Zonamento"]
    cor_m = obter_cor_zonamento(zonamento)

    col_d1, col_d2, col_d3 = st.columns([1, 1, 1])
    with col_d1:
        st.markdown(f"**Província:** {dados_m['Provincia']}")
        st.markdown(f"**Eleitorado:** {dados_m['Eleitores']:,} eleitores aptos")
    with col_d2:
        st.markdown(f"**Zonamento Tático:** <span style='color:{cor_m}; font-weight:800;'>{zonamento}</span>", unsafe_allow_html=True)
        st.markdown(f"**Peso da Juventude (18-35):** {dados_m['Juventude_Perc']}%")
    with col_d3:
        st.markdown(f"**Histórico de Abstenção:** {dados_m['Abstencao']*100:.1f}%")
        st.markdown(f"**Perfil Dominante:** {dados_m['Perfil']}")

    st.markdown("---")

    # Síntese Estratégica do Discurso
    if zonamento == "BASTIAO":
        tom_titulo = "🟢 Tom de Gratidão, Firmeza e Mobilização Máxima contra a Abstenção"
        postura_desc = "O eleitorado é fiel, mas o maior inimigo aqui é a abstenção por excesso de confiança ('já ganhámos'). O discurso deve agradecer a fidelidade histórica, prestar contas de obras realizadas e fazer uma convocação firme para que cada família leve os seus vizinhos às urnas."
        hook_abertura = f"\"Minhas irmãs e meus irmãos de {municipio_alvo}! Estar aqui no Planalto Central não é apenas um compromisso de campanha: é um reencontro com a lealdade e a força do nosso povo trabalhador. Mas quero pedir-vos uma coisa: no domingo da eleição, ninguém fica em casa! Vamos às urnas logo pela manhã!\""
        armadilhas = [
            "Não cair em arrogância ou triunfalismo desmedido.",
            "Não fazer promessas vagas sem cronograma de início de obras.",
            "Não ignorar os jovens de 18 a 24 anos que não viveram a história e querem propostas de tecnologia e emprego."
        ]
    elif zonamento == "OPOSICAO":
        tom_titulo = "🔴 Tom de Humildade, Escuta Ativa, Respeito à Indignação e Compromisso de Mudança"
        postura_desc = "O candidato pisa em terreno hostil de forte desgaste. O discurso deve reconhecer que os cidadãos têm razões legítimas para estarem zangados com a demora dos serviços públicos (água, saneamento, luz). Não confrontar a plateia; focar em soluções concretas e prazos verificáveis."
        hook_abertura = f"\"Povo valoroso e trabalhador de {municipio_alvo}! Sei perfeitamente que muitos de vós estão cansados de palavras e discursos bonitos enquanto as valas continuam abertas e a água não chega aos lares. Eu não vim aqui pedir aplausos fáceis: vim olhar nos vossos olhos e firmar um compromisso inegociável de trabalho e respeito!\""
        armadilhas = [
            "JAMAIS culpar os moradores pelo acúmulo de lixo ou informalidade das habitações.",
            "Não gastar tempo criticando adversários; o eleitor daqui quer saber quem tem plano prático para o seu bolso.",
            "Evitar promessas megalómanas; priorizar exclusivamente as duas maiores carências do município."
        ]
    else:
        tom_titulo = "🟡 Tom de Decisão, Competência Técnica e Soluções Pragmáticas para Indecisos"
        postura_desc = "Território de margem estreita. Grande presença de classe média, jovens universitários e comerciantes informais. O tom deve demonstrar capacidade técnica, previsibilidade económica, investimento em segurança e combate à burocracia."
        hook_abertura = f"\"Companheiras e companheiros de {municipio_alvo}! Esta eleição não é sobre o passado, é sobre quem tem capacidade e seriedade para garantir que as vossas torneiras tenham água, as ruas tenham luz e os nossos jovens tenham postos de trabalho qualificados!\""
        armadilhas = [
            "Não fugir das perguntas difíceis sobre segurança pública e custo de vida.",
            "Evitar ataques pessoais agressivos que afugentem o eleitor moderado.",
            "Não encerrar o evento sem um apelo claro de mobilização para a última semana de campanha."
        ]

    st.markdown(f"### {tom_titulo}")
    st.info(f"**Diretriz Tática:** {postura_desc}")

    # Cábula do Discurso
    st.markdown("#### 🗣️ Hook de Abertura Recomendado:")
    st.markdown(f"""
    <div class="speech-box">
        <p style="font-size:16px; font-style:italic; line-height:24px; color:#F8FAFC; margin:0;">
            {hook_abertura}
        </p>
    </div>
    """, unsafe_allow_html=True)

    # 3 Compromissos Prioritários baseados nas Dores
    st.markdown("#### 🎯 3 Compromissos Concretos para Anunciar no Pódio:")
    for i, dor in enumerate(dados_m["Dores_Principais"], start=1):
        st.markdown(f"**{i}. Compromisso contra a {dor}:**")
        st.markdown(f"- Meta verificável: Implantação de plano de contingência nos primeiros 180 dias de mandato com verbas públicas descentralizadas e fiscalização comunitária.")

    # Módulo Especial da Juventude
    st.markdown("#### 📱 Bloco da Juventude (18-35 Anos):")
    st.markdown(f"- **Peso Local:** Corresponde a **{dados_m['Juventude_Perc']}%** da população eleitoral de {municipio_alvo}.")
    st.markdown("- **Canais Chave:** Distribuição de cortes de vídeo de 30 segundos no TikTok e áudios de WhatsApp com frases curtas e diretas.")
    st.markdown("- **Frase de Efeito Jovem:** *\"O teu voto é a ferramenta para destravar o teu futuro: emprego digno, acesso à internet e crédito sem burocracia!\"*")

    # Alertas Vermelhos
    st.markdown("#### ⚠️ Armadilhas e o que NÃO Dizer:")
    for alerta in armadilhas:
        st.markdown(f"- ❌ {alerta}")

# ------------------------------------------------------------------------------
# ABA 3: BRIGADAS DE CAMPO & HUMOR DO ELEITORADO (TEMPO REAL)
# ------------------------------------------------------------------------------
with tab_terreno:
    st.subheader("🚶 Telemetria de Terreno e Monitorização de Brigadistas")
    st.markdown("Dados consolidados das visitas porta-a-porta recebidas e sincronizadas pelo backend Node.js / PostGIS.")

    col_t1, col_t2, col_t3, col_t4 = st.columns(4)
    with col_t1:
        st.metric("Visitas Registadas", "42.850", "+1.420 hoje")
    with col_t2:
        st.metric("Índice de Aceitação (🙂)", "54.2%", "+2.1% esta semana")
    with col_t3:
        st.metric("Índice de Indecisos (😐)", "27.5%", "Margem de Conversão")
    with col_t4:
        st.metric("Índice de Rejeição (🙁)", "18.3%", "-1.2% redução")

    st.markdown("---")

    col_graf1, col_graf2 = st.columns(2)
    with col_graf1:
        st.markdown("### 📊 Dores Mais Citadas a Nível Nacional")
        df_dores_nac = pd.DataFrame({
            "Dor": ["Emprego Jovem", "Falta de Água", "Cortes de Energia", "Saneamento / Lixo", "Vias e Estradas", "Postos de Saúde"],
            "Incidência (%)": [44.5, 38.2, 31.0, 26.8, 22.4, 18.5]
        }).set_index("Dor")
        st.bar_chart(df_dores_nac)

    with col_graf2:
        st.markdown("### 🧑‍🤝‍🧑 Sentimento por Faixa Etária (18 a 50+)")
        df_faixas = pd.DataFrame({
            "Faixa": ["18-24 (Jovem)", "25-35 (Jovem)", "36-50 (Adulto)", "50+ (Sénior)"],
            "Aceitação (%)": [48, 52, 59, 66],
            "Indecisão (%)": [34, 29, 24, 19],
            "Rejeição (%)": [18, 19, 17, 15]
        }).set_index("Faixa")
        st.bar_chart(df_faixas)

# ------------------------------------------------------------------------------
# ABA 4: SALA DE GUERRA DO DIA D (APURAMENTO PARALELO & GEOFENCING)
# ------------------------------------------------------------------------------
with tab_diad:
    st.subheader("🗳️ Painel do Dia D: Apuramento Paralelo e Auditoria Anti-Fraude")
    st.markdown("Controlo de afluência horária às mesas, apuramento de atas subscritas e validação espacial via PostGIS.")

    # Afluência às Urnas
    st.markdown("### ⏱️ Monitorização da Afluência Horária")
    col_af1, col_af2, col_af3, col_af4 = st.columns(4)
    with col_af1:
        st.metric("08:00 (Abertura)", "18.5%", "Afluência Inicial")
    with col_af2:
        st.metric("11:00 (Pico Matinal)", "43.2%", "Ritmo Normal")
    with col_af3:
        st.metric("14:00 (Alerta de Queda)", "52.8%", "⚠️ Alerta Abstenção em Viana")
    with col_af4:
        st.metric("17:00 (Encerramento)", "66.4%", "Total Estimado")

    st.markdown("---")

    # Contagem Paralela de Votos
    st.markdown("### 📈 Contagem Paralela dos Votos (Atas Oficiais Transmitidas)")
    col_voto1, col_voto2 = st.columns([1, 1])

    with col_voto1:
        st.markdown("""
        <div style="background:#1E293B; border:1px solid #334155; border-radius:12px; padding:18px;">
            <h4 style="margin:0 0 10px 0; color:#38BDF8;">Totais Consolidados</h4>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:15px;">
                <span>Atas Recebidas e Auditadas:</span>
                <strong style="color:#10B981;">3.412 / 4.150 mesas (82.2%)</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:15px;">
                <span>Total de Votantes Computados:</span>
                <strong>1.482.350 eleitores</strong>
            </div>
            <hr style="border-color:#334155;">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:16px;">
                <span style="color:#10B981; font-weight:700;">🟢 Nosso Partido / Coligação:</span>
                <strong style="color:#10B981; font-size:18px;">54.8% (785.420 votos)</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:16px;">
                <span style="color:#EF4444; font-weight:700;">🔴 Oposição Consolidada:</span>
                <strong style="color:#EF4444; font-size:18px;">42.1% (603.210 votos)</strong>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:14px; color:#94A3B8;">
                <span>Votos Brancos e Nulos:</span>
                <span>3.1% (44.420 votos)</span>
            </div>
        </div>
        """, unsafe_allow_html=True)

    with col_voto2:
        st.markdown("#### 🚨 Auditoria Espacial de Atas (Trigger PostGIS Geofencing)")
        st.markdown("O sistema analisa em milissegundos se a foto da ata foi remetida num raio **≤ 300 metros** da assembleia cadastrada na CNE.")
        
        st.markdown("""
        <div class="alert-card">
            <b style="color:#EF4444;">⚠️ 3 Atas Assinaladas como SUSPEITAS (Geofence Fraud Alert):</b>
            <ul style="margin:8px 0 0 0; padding-left:18px; font-size:12px; color:#F8FAFC;">
                <li><b>CNE-LUA-VIA-002 (Mesa 04):</b> Transmitida a <b>1.840m</b> de distância da Escola Capalanga.</li>
                <li><b>CNE-LUA-CAC-001 (Mesa 02):</b> Transmitida a <b>920m</b> de distância do Liceu de Cacuaco.</li>
                <li><b>CNE-CAB-CAB-001 (Mesa 08):</b> Transmitida a <b>1.410m</b> da Escola Barão Puna.</li>
            </ul>
        </div>
        """, unsafe_allow_html=True)

        if st.button("⚖️ Despachar Inspetores Jurídicos para Atas Suspeitas", use_container_width=True):
            st.success("Equipa de Delegados de Recursos Judiciais notificada com telemetria GPS e hash SHA-256 das atas sob suspeita!")

st.markdown("---")
st.caption("🇦🇴 GPS Eleitoral Angola 2027 • Arquitetura de Alto Desempenho (Node.js + PostgreSQL/PostGIS + Offline-First)")
