import os
import io
import json
import html
import textwrap
import streamlit as st
import pandas as pd
import folium
from streamlit_folium import st_folium
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime
from typing import Optional

from api_client import ApiClient
from war_room.anomalias_campo import (
    analisar_integridade_campo,
    visitas_demonstracao_risco,
)
from war_room.planos_comerciais import (
    PLANOS,
    MUNICIPIOS_VENDAVEIS,
    calcular_orcamento,
    filtrar_geojson,
    formatar_aoa,
    matriz_comparativa,
    obter_plano,
)


def fmt_int_ao(valor) -> str:
    """Formata inteiros no padrão de milhares usado em Angola (ponto como separador)."""
    try:
        return f"{int(valor):,}".replace(",", ".")
    except (TypeError, ValueError):
        return "—"


def to_float(*candidatos, default=0.0) -> float:
    for valor in candidatos:
        if valor is None:
            continue
        try:
            if isinstance(valor, str) and valor.strip() == "":
                continue
            numero = float(valor)
            if pd.isna(numero):
                continue
            return numero
        except (TypeError, ValueError):
            continue
    return default


def margem_erro_amostral(n: int, universo: int = 1_000_000) -> Optional[float]:
    if n < 30:
        return None
    z = 1.96
    p = 0.5
    n = max(n, 1)
    universo = max(universo, n + 1)
    fpcf = (universo - n) / (universo - 1)
    return round(z * ((p * (1 - p) / n) * max(0.0, fpcf)) ** 0.5 * 100, 1)


def render_html(fragment: str) -> None:
    """Injeta HTML sem indentação, para o Markdown do Streamlit não tratar como bloco de código."""
    st.markdown(textwrap.dedent(fragment).strip(), unsafe_allow_html=True)


