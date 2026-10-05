from datetime import date, timedelta

import pandas as pd
import plotly.express as px
import streamlit as st


st.set_page_config(page_title="Painéis Executivos", page_icon="📊", layout="wide")

CAMPAIGNS = ["Demonstração 2027"]
TERRITORIES = ["Todas", "Luanda", "Huambo", "Benguela"]
START_DATE = date.today() - timedelta(days=29)


@st.cache_data
def build_demo_data() -> pd.DataFrame:
    rows = []
    territories = TERRITORIES[1:]
    for day_number in range(30):
        day = START_DATE + timedelta(days=day_number)
        for territory_index, territory in enumerate(territories):
            baseline = 100 + territory_index * 27 + day_number * 2
            spend = 18000 + territory_index * 3500 + (day_number % 7) * 900
            clicks = 420 + territory_index * 55 + day_number * 5
            leads = 32 + territory_index * 5 + day_number % 8
            rows.append(
                {
                    "date": day,
                    "campaign": CAMPAIGNS[0],
                    "territory": territory,
                    "buzz": baseline + (day_number % 5) * 13,
                    "sentiment": min(78, 48 + territory_index * 5 + day_number % 17),
                    "intention": min(68, 36 + territory_index * 4 + day_number % 14),
                    "undecided": max(8, 31 - territory_index * 3 - day_number % 12),
                    "spend": spend,
                    "clicks": clicks,
                    "leads": leads,
                    "conversions": round(leads * 0.28),
                    "budget": 1_800_000,
                }
            )
    return pd.DataFrame(rows)


def money_ao(value: float) -> str:
    return f"{value:,.0f} Kz".replace(",", ".")


st.title("War Room — Painéis Executivos")
st.caption("Indicadores demonstrativos para validação da interface. Não representam dados de campanha reais.")
st.warning(
    "MODO DEMONSTRAÇÃO — dados sintéticos e reproduzíveis. Substitua a função de leitura pela API/consulta "
    "analítica antes de usar estes indicadores para decisões."
)

with st.sidebar:
    st.header("Filtros executivos")
    selected_campaign = st.selectbox("Campanha", CAMPAIGNS)
    selected_territory = st.selectbox("Zona eleitoral", TERRITORIES)
    date_range = st.date_input(
        "Período",
        value=(START_DATE, date.today()),
        min_value=START_DATE,
        max_value=date.today(),
    )

data = build_demo_data()
if isinstance(date_range, tuple) and len(date_range) == 2:
    start, end = date_range
else:
    start = end = date_range

filtered = data[
    (data["campaign"] == selected_campaign)
    & (data["date"] >= start)
    & (data["date"] <= end)
]
if selected_territory != "Todas":
    filtered = filtered[filtered["territory"] == selected_territory]
if filtered.empty:
    st.info("Não há linhas para os filtros selecionados.")
    st.stop()

social, intention, paid, finance = st.tabs(
    ["Redes sociais", "Intenção de voto", "Tráfego pago", "Finanças"]
)

with social:
    st.subheader("Redes sociais — buzz e sentimento")
    first, last = filtered.sort_values("date").iloc[0], filtered.sort_values("date").iloc[-1]
    a, b, c = st.columns(3)
    a.metric("Buzz no período", f"{int(filtered['buzz'].sum()):,}".replace(",", "."))
    b.metric("Sentimento positivo", f"{filtered['sentiment'].mean():.1f}%")
    c.metric("Variação do buzz", f"{(last['buzz'] / first['buzz'] - 1) * 100:+.1f}%")
    by_day = filtered.groupby("date", as_index=False).agg(
        buzz=("buzz", "sum"), sentimento=("sentiment", "mean")
    )
    col1, col2 = st.columns(2)
    with col1:
        st.plotly_chart(px.line(by_day, x="date", y="buzz", title="Volume de menções"), width="stretch")
    with col2:
        st.plotly_chart(px.line(by_day, x="date", y="sentimento", title="Índice de sentimento (%)"), width="stretch")

with intention:
    st.subheader("Intenção de voto e regiões indecisas")
    territory_data = filtered.groupby("territory", as_index=False).agg(
        intencao=("intention", "mean"), indecisos=("undecided", "mean")
    )
    with st.container(horizontal=True):
        st.metric("Intenção média (indicativa)", f"{filtered['intention'].mean():.1f}%", border=True)
        st.metric("Indecisos médios", f"{filtered['undecided'].mean():.1f}%", border=True)
    left, right = st.columns(2)
    with left:
        st.plotly_chart(
            px.bar(territory_data, x="territory", y="intencao", title="Intenção por território"),
            width="stretch",
        )
    with right:
        st.plotly_chart(
            px.bar(
                territory_data.sort_values("indecisos", ascending=False),
                x="territory",
                y="indecisos",
                title="Indicador de indecisos por território",
                color="indecisos",
                color_continuous_scale="Oranges",
            ),
            width="stretch",
        )
    st.info(
        "ℹ️ **Rigor Metodológico (Princípio de Honestidade dos Dados):** Percentuais de intenção sem amostragem probabilística auditada (n ≥ 400), "
        "intervalo de confiança de 95% e margem de erro formal (ex.: ±4.9 p.p.) são estritamente indicativos de simulação interna e não constituem sondagem perante a CNE."
    )

with paid:
    st.subheader("Tráfego pago — desempenho")
    spend = filtered["spend"].sum()
    clicks = int(filtered["clicks"].sum())
    leads = int(filtered["leads"].sum())
    conversions = int(filtered["conversions"].sum())
    a, b, c, d = st.columns(4)
    a.metric("Investimento", money_ao(spend))
    b.metric("CTR demonstrativo", f"{clicks / max(filtered['buzz'].sum(), 1) * 100:.2f}%")
    c.metric("Custo por lead", money_ao(spend / max(leads, 1)))
    d.metric("Custo por conversão", money_ao(spend / max(conversions, 1)))
    daily = filtered.groupby("date", as_index=False).agg(
        investimento=("spend", "sum"), leads=("leads", "sum"), conversoes=("conversions", "sum")
    )
    st.plotly_chart(
        px.line(daily, x="date", y=["investimento", "leads", "conversoes"], title="Investimento e resultados"),
        width="stretch",
    )

with finance:
    st.subheader("Finanças — orçamento e alertas")
    spent = filtered["spend"].sum()
    budget = filtered.groupby("campaign")["budget"].first().sum()
    remaining = max(budget - spent, 0)
    used_pct = min(spent / max(budget, 1) * 100, 100)
    a, b, c = st.columns(3)
    a.metric("Orçamento de referência", money_ao(budget))
    b.metric("Consumo no período", money_ao(spent), f"{used_pct:.1f}% do orçamento")
    c.metric("Saldo estimado", money_ao(remaining))
    st.progress(used_pct / 100, text=f"{used_pct:.1f}% consumido")
    if used_pct >= 80:
        st.error("Alerta demonstrativo: consumo acima de 80% do orçamento de referência.")
    elif used_pct >= 60:
        st.warning("Atenção demonstrativa: consumo entre 60% e 80%.")
    else:
        st.success("Consumo abaixo do limite de atenção demonstrativo.")
    by_territory = filtered.groupby("territory", as_index=False)["spend"].sum()
    st.plotly_chart(
        px.bar(by_territory, x="territory", y="spend", title="Investimento por território"),
        width="stretch",
    )