api = ApiClient()

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

    .header-clock {
        font-size: 10px;
        color: #64748B;
        margin-top: 6px;
        font-family: "JetBrains Mono", ui-monospace, monospace;
    }

    @media (max-width: 1100px) {
        .kpi-container { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 640px) {
        .kpi-container { grid-template-columns: 1fr; }
        .command-header-card { flex-direction: column; align-items: flex-start; gap: 12px; }
    }
</style>
""", unsafe_allow_html=True)

# ==============================================================================
# 2. BARRA LATERAL: NEUTRALIDADE DA FERRAMENTA & CONFIGURAÇÃO DA CAMPANHA
# ==============================================================================
st.sidebar.image("https://upload.wikimedia.org/wikipedia/commons/9/9d/Flag_of_Angola.svg", width=54)
st.sidebar.title("🇦🇴 GPS ELEITORAL 2027")
st.sidebar.markdown("**Central de Inteligência Territorial B2B**")
st.sidebar.markdown("---")

# Toggle de Modo Demonstração
modo_demo_forcado = st.sidebar.checkbox("🔒 Forçar Modo Demonstração", value=False, help="Utiliza dados auditados locais isolados de data/raw/")

# Contrato comercial: o War Room só mostra o âmbito pago
st.sidebar.subheader("💼 Plano Contratado")
plano_codigo = st.sidebar.selectbox(
    "SKU da campanha:",
    options=["MUNICIPAL", "PROVINCIAL", "NACIONAL"],
    index=2,
    format_func=lambda c: PLANOS[c]["nome"],
)
plano_ativo = obter_plano(plano_codigo)
territorios_mun = [f"{m['municipio']} · {m['provincia']}" for m in MUNICIPIOS_VENDAVEIS]
if plano_codigo == "MUNICIPAL":
    escolha_mun = st.sidebar.selectbox("Município contratado:", options=territorios_mun, index=0)
    territorio_contrato = escolha_mun.split(" · ")[0]
    provincia_contrato = escolha_mun.split(" · ")[1]
elif plano_codigo == "PROVINCIAL":
    provincias_venda = sorted({m["provincia"] for m in MUNICIPIOS_VENDAVEIS})
    provincia_contrato = st.sidebar.selectbox("Província contratada:", options=provincias_venda, index=0)
    territorio_contrato = provincia_contrato
else:
    provincia_contrato = None
    territorio_contrato = None

st.sidebar.caption(plano_ativo["tagline"])
st.sidebar.markdown(f"**Tabela:** `{formatar_aoa(plano_ativo['preco_tabela_aoa'])}` / ciclo 2027")

api.definir_contrato(plano_codigo, territorio_contrato)

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
opcoes_malha = ["DPA_2024_21P"] if not plano_ativo["funcionalidades"]["malha_dupla_dpa"] else ["DPA_2016_18P", "DPA_2024_21P"]
versao_selecionada = st.sidebar.selectbox(
    "Versão da Malha Territorial:",
    options=opcoes_malha,
    format_func=lambda x: "DPA 2016 (18 Províncias - Base Histórica 2022)" if x == "DPA_2016_18P" else "Nova DPA 2024 (21 Províncias - Alvo 2027)"
)
if not plano_ativo["funcionalidades"]["malha_dupla_dpa"]:
    st.sidebar.caption("Malha histórica DPA 2016 disponível a partir do Plano Provincial.")

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

postgis_rotulo = html.escape(str(health_data.get("postgis") or "PostGIS"))
if len(postgis_rotulo) > 48:
    postgis_rotulo = "PostGIS ligado"
agora_label = html.escape(datetime.now().strftime("%d/%m/%Y • %H:%M"))

status_html = (
    f'<span class="status-badge-online"><span class="live-dot" style="background:#10B981;"></span> API ONLINE ({postgis_rotulo})</span>'
    if modo_ativo == "ONLINE"
    else '<span class="status-badge-demo"><span class="live-dot" style="background:#F97316;"></span> MODO DEMONSTRAÇÃO (DADOS AUDITADOS)</span>'
)

render_html(f"""
<div class="command-header-card">
<div>
<div style="font-size:11px; font-weight:800; color:#38BDF8; letter-spacing:1.2px; text-transform:uppercase; margin-bottom:4px;">🇦🇴 REPÚBLICA DE ANGOLA • PLEITO PRESIDENCIAL E LEGISLATIVO 2027</div>
<h2 style="margin:0; font-size:24px; font-weight:800; color:#F8FAFC;">SALA DE GUERRA &amp; WAR ROOM DE MARKETING POLÍTICO</h2>
<div style="font-size:12px; color:#94A3B8; margin-top:4px;">Inteligência Territorial • Demografia da Juventude • Discursos com IA • Monitoramento do Dia D</div>
    <div>
        <div style="font-size:11px; font-weight:800; color:#38BDF8; letter-spacing:1.2px; text-transform:uppercase; margin-bottom:4px;">
            🇦🇴 REPÚBLICA DE ANGOLA • PLEITO PRESIDENCIAL E LEGISLATIVO 2027
        </div>
        <h2 style="margin:0; font-size:24px; font-weight:800; color:#F8FAFC;">
            SALA DE GUERRA & WAR ROOM DE MARKETING POLÍTICO
        </h2>
        <div style="font-size:12px; color:#94A3B8; margin-top:4px;">
            {plano_ativo["nome"]} • Âmbito: {territorio_contrato or "Nacional (21 províncias)"} • {plano_ativo["tagline"]}
        </div>
    </div>
    <div style="text-align:right;">
        {status_html}
        <div style="margin-top:8px; font-size:11px; font-weight:800; color:{plano_ativo["cor"]}; letter-spacing:0.6px;">
            SKU {plano_codigo} · {formatar_aoa(plano_ativo["preco_tabela_aoa"])}
        </div>
        <div style="font-size:10px; color:#64748B; margin-top:6px; font-family:'JetBrains Mono';">
            DATA: {datetime.now().strftime('%d/%m/%Y • %H:%M')}
        </div>
    </div>
</div>
<div style="text-align:right;">
{status_html}
<div class="header-clock">DATA: {agora_label}</div>
</div>
</div>
""")

# ==============================================================================
# 4. CARGA DOS DADOS TERRITORIAIS OFICIAIS
# ==============================================================================
sucesso_api_unidades, geo_dados, proveniencia_unidades = api.obter_unidades_territoriais(versao_selecionada, formato="geojson")
geo_dados = filtrar_geojson(geo_dados, plano_codigo, territorio_contrato)

if not geo_dados or "features" not in geo_dados or not geo_dados.get("features"):
    st.error("⚠️ Sem dados territoriais disponíveis para a versão selecionada. Verifique o pipeline ETL.")
    st.stop()

# Montagem do DataFrame Analítico a partir do GeoJSON
linhas = []
for feat in geo_dados["features"]:
    prop = dict(feat.get("properties") or {})
    eleitores = to_float(prop.get("eleitores_cne"), prop.get("eleitores"), prop.get("eleitores_registados_cne"))
    populacao = to_float(prop.get("populacao_total"), prop.get("populacao"))
    juventude = to_float(prop.get("juventude_perc"), default=0.0)
    abstencao = to_float(prop.get("abstencao_perc"), default=0.0)
    margem = to_float(prop.get("margem_apurada_perc"), prop.get("margem_perc"))

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

    linhas.append({
        **prop,
        "eleitores_cne": eleitores,
        "populacao_total": populacao,
        "juventude_perc": juventude,
        "abstencao_perc": abstencao,
        "margem_apurada_perc": margem,
        "zonamento_dinamico": zon,
        "cor_zonamento": cor_zon,
        "rotulo_zonamento": rotulo_zon,
        "nome": prop.get("nome") or prop.get("codigo") or "Território",
    })

df_territorio = pd.DataFrame(linhas)
if df_territorio.empty:
    st.error("⚠️ A malha territorial não contém features utilizáveis.")
    st.stop()

for col in ["eleitores_cne", "populacao_total", "juventude_perc", "abstencao_perc", "margem_apurada_perc"]:
    df_territorio[col] = pd.to_numeric(df_territorio[col], errors="coerce").fillna(0.0)

max_eleitores = float(df_territorio["eleitores_cne"].max() or 1.0)

def calcular_score_prioridade(row):
    margem = abs(float(row.get("margem_apurada_perc") or 0.0))
    s_disputa = max(0.0, 100.0 - (margem * 2.0))
    s_volume = (float(row.get("eleitores_cne") or 0.0) / max(max_eleitores, 1.0)) * 100.0
    s_abst = float(row.get("abstencao_perc") or 0.0)
    s_jovem = float(row.get("juventude_perc") or 0.0)

    soma_pesos = peso_disputa + peso_volume + peso_abstencao + peso_jovens
    score = (s_disputa * peso_disputa + s_volume * peso_volume + s_abst * peso_abstencao + s_jovem * peso_jovens) / max(soma_pesos, 1)
    return round(score, 1)

df_territorio["Score_Prioridade"] = df_territorio.apply(calcular_score_prioridade, axis=1)
df_territorio = df_territorio.sort_values(by="Score_Prioridade", ascending=False).reset_index(drop=True)

total_eleitores_nac = int(df_territorio["eleitores_cne"].sum())
total_pop_nac = int(df_territorio["populacao_total"].sum())
peso_eleitoral = df_territorio["eleitores_cne"].clip(lower=0)
if peso_eleitoral.sum() > 0:
    abst_media = float((df_territorio["abstencao_perc"] * peso_eleitoral).sum() / peso_eleitoral.sum())
    jovens_media = float((df_territorio["juventude_perc"] * peso_eleitoral).sum() / peso_eleitoral.sum())
else:
    abst_media = float(df_territorio["abstencao_perc"].mean() or 0.0)
    jovens_media = float(df_territorio["juventude_perc"].mean() or 0.0)

render_html(f"""
<div class="kpi-container">
<div class="kpi-card-glass">
<div class="kpi-title">Eleitorado Registado</div>
<div class="kpi-value">{fmt_int_ao(total_eleitores_nac)}</div>
<div class="kpi-sub"><span>Base Eleitoral CNE</span><span class="provenance-pill">OFICIAL CNE</span></div>
</div>
<div class="kpi-card-glass">
<div class="kpi-title">População Abrangida</div>
<div class="kpi-value">{fmt_int_ao(total_pop_nac)}</div>
<div class="kpi-sub"><span>Projeções Demográficas</span><span class="provenance-pill">OFICIAL INE</span></div>
</div>
<div class="kpi-card-glass">
<div class="kpi-title">Densidade Jovem (18-35)</div>
<div class="kpi-value">{jovens_media:.1f}%</div>
<div class="kpi-sub"><span>Média ponderada pelo eleitorado</span><span class="provenance-pill">OFICIAL INE</span></div>
</div>
<div class="kpi-card-glass">
<div class="kpi-title">Abstenção Histórica</div>
<div class="kpi-value">{abst_media:.1f}%</div>
<div class="kpi-sub"><span>Média ponderada 2022</span><span class="provenance-pill">OFICIAL CNE 2022</span></div>
</div>
</div>
""")

# ==============================================================================
# 5. ABAS ESTRATÉGICAS DA SALA DE GUERRA
# ==============================================================================
aba_comercial, aba_mapa, aba_prioridade, aba_discurso, aba_simulador, aba_terreno, aba_diad, aba_auditoria = st.tabs([
    "💼 0. Planos & Contratação",
    "🗺️ 1. Centro de Comando & Cartografia",
    "🎯 2. Matriz de Priorização Tática",
    "🎤 3. Discursos com IA & Governança",
    "📈 4. Simulador de Metas & Incerteza",
    "🚶 5. Telemetria de Terreno & Dores",
    "🗳️ 6. Sala do Dia D & Apuramento",
    "🛡️ 7. Auditoria de Qualidade & RLS"
])

with aba_comercial:
    st.subheader("💼 Pacotes vendáveis — Municipal, Provincial e Nacional")
    st.markdown(
        "Três SKUs para o ciclo **2027**. O War Room, o telemóvel e a API passam a operar "
        "apenas no território e nas funcionalidades do contrato. Preços em **AOA**, de tabela — a proposta formal prevalece."
    )
    cols_sku = st.columns(3)
    for col, codigo in zip(cols_sku, ["MUNICIPAL", "PROVINCIAL", "NACIONAL"]):
        p = PLANOS[codigo]
        activo = codigo == plano_codigo
        with col:
            st.markdown(
                f"""
                <div style="background:#121B2F;border:1px solid {p['cor'] if activo else 'rgba(255,255,255,0.08)'};border-radius:16px;padding:16px;min-height:280px;">
                    <div style="color:{p['cor']};font-size:11px;font-weight:800;letter-spacing:1px;">SKU {p['codigo']}</div>
                    <h3 style="margin:6px 0 8px 0;color:#F8FAFC;">{p['nome']}</h3>
                    <div style="color:#94A3B8;font-size:13px;min-height:56px;">{p['tagline']}</div>
                    <div style="font-size:22px;font-weight:800;color:#F8FAFC;margin:12px 0 4px 0;">{formatar_aoa(p['preco_tabela_aoa'])}</div>
                    <div style="color:#64748B;font-size:11px;">ciclo eleitoral 2027 • tabela</div>
                    <ul style="color:#CBD5E1;font-size:12px;padding-left:16px;margin-top:12px;">
                        <li>{p['limites']['brigadistas']} brigadistas</li>
                        <li>{p['limites']['contas_war_room']} contas War Room</li>
                        <li>{'Dia D incluído' if p['funcionalidades']['dia_d'] else 'Dia D: upgrade Provincial'}</li>
                    </ul>
                </div>
                """,
                unsafe_allow_html=True,
            )
    st.markdown("### Comparativo de capacidades")
    st.dataframe(pd.DataFrame(matriz_comparativa()), use_container_width=True, hide_index=True)

    st.markdown("### Pedir proposta formal")
    orc = calcular_orcamento(plano_codigo, territorio_contrato, plano_ativo["limites"]["brigadistas"])
    st.info(f"Âmbito seleccionado: **{plano_ativo['nome']}** · **{territorio_contrato or 'Nacional'}** · {orc.get('total_formatado', '—')}")
    col_p1, col_p2 = st.columns(2)
    with col_p1:
        org = st.text_input("Organização / Partido / Coligação")
        contacto = st.text_input("Nome do decisor")
    with col_p2:
        tel = st.text_input("Telefone")
        mail = st.text_input("E-mail institucional")
    notas_prop = st.text_area("Notas para a proposta (municípios extra, Dia D, HQ)", height=70)
    if st.button("📨 Gerar protocolo de proposta", use_container_width=True):
        ok_prop, detalhe_prop = api.pedir_proposta({
            "organizacao": org,
            "contacto": contacto,
            "telefone": tel,
            "email": mail,
            "plano": plano_codigo,
            "territorio": territorio_contrato,
            "brigadistas_contratados": plano_ativo["limites"]["brigadistas"],
            "notas": notas_prop,
        })
        if ok_prop:
            protocolo = (detalhe_prop.get("pedido") or {}).get("protocolo") or "registado"
            st.success(f"Proposta {protocolo} criada. A minuta segue com preço de tabela e âmbito territorial.")
        else:
            st.warning((detalhe_prop or {}).get("erro") or "API indisponível. O pedido ficou só nesta sessão — envie quando a API estiver no ar.")

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

    # Renderização do Mapa Folium com OpenStreetMap Oficial
    mapa = folium.Map(
        location=[-12.20, 17.50],
        zoom_start=6,
        tiles="OpenStreetMap"
    )

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
            "color": "#0F172A",
            "weight": 2.0,
            "fillOpacity": 0.58
        }

    sample_props = (geo_dados.get("features") or [{}])[0].get("properties") or {}
    campos_tooltip = [c for c in ["nome", "codigo_dpa", "codigo_oficial", "codigo"] if c in sample_props]
    aliases_tooltip = {
        "nome": "Território:",
        "codigo_dpa": "Código CNE:",
        "codigo_oficial": "Código oficial:",
        "codigo": "Código:",
    }

    folium.GeoJson(
        geo_dados,
        style_function=estilo_feature,
        tooltip=folium.GeoJsonTooltip(
            fields=campos_tooltip or ["nome"],
            aliases=[aliases_tooltip.get(c, c) for c in (campos_tooltip or ["nome"])],
            localize=True
        ) if campos_tooltip else None
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

    ok_resumo, resumo_terreno, prov_terreno = api.obter_resumo_nacional()
    painel = resumo_terreno.get("painel_nacional") or {}
    ranking_dores = resumo_terreno.get("ranking_nacional_dores") or []
    n_amostra = int(painel.get("total_visitas") or 0)
    aceitacao = float(painel.get("indice_aceitacao") or 0)
    rejeicao = float(painel.get("indice_rejeicao") or 0)
    indecisos = float(painel.get("indice_indecisos") or 0)
    jovens_perc = float(painel.get("peso_juventude") or 0)
    me = margem_erro_amostral(n_amostra, max(total_eleitores_nac, 1))

    st.caption(f"Proveniência: `{prov_terreno}`")

    if n_amostra == 0:
        st.info("Ainda não há visitas sincronizadas. A telemetria só aparece com amostra real — números fictícios foram removidos.")
    else:
        t1, t2, t3, t4 = st.columns(4)
        with t1:
            st.metric("Amostra Coletada", f"n = {fmt_int_ao(n_amostra)}")
        with t2:
            st.metric("Margem de Erro (95%)", "n < 30 — indicativo" if me is None else f"±{me} p.p.")
        with t3:
            st.metric("Aceitação (🙂)", f"{aceitacao:.1f}%", None if me is None else f"±{me} p.p.")
        with t4:
            st.metric("Eleitores Jovens (18-35)", f"{jovens_perc:.1f}%")

        st.markdown("---")
        col_chart1, col_chart2 = st.columns(2)
        with col_chart1:
            st.markdown("### 🥧 Humor do Eleitorado (Sentimento)")
            df_sentimento = pd.DataFrame({
                "Sentimento": ["Apoio / Verde (🙂)", "Indeciso (😐)", "Rejeição (🙁)"],
                "Percentual": [aceitacao, indecisos, rejeicao]
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
            if ranking_dores:
                df_dores = pd.DataFrame(ranking_dores).rename(columns={"dor": "Carência", "percentual": "Citações (%)"})
                if "Citações (%)" not in df_dores.columns and "frequencia" in df_dores.columns:
                    total_freq = df_dores["frequencia"].sum() or 1
                    df_dores["Citações (%)"] = (df_dores["frequencia"] / total_freq) * 100
                df_dores = df_dores.sort_values(by="Citações (%)", ascending=True)
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
            else:
                st.warning("Sem dores comunitárias registadas neste lote.")

    st.markdown("---")
    st.markdown("### ⚠️ Mesa de Risco / Atenção — Anomalias de Campo")
    st.caption("Rajadas impossíveis e coordenadas fora do polígono municipal (Shapely). A invalidação não apaga a trilha de auditoria.")

    CAMPANHA_ANALISE = "a0000000-0000-0000-0000-000000000001"
    ok_visitas, visitas_campo = api.listar_visitas(CAMPANHA_ANALISE, limite=800)
    origem_anomalias = "OFICIAL (API)" if ok_visitas and visitas_campo else "SIMULADO (LOTE DE DEMONSTRAÇÃO)"
    if not visitas_campo:
        visitas_campo = visitas_demonstracao_risco()

    col_limiar, col_janela = st.columns(2)
    with col_limiar:
        limiar_rajada = st.number_input("Limiar de formulários (X):", min_value=5, max_value=200, value=50, step=5)
    with col_janela:
        janela_rajada = st.number_input("Janela temporal (minutos):", min_value=1, max_value=60, value=5, step=1)

    diagnostico = analisar_integridade_campo(
        visitas_campo,
        geojson_malha=geo_dados,
        limiar=int(limiar_rajada),
        janela_minutos=int(janela_rajada),
    )
    st.caption(f"Proveniência da análise: `{origem_anomalias}` • Alertas: **{diagnostico['total_alertas']}**")

    if "lotes_invalidados" not in st.session_state:
        st.session_state.lotes_invalidados = []

    if not diagnostico["alertas"]:
        st.success("Nenhuma anomalia espacial ou de ritmo detectada neste lote.")
    else:
        linhas_alerta = []
        for alerta in diagnostico["alertas"]:
            linhas_alerta.append({
                "Severidade": alerta.get("severidade"),
                "Tipo": alerta.get("tipo"),
                "Ativista": alerta.get("ativista_nome") or alerta.get("ativista_id"),
                "Qtd / Lote": alerta.get("quantidade") or 1,
                "Descrição": alerta.get("descricao"),
                "UUIDs": ", ".join((alerta.get("uuids") or [])[:4]) + (
                    "…" if len(alerta.get("uuids") or []) > 4 else ""
                ),
            })
        st.dataframe(pd.DataFrame(linhas_alerta), use_container_width=True, hide_index=True)

        opcoes_lote = [
            f"{idx + 1}. {a.get('tipo')} — {a.get('ativista_nome') or a.get('ativista_id')} ({a.get('quantidade') or 1} registos)"
            for idx, a in enumerate(diagnostico["alertas"])
        ]
        lote_escolhido = st.selectbox("Seleccione o lote suspeito:", options=opcoes_lote)
        indice_lote = opcoes_lote.index(lote_escolhido)
        alerta_sel = diagnostico["alertas"][indice_lote]
        uuids_lote = alerta_sel.get("uuids") or []

        if not plano_ativo["funcionalidades"]["invalidar_lote"]:
            st.info("A invalidação de lote é capacidade do Plano Provincial e do Nacional / HQ.")
        elif st.button("🚫 Invalidar lote suspeito com um clique", use_container_width=True):
            ok_inv, detalhe_inv = api.invalidar_lote_visitas(
                uuids_lote,
                motivo=f"ANOMALIA_{alerta_sel.get('tipo')}",
                responsavel="coordenacao_war_room",
            )
            st.session_state.lotes_invalidados.append({
                "tipo": alerta_sel.get("tipo"),
                "uuids": uuids_lote,
                "quando": datetime.now().isoformat(timespec="seconds"),
                "api": ok_inv,
                "detalhe": detalhe_inv,
            })
            if ok_inv:
                st.success(detalhe_inv)
            else:
                st.warning(detalhe_inv + " O pedido ficou registado localmente na sessão da coordenação.")

        if st.session_state.lotes_invalidados:
            st.markdown("#### Histórico de invalidações desta sessão")
            st.dataframe(pd.DataFrame(st.session_state.lotes_invalidados), use_container_width=True, hide_index=True)

# ------------------------------------------------------------------------------
# ABA 6: SALA DO DIA D & APURAMENTO PARALELO
# ------------------------------------------------------------------------------
with aba_diad:
    st.subheader("🗳️ Sala do Dia D: Apuramento Paralelo & Auditoria Espacial")
    if not plano_ativo["funcionalidades"]["dia_d"]:
        st.warning(
            "O **Plano Municipal** não inclui apuramento do Dia D. "
            "Faça upgrade para o **Plano Provincial** (uma província) ou **Nacional / HQ**."
        )
        st.caption("Esta porta está fechada de propósito: é o SKU que se vende à direcção provincial.")
    else:
        st.markdown("Fiscalização das mesas com declaração de cobertura e cadeia de custódia SHA-256. Sem atas, não há projeção.")

    if not plano_ativo["funcionalidades"]["dia_d"]:
        ok_apur, apur, prov_apur = False, {}, "BLOQUEADO_PLANO"
    else:
        ok_apur, apur, prov_apur = api.obter_apuramento_paralelo()
    if not plano_ativo["funcionalidades"]["dia_d"]:
        cobertura = {}
        votos = {}
        auditoria = {}
        mesas_rec = mesas_esp = votantes = 0
        cob_perc = 0.0
        nosso = {}
        oponente = {}
        atas_alerta = []
    else:
        cobertura = apur.get("cobertura_apuracao") or {}
    votos = apur.get("contagem_votos_validos") or {}
    auditoria = apur.get("auditoria_integridade") or {}
    mesas_rec = int(cobertura.get("mesas_recebidas") or 0)
    mesas_esp = int(cobertura.get("mesas_esperadas") or 0)
    cob_perc = float(cobertura.get("cobertura_perc") or 0)
    votantes = int(cobertura.get("total_votantes_computados") or 0)
    nosso = votos.get("nosso_partido") or {}
    oponente = votos.get("oposicao") or {}
    atas_alerta = auditoria.get("atas_para_revisao_humana") or []

    if not plano_ativo["funcionalidades"]["dia_d"]:
        pass
    else:
        st.caption(f"Proveniência: `{prov_apur}` • Incerteza: `{cobertura.get('grau_incerteza', 'INDETERMINADO')}`")

    if not plano_ativo["funcionalidades"]["dia_d"]:
        pass
    elif mesas_rec == 0:
        st.info("Nenhuma ata submetida. Afluência e percentagens só são apresentadas após recepção de atas reais.")
    else:
        c1, c2, c3, c4 = st.columns(4)
        with c1:
            st.metric("Mesas recebidas", fmt_int_ao(mesas_rec), f"{cob_perc:.1f}% cobertura")
        with c2:
            st.metric("Mesas esperadas", fmt_int_ao(mesas_esp))
        with c3:
            st.metric("Votantes computados", fmt_int_ao(votantes))
        with c4:
            st.metric("Atas em revisão", str(auditoria.get("total_atas_alerta_revisao") or 0))
        if cobertura.get("aviso_metodologico"):
            st.warning(cobertura["aviso_metodologico"])

    if not plano_ativo["funcionalidades"]["dia_d"]:
        col_apur1 = col_apur2 = None
    else:
        st.markdown("---")
    if plano_ativo["funcionalidades"]["dia_d"]:
        col_apur1, col_apur2 = st.columns([1, 1])
    if col_apur1 is not None:
      with col_apur1:
        st.markdown(f"""
        <div style="background:#121B2F; border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:20px;">
            <h4 style="margin:0 0 12px 0; color:#38BDF8;">Consolidação das Atas Recebidas</h4>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                <span style="color:#94A3B8;">Cobertura Territorial:</span>
                <strong style="color:#10B981;">{fmt_int_ao(mesas_rec)} / {fmt_int_ao(mesas_esp)} mesas ({cob_perc:.1f}%)</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
                <span style="color:#94A3B8;">Votantes Computados:</span>
                <strong>{fmt_int_ao(votantes)} eleitores</strong>
            </div>
            <hr style="border-color:#334155;">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:16px;">
                <span style="color:#10B981; font-weight:700;">🟢 {nome_nosso_partido}:</span>
                <strong style="color:#10B981; font-size:18px;">{float(nosso.get('percentual') or 0):.1f}% ({fmt_int_ao(nosso.get('votos') or 0)} votos)</strong>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:16px;">
                <span style="color:#EF4444; font-weight:700;">🔴 {nome_oposicao}:</span>
                <strong style="color:#EF4444; font-size:18px;">{float(oponente.get('percentual') or 0):.1f}% ({fmt_int_ao(oponente.get('votos') or 0)} votos)</strong>
            </div>
        </div>
        """, unsafe_allow_html=True)

    if col_apur2 is not None:
      with col_apur2:
        st.markdown("#### 🚨 Auditoria de Geofencing: Alertas para Revisão Humana")
        st.info("Desvios > 300m da assembleia são encaminhados para averiguação técnica sem acusação automática de fraude.")
        if atas_alerta:
            for ata in atas_alerta:
                dist = ata.get("distancia_assembleia_metros") or "?"
                nome_ass = ata.get("assembleia_nome") or ata.get("codigo_cne") or ata.get("id")
                st.markdown(f"- ⚠️ **Mesa {ata.get('mesa_numero', '—')} ({nome_ass}):** desvio de {dist}m.")
        else:
            st.success("Nenhum alerta de geofence neste momento.")
        if st.button("⚖️ Protocolar Caso no Comitê Jurídico (OAA)", use_container_width=True):
            ok_caso, detalhe = api.criar_caso_juridico(
                titulo="Alerta de geofence para revisão humana",
                descricao_fato="Pedido de protocolação a partir do War Room. Distâncias acima de 300 m exigem averiguação técnica, sem presunção de fraude.",
                tipo_irregularidade="GEOFENCE_EXCEDIDO",
            )
            if ok_caso:
                st.success(detalhe)
            else:
                st.warning(detalhe)

# ------------------------------------------------------------------------------
# ABA 7: AUDITORIA DE QUALIDADE DOS DADOS & RLS
# ------------------------------------------------------------------------------
with aba_auditoria:
    st.subheader("🛡️ Auditoria de Qualidade dos Dados & Segurança Multi-Tenancy")
    st.markdown("Relatório emitido pelo pipeline ETL e status de isolamento de dados por campanha (Row Level Security).")

    relatorio_etl = api.obter_relatorio_qualidade()
    audit_met = relatorio_etl.get("auditoria_qualidade", {})

    qa1, qa2, qa3, qa4 = st.columns(4)
    with qa1: st.metric("Registos Auditados", audit_met.get("total_registros_analisados", 0))
    with qa2: st.metric("Conformidade SRID 4326", f"{audit_met.get('conformidade_srid_4326_perc', 0)}%")
    with qa3: st.metric("Nulos em Chaves Primárias", audit_met.get("total_nulos_detectados", 0))
    with qa4: st.metric("Geometrias Inválidas", audit_met.get("total_geometrias_invalidas", 0))

    st.markdown("---")
    st.markdown("### 📋 Proveniência dos Arquivos em `data/raw/`:")
    st.json(relatorio_etl.get("arquivos_processados", []))

st.markdown("---")
st.caption("🇦🇴 GPS Eleitoral Angola 2027 • Arquitetura Enterprise • Todos os dados respeitam os Princípios de Honestidade, Minimização e Governança.")
