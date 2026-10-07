#!/usr/bin/env python3
"""
Gera o ficheiro standalone 'apresentacao_cliente.html' para demonstrações comerciais.
Contém todos os dados vetoriais de geo_angola, resultados eleitorais CNE 2022,
INE, motor de Hondt, Dia D, canal WhatsApp e simulação mobile integrados num único ficheiro.
"""

import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_RAW = ROOT / "data" / "raw"
GEO_DIR = ROOT / "geo_angola"

# Carregar malha simplificada e contorno nacional
with open(GEO_DIR / "geoBoundaries-AGO-ADM1_simplified.geojson", "r", encoding="utf-8") as f:
    geojson_adm1 = json.load(f)

contorno_path = GEO_DIR / "contorno_nacional.geojson"
if contorno_path.is_file():
    with open(contorno_path, "r", encoding="utf-8") as f:
        geojson_contorno = json.load(f)
else:
    geojson_contorno = {"type": "FeatureCollection", "features": []}

with open(DATA_RAW / "resultados_eleitorais_cne_2022.json", "r", encoding="utf-8") as f:
    cne_data = json.load(f)["provincias"]

with open(DATA_RAW / "populacao_projecoes_ine.json", "r", encoding="utf-8") as f:
    ine_data = json.load(f)["provincias"]

with open(DATA_RAW / "serie_historica_eleicoes_cne.json", "r", encoding="utf-8") as f:
    serie_historica = json.load(f)

from war_room.custo_logistico import calcular_indice_prioridade_completo
from war_room.motor_hondt import simular_hondt_provincial

cne_map = {p["codigo_cne"]: p for p in cne_data}
ine_map = {p["codigo_ine"]: p for p in ine_data}

# Consolidar dados por província
provincias = []
for p in cne_data:
    cod = p["codigo_cne"]
    nome = p["provincia"]
    ine_info = ine_map.get(cod, {})
    va = p["votos_partido_a"]
    vb = p["votos_partido_b"]
    val = p["votos_validos"]
    outros = max(0, val - (va + vb))
    hondt = simular_hondt_provincial(va, vb, outros, "MPLA", "UNITA", 5)
    disp = hondt["disputa_proxima_cadeira"]["MPLA"]
    margem = round((va - vb) / val * 100, 2)
    prio = calcular_indice_prioridade_completo(
        eleitores_aptos=p["eleitores_registados"],
        margem_apurada_perc=margem,
        abstencao_perc=p["abstencao_perc"],
        juventude_perc=ine_info.get("jovens_perc_eleitorado", 60.0),
        nome_territorio=nome,
        votos_para_virar_cadeira=disp["votos_para_proximo_assento"],
    )
    provincias.append({
        "codigo": cod,
        "nome": nome,
        "eleitores": p["eleitores_registados"],
        "votantes": p.get("votantes_total", p.get("votantes", 0)),
        "abstencao_perc": p["abstencao_perc"],
        "votos_mpla": va,
        "votos_unita": vb,
        "votos_outros": outros,
        "votos_validos": val,
        "margem_perc": margem,
        "populacao": ine_info.get("populacao_total", 1000000),
        "jovens_perc": ine_info.get("jovens_perc_eleitorado", 60.0),
        "hondt_mpla": hondt["assentos"].get("MPLA", 0),
        "hondt_unita": hondt["assentos"].get("UNITA", 0),
        "quociente_corte": hondt["quociente_corte"],
        "ultimo_eleito": hondt["ultimo_eleito"],
        "votos_virar": disp["votos_para_proximo_assento"],
        "volatilidade": disp["volatilidade_cadeira"],
        "folga": disp["folga_votos_manter_ultimo"],
        "esforco_perc": disp["esforco_perc_validos"],
        "score": prio["score_prioridade"],
        "potencial": prio["potencial_voto"],
        "competitividade": prio["competitividade"],
        "custo_fator": prio["custo_logistico"]["fator"],
        "custo_dificuldade": prio["custo_logistico"]["dificuldade"],
        "custo_modal": prio["custo_logistico"]["modal"],
        "custo_desc": prio["custo_logistico"]["descricao"],
    })

# Injetar propriedades territoriais no GeoJSON para o mapa interativo
for feat in geojson_adm1["features"]:
    nome_geom = feat["properties"].get("shapeName")
    prov_match = next((p for p in provincias if p["nome"] == nome_geom), None)
    if prov_match:
        feat["properties"].update(prov_match)

dados_embutidos = {
    "provincias": provincias,
    "serie_historica": serie_historica,
    "geojson": geojson_adm1,
    "contorno": geojson_contorno,
}

json_dump = json.dumps(dados_embutidos, ensure_ascii=False)

html_template = """<!DOCTYPE html>
<html lang="pt-AO">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover">
  <title>GPS Eleitoral Angola 2027 — Demonstração Executiva</title>
  
  <!-- Fontes Oficiais do Design System -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap" rel="stylesheet">
  
  <!-- Leaflet CSS & JS via CDN (funciona local ou online) -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

  <style>
    :root {
      --bg: #0a0e14;
      --rail: #0f141d;
      --panel: #141b24;
      --panel-2: #1a222e;
      --line: #263140;
      --line-strong: #3b495c;
      --text: #f1f4f8;
      --text-bright: #ffffff;
      --muted: #8e9baa;
      --accent: #d6b25e;
      --accent-ink: #141006;
      --accent-glow: rgba(214, 178, 94, 0.2);
      --ok: #34d399;
      --ok-bg: rgba(52, 211, 153, 0.12);
      --warn: #fb923c;
      --warn-bg: rgba(251, 146, 60, 0.12);
      --bad: #f87171;
      --bad-bg: rgba(248, 113, 113, 0.12);
      --info: #60a5fa;
      --info-bg: rgba(96, 165, 250, 0.12);
      --mpla: #3b82f6;
      --mpla-bg: rgba(59, 130, 246, 0.16);
      --unita: #f97316;
      --unita-bg: rgba(249, 115, 22, 0.16);
      --radius: 10px;
      --radius-sm: 6px;
      --font-sans: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font-sans);
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      overflow-x: hidden;
    }

    /* Scrollbars */
    ::-webkit-scrollbar { width: 7px; height: 7px; }
    ::-webkit-scrollbar-track { background: var(--bg); }
    ::-webkit-scrollbar-thumb { background: var(--line); border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--line-strong); }

    /* Top Banner de Demonstração Comercial */
    .demo-bar {
      background: linear-gradient(90deg, #181308 0%, #291e0a 50%, #181308 100%);
      border-bottom: 1px solid rgba(214, 178, 94, 0.35);
      padding: 10px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      font-size: 12px;
      position: sticky;
      top: 0;
      z-index: 1000;
      backdrop-filter: blur(10px);
      min-width: 0;
      width: 100%;
      box-sizing: border-box;
    }
    .demo-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      flex: 1 1 220px;
    }
    .demo-brand svg { flex-shrink: 0; }
    .demo-brand-copy {
      display: flex;
      flex-direction: column;
      gap: 1px;
      min-width: 0;
    }
    .demo-brand-title {
      color: var(--accent);
      font-weight: 800;
      letter-spacing: 0.08em;
      font-size: 13px;
      text-transform: uppercase;
      line-height: 1.2;
      white-space: nowrap;
    }
    .demo-brand-sub {
      color: var(--muted);
      font-size: 10.5px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .demo-badge {
      background: var(--accent);
      color: var(--accent-ink);
      font-size: 10px;
      font-weight: 800;
      padding: 4px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      white-space: nowrap;
      flex-shrink: 0;
      line-height: 1.2;
    }
    .demo-actions { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }
    .demo-offline { color: var(--muted); font-size: 11px; white-space: nowrap; }

    /* Shell Layout */
    .shell {
      display: grid;
      grid-template-columns: 240px minmax(0, 1fr);
      min-height: calc(100vh - 38px);
    }

    /* Sidebar Navigation */
    .rail {
      background: var(--rail);
      border-right: 1px solid var(--line);
      padding: 20px 14px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      position: sticky;
      top: 38px;
      height: calc(100vh - 38px);
      overflow-y: auto;
    }
    .brand { padding: 0 6px; }
    .brand strong { display: block; margin-top: 2px; font-size: 17px; color: var(--text-bright); }
    .eyebrow {
      color: var(--accent);
      letter-spacing: 0.12em;
      text-transform: uppercase;
      font-size: 10.5px;
      font-weight: 700;
      margin: 0;
    }
    .nav-rotulo {
      margin: 12px 10px 4px;
      font-size: 10px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #5a6676;
      font-weight: 700;
    }
    .tabs { display: flex; flex-direction: column; gap: 3px; }
    .tab-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      text-align: left;
      border: 0;
      border-radius: var(--radius-sm);
      background: transparent;
      padding: 9px 12px;
      color: var(--muted);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .tab-btn:hover { background: rgba(255, 255, 255, 0.04); color: var(--text); }
    .tab-btn.active {
      background: var(--panel-2);
      color: var(--text-bright);
      box-shadow: inset 3px 0 0 var(--accent);
    }
    .tab-btn.active .tab-icon { stroke: var(--accent); filter: drop-shadow(0 0 5px var(--accent-glow)); }
    .tab-btn.active small { color: var(--accent); }
    .tab-btn span { font-size: 13.5px; font-weight: 500; display: block; }
    .tab-btn small { font-size: 11px; color: #647080; display: block; }
    .tab-icon { stroke: currentColor; flex-shrink: 0; }

    .rail-pe {
      margin-top: auto;
      padding: 12px 8px 4px;
      border-top: 1px solid var(--line);
      font-size: 11px;
      color: var(--muted);
    }
    .rail-pe p { margin: 0 0 8px; text-transform: uppercase; font-size: 10px; font-weight: 700; color: #647080; }
    .rail-pe ul { list-style: none; display: grid; gap: 6px; }
    .rail-pe li { display: flex; align-items: center; gap: 8px; font-size: 11px; }

    /* Workspace */
    .workspace {
      background: var(--bg);
      min-width: 0;
      padding-bottom: 50px;
    }
    .top {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 16px;
      padding: 20px 32px 14px;
      border-bottom: 1px solid var(--line);
      background: rgba(15, 20, 29, 0.5);
      backdrop-filter: blur(10px);
    }
    .top h1 { font-size: 26px; font-weight: 700; letter-spacing: -0.03em; color: var(--text-bright); margin-top: 4px; }
    .top .lede { color: var(--muted); font-size: 13px; margin-top: 2px; }
    .top-acoes { display: flex; align-items: center; gap: 10px; }
    .badge-plano {
      background: var(--warn-bg);
      color: #fdba74;
      border: 1px solid rgba(251, 146, 60, 0.25);
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      font-family: var(--font-mono);
    }
    .session-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      background: var(--ok-bg);
      border: 1px solid rgba(52, 211, 153, 0.3);
      color: var(--ok);
      font-size: 11.5px;
      font-weight: 600;
      font-family: var(--font-mono);
    }
    .pulse-dot {
      width: 7px; height: 7px; border-radius: 50%; background: var(--ok);
      box-shadow: 0 0 8px var(--ok); animation: pulso 1.8s infinite;
    }
    @keyframes pulso {
      0% { transform: scale(0.9); opacity: 0.7; }
      50% { transform: scale(1.3); opacity: 1; }
      100% { transform: scale(0.9); opacity: 0.7; }
    }

    .page {
      padding: 20px 32px;
      display: grid;
      gap: 16px;
    }

    /* Cards & KPIs */
    .card, .kpi {
      background: linear-gradient(180deg, rgba(20, 27, 36, 0.95) 0%, rgba(15, 20, 28, 0.98) 100%);
      border: 1px solid var(--line);
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.45), inset 0 1px 0 0 rgba(255, 255, 255, 0.05);
      border-radius: var(--radius);
      padding: 16px;
      transition: all 0.15s ease;
    }
    .card:hover {
      border-color: var(--line-strong);
      box-shadow: 0 6px 24px -2px rgba(0, 0, 0, 0.55), inset 0 1px 0 0 rgba(255, 255, 255, 0.08);
    }
    .card-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 14px;
    }
    .card-head h2 { font-size: 17px; font-weight: 700; color: var(--text-bright); }
    .card-head .muted { font-size: 12.5px; color: var(--muted); margin-top: 2px; }

    .kpis { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
    .kpis.quatro { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .kpi { display: flex; flex-direction: column; justify-content: space-between; padding: 14px 16px; }
    .kpi span {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 11.5px; font-weight: 600; text-transform: uppercase; color: var(--muted);
    }
    .kpi strong {
      display: block; font-size: 25px; margin-top: 8px;
      font-family: var(--font-mono); font-variant-numeric: tabular-nums;
      color: var(--text-bright); letter-spacing: -0.03em;
    }
    .kpi-bastiao { border-left: 3px solid var(--ok); }
    .kpi-batalha { border-left: 3px solid var(--warn); }
    .kpi-oposicao { border-left: 3px solid var(--bad); }

    /* Layout Grids */
    .palco {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(360px, 0.95fr);
      gap: 16px;
      align-items: start;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 16px;
      align-items: start;
    }

    /* Map & Toolbars */
    .mapa-toolbar-wrapper {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 10px;
    }
    .mapa-toolbar-seccao { display: inline-flex; align-items: center; gap: 6px; }
    .mapa-toolbar-seccao span { font-size: 11px; color: var(--muted); font-weight: 600; text-transform: uppercase; }

    .btn-group {
      display: inline-flex; border-radius: var(--radius-sm);
      background: #0d1218; border: 1px solid var(--line);
      padding: 2px; gap: 2px;
    }
    .btn-group button {
      background: transparent; border: 0; border-radius: 4px;
      padding: 5px 10px; font-size: 12px; color: var(--muted);
      font-weight: 500; cursor: pointer; transition: all 0.15s;
      display: inline-flex; align-items: center; gap: 5px;
    }
    .btn-group button:hover { color: var(--text); background: rgba(255, 255, 255, 0.04); }
    .btn-group button.activa {
      background: var(--panel-2); color: var(--text-bright);
      font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }

    .ghost, .primary {
      padding: 7px 12px; border-radius: var(--radius-sm); font-size: 12.5px;
      font-weight: 600; cursor: pointer; transition: all 0.15s ease;
      display: inline-flex; align-items: center; gap: 6px;
    }
    .ghost { background: rgba(255, 255, 255, 0.04); color: var(--text); border: 1px solid var(--line); }
    .ghost:hover { background: rgba(255, 255, 255, 0.08); border-color: var(--line-strong); }
    .primary { background: var(--accent); color: var(--accent-ink); border: 1px solid var(--accent); }
    .primary:hover { filter: brightness(1.1); transform: translateY(-1px); }

    .mapa-container {
      height: 580px; width: 100%; border-radius: var(--radius-sm);
      background: #0d1218; border: 1px solid var(--line);
      position: relative; overflow: hidden;
    }

    /* Leaflet Overrides */
    .leaflet-container { background: #0d1218 !important; font: inherit; }
    .leaflet-bar { border: 1px solid var(--line) !important; border-radius: var(--radius-sm) !important; overflow: hidden; }
    .leaflet-bar a { background: #141b24 !important; color: #f1f4f8 !important; border-bottom: 1px solid var(--line) !important; }
    .leaflet-bar a:hover { background: #1e2837 !important; color: var(--accent) !important; }
    .leaflet-tooltip.mapa-tip {
      background: rgba(20, 27, 36, 0.95) !important;
      backdrop-filter: blur(8px);
      color: #f1f4f8 !important;
      border: 1px solid var(--line-strong) !important;
      border-radius: var(--radius-sm) !important;
      font-size: 12px !important;
      line-height: 1.45 !important;
      padding: 8px 11px !important;
    }

    /* Territory Detail Panel */
    .detalhe {
      background: var(--panel-2); border: 1px solid var(--line);
      border-radius: var(--radius-sm); padding: 14px;
    }
    .detalhe-topo { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px; }
    .detalhe-topo h2 { font-size: 20px; font-weight: 700; color: var(--text-bright); }
    .factos { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px; margin: 10px 0; }
    .factos div {
      background: rgba(0,0,0,0.25); border: 1px solid var(--line);
      border-radius: var(--radius-sm); padding: 8px 10px;
    }
    .factos dt { color: var(--muted); font-size: 10.5px; text-transform: uppercase; font-weight: 600; }
    .factos dd { margin: 2px 0 0; font-size: 15px; font-weight: 700; font-family: var(--font-mono); color: var(--text-bright); }

    .seat-bar-container { margin: 8px 0; }
    .seat-bar { display: flex; height: 12px; border-radius: 6px; overflow: hidden; background: #0d1218; border: 1px solid var(--line); }
    .seat-bar-fatia.mpla { background: var(--mpla); }
    .seat-bar-fatia.unita { background: var(--unita); }
    .seats-display { display: flex; gap: 6px; margin: 8px 0; flex-wrap: wrap; }
    .seat-pill {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; font-family: var(--font-mono);
    }
    .seat-pill.mpla { background: var(--mpla-bg); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.35); }
    .seat-pill.unita { background: var(--unita-bg); color: #fdba74; border: 1px solid rgba(249, 115, 22, 0.35); }
    .seat-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .seat-dot.mpla { background: var(--mpla); }
    .seat-dot.unita { background: var(--unita); }

    .score-breakdown { display: grid; gap: 8px; margin: 12px 0; }
    .score-item { display: grid; gap: 4px; font-size: 12px; }
    .score-item-header { display: flex; justify-content: space-between; color: var(--muted); }
    .score-item-header strong { color: var(--text-bright); font-family: var(--font-mono); }
    .score-bar { height: 6px; background: rgba(0,0,0,0.3); border-radius: 3px; overflow: hidden; }
    .score-bar i { display: block; height: 100%; border-radius: 3px; background: var(--accent); }

    .destaque {
      background: linear-gradient(135deg, rgba(214, 178, 94, 0.08) 0%, rgba(20, 27, 36, 0.5) 100%);
      border: 1px solid rgba(214, 178, 94, 0.25);
      border-radius: var(--radius-sm); padding: 12px; margin-top: 10px;
    }
    .destaque .score { display: block; font-size: 32px; color: var(--accent); font-family: var(--font-mono); font-weight: 800; line-height: 1.1; }
    .destaque .score small { font-size: 14px; color: var(--muted); font-weight: 500; font-family: var(--font-sans); }

    /* Tables */
    .table-responsive { width: 100%; overflow-x: auto; margin-top: 6px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: left; padding: 9px 10px; border-bottom: 1px solid var(--line); }
    th { color: var(--muted); font-size: 11px; font-weight: 700; text-transform: uppercase; background: rgba(0,0,0,0.15); }
    td.num, th.num { text-align: right; font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
    tbody tr { cursor: pointer; transition: background 0.1s ease; }
    tbody tr:hover { background: rgba(255, 255, 255, 0.04); }
    tbody tr.activa { background: rgba(214, 178, 94, 0.12); border-left: 3px solid var(--accent); }

    /* Badges & Selos */
    .zona { font-weight: 700; font-size: 12px; padding: 2px 8px; border-radius: 999px; display: inline-block; }
    .zona.BASTIAO { color: #6ee7b7; background: var(--ok-bg); border: 1px solid rgba(52, 211, 153, 0.25); }
    .zona.OPOSICAO { color: #fca5a5; background: var(--bad-bg); border: 1px solid rgba(248, 113, 113, 0.25); }
    .zona.CAMPO_BATALHA { color: #fdba74; background: var(--warn-bg); border: 1px solid rgba(251, 146, 60, 0.25); }

    .badge {
      display: inline-block; padding: 2px 8px; border-radius: 999px;
      font-size: 11px; font-weight: 700; text-transform: uppercase; font-family: var(--font-mono);
    }
    .badge-alta { background: var(--bad-bg); color: #fca5a5; border: 1px solid rgba(248, 113, 113, 0.25); }
    .badge-media { background: var(--warn-bg); color: #fdba74; border: 1px solid rgba(251, 146, 60, 0.25); }
    .badge-baixa { background: var(--ok-bg); color: #6ee7b7; border: 1px solid rgba(52, 211, 153, 0.25); }

    .selo {
      display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 10px;
      font-weight: 700; text-transform: uppercase; font-family: var(--font-mono); border: 1px solid transparent;
    }
    .selo-oficial { color: #6ee7b7; background: var(--ok-bg); border-color: rgba(52, 211, 153, 0.35); }
    .selo-estimado { color: #fdba74; background: var(--warn-bg); border-color: rgba(251, 146, 60, 0.35); }
    .selo-simulado { color: #94a3b8; border-color: #475569; border-style: dashed; }

    /* Inputs */
    input, select {
      background: #0d1218; border: 1px solid var(--line);
      border-radius: var(--radius-sm); padding: 8px 12px;
      color: var(--text); font-size: 13px; outline: none;
    }
    input:focus, select:focus { border-color: var(--accent); }
    input[type="range"] {
      appearance: none; background: var(--line); height: 6px; border-radius: 3px; padding: 0;
    }
    input[type="range"]::-webkit-slider-thumb {
      appearance: none; width: 16px; height: 16px; border-radius: 50%;
      background: var(--accent); border: 2px solid var(--bg); cursor: pointer;
    }

    /* Gráfico da Campanha */
    .grafico-campanha { display: grid; gap: 14px; }
    .chart { width: 100%; height: 260px; }
    .trend-pills { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }
    .trend-pill {
      padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 600;
      background: rgba(0,0,0,0.25); border: 1px solid var(--line); font-family: var(--font-mono);
    }
    .trend-pill.down { color: #93c5fd; border-color: rgba(59, 130, 246, 0.3); }
    .trend-pill.up { color: #fdba74; border-color: rgba(249, 115, 22, 0.3); }
    .trend-pill.neutral { color: var(--muted); }
    .deputados-ano { display: grid; gap: 8px; }
    .deputados-ano > div { display: grid; grid-template-columns: 50px 1fr 100px; gap: 12px; align-items: center; font-size: 12.5px; }
    .deputados-ano strong { text-align: right; font-family: var(--font-mono); }
    .barra-dupla { display: flex; height: 10px; border-radius: 5px; overflow: hidden; background: #0d1218; }
    .fatia-mpla { background: var(--mpla); display: block; height: 100%; }
    .fatia-unita { background: var(--unita); display: block; height: 100%; }

    /* Dia D passos */
    .passos-diad { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
    .passos-diad article { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 18px; }
    .passos-diad span { color: var(--accent); font-size: 12px; font-weight: 800; }
    .passos-diad strong { display: block; margin: 6px 0 4px; font-size: 15px; color: var(--text-bright); }
    .passos-diad p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.45; }

    /* Plans */
    .plans { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
    .plan { display: flex; flex-direction: column; justify-content: space-between; }
    .plan.escolhido { border-color: var(--accent); box-shadow: 0 0 20px rgba(214, 178, 94, 0.15); }
    .plan h3 { font-size: 17px; margin-bottom: 4px; color: var(--text-bright); }
    .price { font-size: 26px; margin: 10px 0; font-weight: 700; font-family: var(--font-mono); color: var(--text-bright); }
    .price small { font-size: 13px; color: var(--muted); font-family: var(--font-sans); }

    /* WhatsApp Simulator */
    .chat-box {
      background: #0d1218; border: 1px solid var(--line); border-radius: var(--radius-sm);
      height: 280px; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px;
    }
    .msg { max-width: 80%; padding: 8px 12px; border-radius: 12px; font-size: 13px; line-height: 1.4; }
    .msg.user { align-self: flex-end; background: #0f3c58; color: #f1f4f8; }
    .msg.bot { align-self: flex-start; background: var(--panel-2); color: var(--text-bright); border: 1px solid var(--line); }

    /* Responsive */
    @media (max-width: 1024px) {
      .shell { grid-template-columns: 1fr; }
      .rail { display: none; }
      .palco, .grid-2 { grid-template-columns: 1fr; }
      .kpis, .plans, .passos-diad { grid-template-columns: 1fr 1fr; }
      .top { padding: 14px 20px; flex-direction: column; align-items: flex-start; }
      .page { padding: 14px 18px; }
      .demo-bar { padding: 10px 14px; }
    }
    @media (max-width: 720px) {
      .demo-bar {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
      }
      .demo-brand { flex: 1 1 auto; width: 100%; }
      .demo-offline { display: none; }
      .demo-actions { width: 100%; justify-content: stretch; }
      .demo-actions .primary { width: 100%; }
      .top h1 { font-size: 20px; line-height: 1.2; }
      .top-acoes { width: 100%; flex-wrap: wrap; }
    }
    @media (max-width: 600px) {
      .kpis, .plans, .passos-diad { grid-template-columns: 1fr; }
    }
    @media (max-width: 420px) {
      .demo-brand { flex-wrap: wrap; }
      .demo-brand-sub { white-space: normal; }
      .demo-badge { margin-left: 28px; }
    }
  </style>
</head>
<body>

  <!-- Barra de Topo do Showcase Comercial -->
  <div class="demo-bar">
    <div class="demo-brand">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 4.5l1.6 3.8 4.1.4-3.1 2.8.9 4-3.5-2-3.5 2 .9-4-3.1-2.8 4.1-.4L12 4.5z" fill="var(--accent)"/></svg>
      <div class="demo-brand-copy">
        <span class="demo-brand-title">GPS Eleitoral</span>
        <span class="demo-brand-sub">Angola 2027 · Demo executiva</span>
      </div>
      <span class="demo-badge">Versão Comercial 2.0</span>
    </div>
    <div class="demo-actions">
      <span class="demo-offline">100% Interativo &amp; Offline</span>
      <button class="primary" onclick="mudarAba('planos')">Pedir Proposta Formal</button>
    </div>
  </div>

  <div class="shell">
    <!-- Sidebar Navegação -->
    <aside class="rail">
      <div class="brand">
        <p class="eyebrow">República de Angola</p>
        <strong>Sala de Comando 2027</strong>
      </div>

      <nav class="tabs">
        <p class="nav-rotulo">Módulos de Decisão</p>
        <button class="tab-btn active" onclick="mudarAba('dashboard')">
          <svg class="tab-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-width="2"><rect width="7" height="9" x="3" y="3" rx="1.5"/><rect width="7" height="5" x="14" y="3" rx="1.5"/><rect width="7" height="9" x="14" y="12" rx="1.5"/><rect width="7" height="5" x="3" y="16" rx="1.5"/></svg>
          <div>
            <span>Dashboard</span>
            <small>Mapa e campanha</small>
          </div>
        </button>

        <button class="tab-btn" onclick="mudarAba('hondt')">
          <svg class="tab-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h18"/></svg>
          <div>
            <span>Hondt</span>
            <small>Cadeiras provinciais</small>
          </div>
        </button>

        <button class="tab-btn" onclick="mudarAba('diad')">
          <svg class="tab-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14"/><path d="M2 20h20"/><path d="M14 12v.01"/><path d="M9 16h6"/><path d="m10 8 2 2 4-4"/></svg>
          <div>
            <span>Dia D</span>
            <small>Apuramento</small>
          </div>
        </button>

        <p class="nav-rotulo">Módulos de Apoio</p>
        <button class="tab-btn" onclick="mudarAba('eleitor')">
          <svg class="tab-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M8 12h.01"/><path d="M12 12h.01"/><path d="M16 12h.01"/></svg>
          <div>
            <span>Eleitor</span>
            <small>WhatsApp e queixas</small>
          </div>
        </button>

        <button class="tab-btn" onclick="mudarAba('planos')">
          <svg class="tab-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-width="2"><rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
          <div>
            <span>Planos</span>
            <small>Contratação e SKUs</small>
          </div>
        </button>
      </nav>

      <footer class="rail-pe">
        <p>Proveniência dos Dados</p>
        <ul>
          <li><span class="selo selo-oficial">OFICIAL</span> CNE 2022 / INE</li>
          <li><span class="selo selo-estimado">ESTIMADO</span> Projeções 2024</li>
          <li><span class="selo selo-simulado">SIMULADO</span> Cenários e Choques</li>
        </ul>
      </footer>
    </aside>

    <!-- Área Principal de Apresentação -->
    <main class="workspace">
      
      <!-- HEADER DINÂMICO -->
      <header class="top">
        <div>
          <p class="eyebrow">ELEIÇÕES GERAIS DE ANGOLA · PROJETO 2027</p>
          <h1 id="view-title">Dashboard Territorial & Campanha</h1>
          <p class="lede" id="view-subtitle">Inteligência geoespacial, cálculo de Hondt e priorização logística integrada.</p>
        </div>
        <div class="top-acoes">
          <span class="badge-plano">PLANO NACIONAL / HQ</span>
          <div class="session-badge">
            <i class="pulse-dot"></i>
            <span>Sessão de Demonstração</span>
          </div>
        </div>
      </header>

      <!-- SEÇÃO 1: DASHBOARD -->
      <div id="tab-dashboard" class="page tab-content">
        <section class="kpis">
          <article class="kpi">
            <span>Eleitorado 2022 <span class="selo selo-oficial">OFICIAL</span></span>
            <strong id="kpi-eleitores">14 228 650</strong>
          </article>
          <article class="kpi">
            <span>População Total <span class="selo selo-estimado">ESTIMADO</span></span>
            <strong id="kpi-populacao">23 700 000</strong>
          </article>
          <article class="kpi kpi-bastiao">
            <span>Bastiões (≥+15%) <span class="selo selo-oficial">CNE</span></span>
            <strong id="kpi-bastiao" style="color: var(--ok)">12</strong>
          </article>
          <article class="kpi kpi-batalha">
            <span>Em Disputa <span class="selo selo-oficial">CNE</span></span>
            <strong id="kpi-batalha" style="color: var(--warn)">3</strong>
          </article>
          <article class="kpi kpi-oposicao">
            <span>Oposição (≤-15%) <span class="selo selo-oficial">CNE</span></span>
            <strong id="kpi-oposicao" style="color: var(--bad)">3</strong>
          </article>
        </section>

        <!-- PALCO DO MAPA E DETALHE -->
        <section class="palco">
          <div class="card">
            <div class="card-head">
              <div>
                <h2>Mapa Estratégico de Angola</h2>
                <p class="muted">Malha vetorial de alta precisão baseada em geo_angola e dados oficiais CNE 2022.</p>
              </div>
              <div class="btn-group">
                <button class="activa" id="btn-camada-zona" onclick="mudarCamada('zona')">Zonamento</button>
                <button id="btn-camada-margem" onclick="mudarCamada('margem')">Margem</button>
                <button id="btn-camada-score" onclick="mudarCamada('score')">Prioridade</button>
                <button id="btn-camada-custo" onclick="mudarCamada('custo')">Logística</button>
              </div>
            </div>

            <div class="mapa-toolbar-wrapper">
              <div class="mapa-toolbar-seccao">
                <span>Fundo</span>
                <div class="btn-group">
                  <button class="activa" id="btn-fundo-ruas" onclick="mudarFundo('ruas')">Ruas</button>
                  <button id="btn-fundo-sat" onclick="mudarFundo('satelite')">Satélite</button>
                  <button id="btn-fundo-malha" onclick="mudarFundo('malha')">Só Malha</button>
                </div>
              </div>
              <button class="ghost" onclick="resetarMapa()">↺ Centrar Angola</button>
            </div>

            <div id="mapa" class="mapa-container"></div>
          </div>

          <!-- DIAGNÓSTICO DO TERRITÓRIO -->
          <div class="card lateral">
            <div class="card-head">
              <div>
                <h2>Diagnóstico do Círculo</h2>
                <p class="muted">Clique numa província no mapa para inspecionar.</p>
              </div>
            </div>

            <div id="painel-detalhe" class="detalhe">
              <div class="detalhe-topo">
                <div>
                  <span class="eyebrow" id="det-regiao">Norte Litoral</span>
                  <h2 id="det-nome">Luanda</h2>
                </div>
                <span class="zona OPOSICAO" id="det-zona">Oposição</span>
              </div>

              <dl class="factos">
                <div>
                  <dt>Margem 2022</dt>
                  <dd id="det-margem" style="color: var(--bad);">-29,28%</dd>
                </div>
                <div>
                  <dt>Eleitores Aptos</dt>
                  <dd id="det-eleitores">4 652 250</dd>
                </div>
                <div>
                  <dt>Abstenção</dt>
                  <dd id="det-abstencao">48,00%</dd>
                </div>
                <div>
                  <dt>Juventude (18-35)</dt>
                  <dd id="det-jovens">67,00%</dd>
                </div>
              </dl>

              <div class="bloco" style="margin-top: 10px;">
                <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; margin-bottom: 6px;">
                  <span>Círculo Provincial (5 Deputados)</span>
                  <span class="selo selo-oficial">OFICIAL</span>
                </div>
                <div class="seat-bar">
                  <div id="det-bar-mpla" class="seat-bar-fatia mpla" style="width: 40%"></div>
                  <div id="det-bar-unita" class="seat-bar-fatia unita" style="width: 60%"></div>
                </div>
                <div class="seats-display" style="margin-top: 8px;">
                  <span class="seat-pill mpla" id="det-pill-mpla"><i class="seat-dot mpla"></i> 2 MPLA</span>
                  <span class="seat-pill unita" id="det-pill-unita"><i class="seat-dot unita"></i> 3 UNITA</span>
                </div>
                <p id="det-virar-texto" class="muted" style="font-size: 11.5px; margin-top: 6px;">
                  Faltam <strong>+391 551</strong> votos para virar próxima cadeira.
                </p>
              </div>

              <div class="destaque">
                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                  <span class="muted" style="font-weight: 700; text-transform: uppercase; font-size: 11px;">Prioridade Integrada</span>
                  <strong class="score" id="det-score">72.3 <small>/ 100</small></strong>
                </div>
                <div class="score-breakdown">
                  <div class="score-item">
                    <div class="score-item-header"><span>Potencial de Voto</span><strong id="det-potencial">80.4</strong></div>
                    <div class="score-bar"><i id="det-bar-potencial" style="width: 80.4%"></i></div>
                  </div>
                  <div class="score-item">
                    <div class="score-item-header"><span>Competitividade Hondt</span><strong id="det-comp">26.7</strong></div>
                    <div class="score-bar"><i id="det-bar-comp" style="width: 26.7%"></i></div>
                  </div>
                </div>
                <p class="muted" style="font-size: 10.5px; margin-top: 6px;">
                  Custo Logístico de Alcance: <strong id="det-custo-badge">1.0× (Acesso Baixo)</strong>
                </p>
              </div>
            </div>

            <!-- Tabela Rápida -->
            <div style="margin-top: 12px;">
              <input type="text" id="filtro-nome" placeholder="Filtrar província..." oninput="filtrarTabela()" style="width: 100%; margin-bottom: 8px;">
              <div class="table-responsive" style="max-height: 200px; overflow-y: auto;">
                <table>
                  <thead>
                    <tr><th>Território</th><th>Zona</th><th>Dep.</th><th class="num">Score</th></tr>
                  </thead>
                  <tbody id="tbody-provincias"></tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <!-- GRÁFICO HISTÓRICO DE CAMPANHA -->
        <div class="card">
          <div class="card-head">
            <div>
              <h2>Evolução da Campanha Nacional (2012–2022)</h2>
              <p class="muted">Série histórica oficial CNE: percentuais apurados e divisão dos 220 deputados parlamentares.</p>
            </div>
            <span class="selo selo-oficial">CNE PROCLAMADO</span>
          </div>

          <div class="trend-pills">
            <div class="trend-pill down">MPLA (2012-22): 71,8% → 51,2% (-20,6 p.p.)</div>
            <div class="trend-pill up">UNITA (2012-22): 18,7% → 44,0% (+25,3 p.p.)</div>
            <div class="trend-pill neutral">Abstenção Recorde: 55,2% em 2022 (7,9M ausências)</div>
          </div>

          <div class="grafico-campanha">
            <svg class="chart" viewBox="0 0 680 250">
              <line x1="40" x2="650" y1="210" y2="210" stroke="var(--line)" />
              <line x1="40" x2="650" y1="160" y2="160" stroke="var(--line)" />
              <line x1="40" x2="650" y1="110" y2="110" stroke="var(--line)" />
              <line x1="40" x2="650" y1="60" y2="60" stroke="var(--line)" />
              <line x1="40" x2="650" y1="10" y2="10" stroke="var(--line)" />

              <text x="30" y="214" fill="var(--muted)" font-size="11" font-family="monospace">0%</text>
              <text x="30" y="164" fill="var(--muted)" font-size="11" font-family="monospace">25%</text>
              <text x="30" y="114" fill="var(--muted)" font-size="11" font-family="monospace">50%</text>
              <text x="30" y="64" fill="var(--muted)" font-size="11" font-family="monospace">75%</text>
              <text x="30" y="14" fill="var(--muted)" font-size="11" font-family="monospace">100%</text>

              <!-- MPLA (71.84 -> 61.08 -> 51.17) -->
              <polyline fill="none" stroke="var(--mpla)" stroke-width="3" stroke-linecap="round" points="140,66 345,88 550,108" />
              <circle cx="140" cy="66" r="5" fill="var(--mpla)" />
              <text x="140" y="56" fill="#93c5fd" font-size="11.5" font-weight="700" text-anchor="middle" font-family="monospace">71.84%</text>
              <circle cx="345" cy="88" r="5" fill="var(--mpla)" />
              <text x="345" y="78" fill="#93c5fd" font-size="11.5" font-weight="700" text-anchor="middle" font-family="monospace">61.08%</text>
              <circle cx="550" cy="108" r="5" fill="var(--mpla)" />
              <text x="550" y="98" fill="#93c5fd" font-size="11.5" font-weight="700" text-anchor="middle" font-family="monospace">51.17%</text>

              <!-- UNITA (18.66 -> 26.68 -> 43.95) -->
              <polyline fill="none" stroke="var(--unita)" stroke-width="3" stroke-linecap="round" points="140,172 345,156 550,122" />
              <circle cx="140" cy="172" r="5" fill="var(--unita)" />
              <text x="140" y="190" fill="#fdba74" font-size="11.5" font-weight="700" text-anchor="middle" font-family="monospace">18.66%</text>
              <circle cx="345" cy="156" r="5" fill="var(--unita)" />
              <text x="345" y="174" fill="#fdba74" font-size="11.5" font-weight="700" text-anchor="middle" font-family="monospace">26.68%</text>
              <circle cx="550" cy="122" r="5" fill="var(--unita)" />
              <text x="550" y="140" fill="#fdba74" font-size="11.5" font-weight="700" text-anchor="middle" font-family="monospace">43.95%</text>

              <!-- Anos -->
              <text x="140" y="238" fill="var(--text-bright)" font-size="12" font-weight="700" text-anchor="middle" font-family="monospace">2012</text>
              <text x="345" y="238" fill="var(--text-bright)" font-size="12" font-weight="700" text-anchor="middle" font-family="monospace">2017</text>
              <text x="550" y="238" fill="var(--text-bright)" font-size="12" font-weight="700" text-anchor="middle" font-family="monospace">2022</text>
            </svg>

            <div class="deputados-ano">
              <div>
                <strong>2012</strong>
                <div class="barra-dupla"><i class="fatia-mpla" style="width: 79.5%"></i><i class="fatia-unita" style="width: 20.5%"></i></div>
                <strong style="font-size: 12px"><span style="color: var(--mpla)">175</span> / <span style="color: var(--unita)">32</span></strong>
              </div>
              <div>
                <strong>2017</strong>
                <div class="barra-dupla"><i class="fatia-mpla" style="width: 68.2%"></i><i class="fatia-unita" style="width: 31.8%"></i></div>
                <strong style="font-size: 12px"><span style="color: var(--mpla)">150</span> / <span style="color: var(--unita)">51</span></strong>
              </div>
              <div>
                <strong>2022</strong>
                <div class="barra-dupla"><i class="fatia-mpla" style="width: 56.4%"></i><i class="fatia-unita" style="width: 43.6%"></i></div>
                <strong style="font-size: 12px"><span style="color: var(--mpla)">124</span> / <span style="color: var(--unita)">90</span></strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- SEÇÃO 2: HONDT -->
      <div id="tab-hondt" class="page tab-content" style="display: none;">
        <div class="card">
          <div class="card-head">
            <div>
              <h2>Simulador Dinâmico do Método de D'Hondt</h2>
              <p class="muted">Simulação interativa com variação paramétrica de votos nos 18 círculos provinciais.</p>
            </div>
            <span class="selo selo-simulado">CENÁRIO DINÂMICO</span>
          </div>

          <div style="display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-end; background: rgba(0,0,0,0.2); padding: 12px; border-radius: var(--radius-sm);">
            <div>
              <label style="display:block; font-size:11px; font-weight:700; color:var(--muted); text-transform:uppercase;">Círculo Provincial</label>
              <select id="hondt-select-provincia" onchange="atualizarSimuladorHondt()" style="min-width: 180px;"></select>
            </div>
            <div>
              <label style="display:block; font-size:11px; font-weight:700; color:var(--muted); text-transform:uppercase;">
                Choque MPLA: <strong id="val-choque-mpla" style="color: var(--mpla)">0%</strong>
              </label>
              <input type="range" id="slider-choque-mpla" min="-30" max="30" value="0" oninput="atualizarSimuladorHondt()">
            </div>
            <div>
              <label style="display:block; font-size:11px; font-weight:700; color:var(--muted); text-transform:uppercase;">
                Choque UNITA: <strong id="val-choque-unita" style="color: var(--unita)">0%</strong>
              </label>
              <input type="range" id="slider-choque-unita" min="-30" max="30" value="0" oninput="atualizarSimuladorHondt()">
            </div>
            <button class="ghost" onclick="resetarHondt()">↺ Repor Cenário Neutro</button>
          </div>
        </div>

        <div class="grid-2">
          <!-- Resultado do Círculo -->
          <div class="card">
            <div class="card-head">
              <div>
                <h2 id="hondt-res-titulo">Projeção: Huambo (5 Deputados)</h2>
                <p class="muted">Divisão dos mandatos segundo o método de quocientes sucessivos.</p>
              </div>
            </div>

            <div class="seat-bar" style="height: 16px; border-radius: 8px;">
              <div id="hondt-bar-mpla" class="seat-bar-fatia mpla" style="width: 60%"></div>
              <div id="hondt-bar-unita" class="seat-bar-fatia unita" style="width: 40%"></div>
            </div>

            <div class="seats-display" style="margin-top: 10px;">
              <span class="seat-pill mpla" id="hondt-pill-mpla" style="padding: 6px 14px; font-size: 13px;"><i class="seat-dot mpla"></i> 3 MPLA (60%)</span>
              <span class="seat-pill unita" id="hondt-pill-unita" style="padding: 6px 14px; font-size: 13px;"><i class="seat-dot unita"></i> 2 UNITA (40%)</span>
            </div>

            <p id="hondt-resumo-verbal" style="font-size: 14px; font-weight: 600; color: var(--text-bright); margin-top: 10px;">
              MPLA elege 3 deputados; UNITA elege 2 deputados.
            </p>
            <p class="muted" style="font-size: 12px; margin-top: 2px;">
              Quociente eleitoral de corte: <code id="hondt-corte">85 833 votos</code> · Último eleito: <strong id="hondt-ultimo">MPLA</strong>
            </p>

            <h3 style="margin-top: 16px;">Batalha pela Próxima Cadeira</h3>
            <div id="hondt-card-disputa-mpla" style="padding: 10px 12px; background: rgba(0,0,0,0.25); border: 1px solid var(--line); border-radius: var(--radius-sm); margin: 8px 0;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong style="color: var(--mpla)">MPLA</strong>
                <span class="badge badge-baixa" id="hondt-volat-mpla">VOLATILIDADE BAIXA</span>
              </div>
              <p id="hondt-virar-mpla" style="font-size: 12.5px; margin: 4px 0 0;">Precisa de <strong>+85 834</strong> votos para ganhar mais 1 assento.</p>
            </div>

            <div id="hondt-card-disputa-unita" style="padding: 10px 12px; background: rgba(0,0,0,0.25); border: 1px solid var(--line); border-radius: var(--radius-sm); margin: 8px 0;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong style="color: var(--unita)">UNITA</strong>
                <span class="badge badge-alta" id="hondt-volat-unita">VOLATILIDADE ALTA</span>
              </div>
              <p id="hondt-virar-unita" style="font-size: 12.5px; margin: 4px 0 0;">Precisa de <strong>+8 611</strong> votos para ganhar mais 1 assento.</p>
            </div>
          </div>

          <!-- Panorama dos 18 Círculos -->
          <div class="card">
            <div class="card-head">
              <div>
                <h2>Panorama dos 18 Círculos Provinciais</h2>
                <p class="muted">90 Deputados Apurados em 2022</p>
              </div>
              <span class="selo selo-oficial">OFICIAL</span>
            </div>
            <div class="table-responsive" style="max-height: 380px; overflow-y: auto;">
              <table>
                <thead>
                  <tr><th>Círculo</th><th>MPLA</th><th>UNITA</th><th class="num">Corte</th><th>Virar Cadeira</th></tr>
                </thead>
                <tbody id="tbody-hondt"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- SEÇÃO 3: DIA D -->
      <div id="tab-diad" class="page tab-content" style="display: none;">
        <div class="card">
          <div class="card-head">
            <div>
              <span class="eyebrow">APURAMENTO PARALELO</span>
              <h2>Central de Verificação Probatória</h2>
              <p class="muted">Recepção de atas de mesa assinadas com Ed25519 e verificação georreferenciada.</p>
            </div>
            <span class="session-badge"><i class="pulse-dot"></i> Recepção Ativa</span>
          </div>

          <div class="passos-diad">
            <article>
              <span>01</span>
              <strong>Geofence de Mesa</strong>
              <p>A ata é recusada se o fiscal estiver fora do raio de 200m da mesa cadastrada.</p>
            </article>
            <article>
              <span>02</span>
              <strong>Hash SHA-256 da Foto</strong>
              <p>A fotografia da ata física gera uma cadeia canónica imutável.</p>
            </article>
            <article>
              <span>03</span>
              <strong>Assinatura Ed25519</strong>
              <p>A chave privada do fiscal assina a ata no telemóvel para validação judicial.</p>
            </article>
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <div>
              <h2>Feed de Atas Transmitidas em Tempo Real</h2>
              <p class="muted">Fluxo de integridade criptográfica recebido das províncias.</p>
            </div>
            <button class="ghost" onclick="simularNovaAta()">+ Simular Envio de Ata</button>
          </div>

          <div class="table-responsive">
            <table>
              <thead>
                <tr><th>Hora</th><th>Mesa</th><th>Município</th><th class="num">MPLA</th><th class="num">UNITA</th><th>Digest SHA-256</th><th>Assinatura</th></tr>
              </thead>
              <tbody id="tbody-atas">
                <tr>
                  <td><code>18:42:10</code></td>
                  <td><strong>MESA-0402</strong></td>
                  <td>Luanda (Maianga)</td>
                  <td class="num" style="color:var(--mpla); font-weight:700">142</td>
                  <td class="num" style="color:var(--unita); font-weight:700">189</td>
                  <td><code>8f4a1c2e...b3d9</code></td>
                  <td><span class="badge badge-baixa">✓ Ed25519 VÁLIDA</span></td>
                </tr>
                <tr>
                  <td><code>18:40:05</code></td>
                  <td><strong>MESA-1108</strong></td>
                  <td>Huambo (Bailundo)</td>
                  <td class="num" style="color:var(--mpla); font-weight:700">198</td>
                  <td class="num" style="color:var(--unita); font-weight:700">134</td>
                  <td><code>4c7e9b1a...f201</code></td>
                  <td><span class="badge badge-baixa">✓ Ed25519 VÁLIDA</span></td>
                </tr>
                <tr>
                  <td><code>18:38:12</code></td>
                  <td><strong>MESA-2315</strong></td>
                  <td>Benguela (Lobito)</td>
                  <td class="num" style="color:var(--mpla); font-weight:700">165</td>
                  <td class="num" style="color:var(--unita); font-weight:700">152</td>
                  <td><code>9d02e4aa...771c</code></td>
                  <td><span class="badge badge-baixa">✓ Ed25519 VÁLIDA</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- SEÇÃO 4: ELEITOR / WHATSAPP -->
      <div id="tab-eleitor" class="page tab-content" style="display: none;">
        <div class="grid-2">
          <div class="card">
            <div class="card-head">
              <div>
                <h2>Simulador WhatsApp do Eleitor (+244)</h2>
                <p class="muted">Triagem automática de mesa de voto e recolha de queixas comunitárias sem guardar dados pessoais.</p>
              </div>
              <span class="selo selo-simulado">BOT ATIVO</span>
            </div>

            <div id="chat-box" class="chat-box">
              <div class="msg bot">Olá! Sou o assistente cívico de Angola 2027. Digite <strong>MESA &lt;município&gt;</strong> para consultar a sua assembleia ou <strong>QUEIXA &lt;tema&gt; &lt;município&gt; &lt;relato&gt;</strong> para apontar falhas de água, luz ou vias.</div>
            </div>

            <div style="display:flex; gap:6px; margin: 10px 0; flex-wrap:wrap;">
              <button class="ghost" onclick="enviarMensagemBot('MESA Talatona')">MESA Talatona</button>
              <button class="ghost" onclick="enviarMensagemBot('MESA Cazenga')">MESA Cazenga</button>
              <button class="ghost" onclick="enviarMensagemBot('QUEIXA agua Viana torneiras secas há 4 dias')">QUEIXA água Viana</button>
              <button class="ghost" onclick="enviarMensagemBot('QUEIXA energia Lobito corte constante de luz')">QUEIXA energia Lobito</button>
            </div>

            <div style="display:flex; gap:8px;">
              <input type="text" id="chat-input" placeholder="Digite uma mensagem..." style="flex:1" onkeydown="if(event.key==='Enter') enviarMensagemManual()">
              <button class="primary" onclick="enviarMensagemManual()">Enviar</button>
            </div>
          </div>

          <div class="card">
            <div class="card-head">
              <div>
                <h2>Radar de Queixas Comunitárias</h2>
                <p class="muted">Telefones protegidos por hash irreversível. Agregação em tempo real.</p>
              </div>
            </div>

            <div class="table-responsive">
              <table>
                <thead>
                  <tr><th>Município</th><th>Tema</th><th class="num">Ocorrências</th></tr>
                </thead>
                <tbody id="tbody-queixas">
                  <tr><td><strong>Viana</strong></td><td><span class="badge badge-media">AGUA</span></td><td class="num"><strong>14</strong></td></tr>
                  <tr><td><strong>Cazenga</strong></td><td><span class="badge badge-media">ENERGIA</span></td><td class="num"><strong>11</strong></td></tr>
                  <tr><td><strong>Talatona</strong></td><td><span class="badge badge-baixa">ESTRADAS</span></td><td class="num"><strong>8</strong></td></tr>
                  <tr><td><strong>Lobito</strong></td><td><span class="badge badge-media">ENERGIA</span></td><td class="num"><strong>6</strong></td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- SEÇÃO 5: PLANOS COMERCIAIS -->
      <div id="tab-planos" class="page tab-content" style="display: none;">
        <div class="plans">
          <article class="card plan">
            <div>
              <h3>Plano Municipal</h3>
              <p class="muted">O War Room de um município — porta-a-porta, dores e discurso local.</p>
              <p class="price">4 800 000 <small>AOA / eleição</small></p>
              <p style="font-size:12.5px; color:var(--muted); margin: 8px 0;">Capacidade: 40 brigadistas · 5 contas</p>
              <ul style="list-style:none; display:grid; gap:6px; font-size:12px; margin: 12px 0;">
                <li><span style="color:var(--ok)">✓</span> Âmbito Restrito a 1 Município</li>
                <li><span style="color:var(--ok)">✓</span> Priorização de Bairros</li>
                <li><span style="color:var(--ok)">✓</span> Discursos Territoriais</li>
              </ul>
            </div>
            <button class="ghost" onclick="selecionarPlano('MUNICIPAL')">Selecionar Municipal</button>
          </article>

          <article class="card plan">
            <div>
              <h3>Plano Provincial</h3>
              <p class="muted">Uma província inteira — priorização, Dia D e governação de discursos.</p>
              <p class="price">18 500 000 <small>AOA / eleição</small></p>
              <p style="font-size:12.5px; color:var(--muted); margin: 8px 0;">Capacidade: 250 brigadistas · 20 contas</p>
              <ul style="list-style:none; display:grid; gap:6px; font-size:12px; margin: 12px 0;">
                <li><span style="color:var(--ok)">✓</span> Círculo Provincial Completo (5 Mandatos)</li>
                <li><span style="color:var(--ok)">✓</span> Simulação de Hondt Provincial</li>
                <li><span style="color:var(--ok)">✓</span> Módulo Dia D com Assinatura Ed25519</li>
              </ul>
            </div>
            <button class="ghost" onclick="selecionarPlano('PROVINCIAL')">Selecionar Provincial</button>
          </article>

          <article class="card plan escolhido">
            <div>
              <div style="display:flex; justify-content:space-between;">
                <h3>Plano Nacional / HQ</h3>
                <span class="badge badge-baixa">Recomendado</span>
              </div>
              <p class="muted">As 18 províncias num único comando — apuramento nacional e isolamento multi-campanha.</p>
              <p class="price">62 000 000 <small>AOA / eleição</small></p>
              <p style="font-size:12.5px; color:var(--muted); margin: 8px 0;">Capacidade: 2000 brigadistas · 80 contas</p>
              <ul style="list-style:none; display:grid; gap:6px; font-size:12px; margin: 12px 0;">
                <li><span style="color:var(--ok)">✓</span> Acesso Irrestrito aos 18 Círculos</li>
                <li><span style="color:var(--ok)">✓</span> Simulação Parlamentar Nacional (220 Deputados)</li>
                <li><span style="color:var(--ok)">✓</span> Canal WhatsApp com Triagem de Queixas</li>
                <li><span style="color:var(--ok)">✓</span> Suporte de Engenharia e RLS Multi-Tenancy</li>
              </ul>
            </div>
            <button class="primary" onclick="selecionarPlano('NACIONAL')">✓ Plano Selecionado</button>
          </article>
        </div>

        <div class="card" style="margin-top: 16px;">
          <div class="card-head">
            <div>
              <h2>Solicitação Formal de Proposta Comercial</h2>
              <p class="muted">Gere um protocolo oficial de contratação para entrega ao comitê financeiro da campanha.</p>
            </div>
          </div>

          <form onsubmit="gerarProtocolo(event)" style="display:grid; gap:12px;">
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px;">
              <div>
                <label style="display:block; font-size:11px; font-weight:700; color:var(--muted);">Partido / Coligação</label>
                <input required id="prop-partido" placeholder="ex: MPLA, UNITA, PRS, Frente Ampla..." style="width:100%">
              </div>
              <div>
                <label style="display:block; font-size:11px; font-weight:700; color:var(--muted);">Mandatário Responsável</label>
                <input required id="prop-nome" placeholder="Nome do coordenador de campanha" style="width:100%">
              </div>
              <div>
                <label style="display:block; font-size:11px; font-weight:700; color:var(--muted);">E-mail Institucional</label>
                <input required type="email" id="prop-email" placeholder="contato@campanha.ao" style="width:100%">
              </div>
              <div>
                <label style="display:block; font-size:11px; font-weight:700; color:var(--muted);">Telefone / WhatsApp</label>
                <input required id="prop-telefone" placeholder="+244 9..." style="width:100%">
              </div>
            </div>

            <div>
              <label style="display:block; font-size:11px; font-weight:700; color:var(--muted);">Observações / Requisitos Especiais de Segurança</label>
              <textarea id="prop-notas" rows="2" style="width:100%; background:#0d1218; border:1px solid var(--line); border-radius:6px; color:#fff; padding:8px;" placeholder="Número estimado de brigadistas e municípios de operação prioritária..."></textarea>
            </div>

            <div>
              <button class="primary" type="submit">Gerar Protocolo de Proposta Formal</button>
            </div>

            <div id="protocolo-resultado" style="display:none; padding:12px; background:var(--ok-bg); border:1px solid rgba(52,211,153,0.3); border-radius:6px; color:#6ee7b7; font-size:13px;"></div>
          </form>
        </div>
      </div>

    </main>
  </div>

  <!-- DADOS EMBUTIDOS E SCRIPTS DE CONTROLE -->
  <script>
    const DADOS = """ + json_dump + """;
    let mapa, geoLayer, contornoLayer;
    let camadaAtiva = 'zona';
    let fundoAtivo = 'ruas';
    let provSelecionada = 'Luanda';
    let tileLayerAtual;

    const FUNDOS = {
      ruas: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 18
      }),
      satelite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri Satellite',
        maxZoom: 18
      }),
      malha: null
    };

    function corMargem(m) {
      if (m >= 25) return '#1f8a62';
      if (m >= 15) return '#34d399';
      if (m >= 5)  return '#6ee7b7';
      if (m > -5)  return '#d6b25e';
      if (m > -15) return '#fb923c';
      if (m > -25) return '#f87171';
      return '#ef4444';
    }

    function corCusto(d) {
      if (d === 'BAIXA') return '#34d399';
      if (d === 'MEDIA' || d === 'BAIXA_MEDIA') return '#60a5fa';
      if (d === 'MEDIA_ALTA' || d === 'ALTA') return '#fb923c';
      return '#f87171';
    }

    function corScore(s) {
      if (s >= 80) return '#d6b25e';
      if (s >= 60) return '#c49a4a';
      if (s >= 40) return '#8a7348';
      if (s >= 20) return '#4d5a6a';
      return '#343d4a';
    }

    function obterCor(props) {
      if (camadaAtiva === 'margem') return corMargem(props.margem_perc);
      if (camadaAtiva === 'custo') return corCusto(props.custo_dificuldade);
      if (camadaAtiva === 'score') return corScore(props.score);
      // Padrão: Zonamento
      if (props.margem_perc >= 15) return '#34d399';
      if (props.margem_perc <= -15) return '#f87171';
      return '#fb923c';
    }

    function initMap() {
      if (mapa) return;
      mapa = L.map('mapa', {
        center: [-12.5, 17.8],
        zoom: 5.5,
        minZoom: 4,
        maxZoom: 12
      });

      tileLayerAtual = FUNDOS.ruas.addTo(mapa);

      // Contorno dourado de Angola
      if (DADOS.contorno && DADOS.contorno.features) {
        contornoLayer = L.geoJSON(DADOS.contorno, {
          style: { color: '#d6b25e', weight: 2.5, fillOpacity: 0, opacity: 0.95 }
        }).addTo(mapa);
      }

      // Polígonos das 18 províncias
      geoLayer = L.geoJSON(DADOS.geojson, {
        style: function(feat) {
          const sel = feat.properties.nome === provSelecionada;
          return {
            fillColor: obterCor(feat.properties),
            fillOpacity: fundoAtivo === 'malha' ? 0.75 : 0.42,
            color: sel ? '#d6b25e' : (fundoAtivo === 'malha' ? '#141b24' : '#ffffff'),
            weight: sel ? 3.5 : 1.2
          };
        },
        onEachFeature: function(feat, layer) {
          const p = feat.properties;
          layer.bindTooltip(`<strong>${p.nome}</strong><br>Margem: ${p.margem_perc}%<br>Score: ${p.score} · ${p.eleitores.toLocaleString('pt-PT')} eleitores`, {
            className: 'mapa-tip',
            sticky: true
          });
          layer.on('click', () => selecionarProvincia(p.nome));
          layer.on('mouseover', () => layer.setStyle({ weight: 2.8, color: '#d6b25e' }));
          layer.on('mouseout', () => {
            const sel = feat.properties.nome === provSelecionada;
            layer.setStyle({
              weight: sel ? 3.5 : 1.2,
              color: sel ? '#d6b25e' : (fundoAtivo === 'malha' ? '#141b24' : '#ffffff')
            });
          });
        }
      }).addTo(mapa);

      mapa.fitBounds(geoLayer.getBounds().pad(0.08));
    }

    function mudarCamada(camada) {
      camadaAtiva = camada;
      ['zona', 'margem', 'score', 'custo'].forEach(c => {
        document.getElementById('btn-camada-' + c).className = (c === camada ? 'activa' : '');
      });
      if (geoLayer) geoLayer.setStyle(feat => ({ fillColor: obterCor(feat.properties) }));
    }

    function mudarFundo(fundo) {
      fundoAtivo = fundo;
      ['ruas', 'sat', 'malha'].forEach(f => {
        const id = f === 'sat' ? 'sat' : f;
        document.getElementById('btn-fundo-' + id).className = (id === (fundo === 'satelite' ? 'sat' : fundo) ? 'activa' : '');
      });
      if (tileLayerAtual) mapa.removeLayer(tileLayerAtual);
      if (FUNDOS[fundo]) {
        tileLayerAtual = FUNDOS[fundo].addTo(mapa);
      }
      if (geoLayer) {
        geoLayer.setStyle(feat => ({
          fillOpacity: fundo === 'malha' ? 0.75 : 0.42,
          color: feat.properties.nome === provSelecionada ? '#d6b25e' : (fundo === 'malha' ? '#141b24' : '#ffffff')
        }));
      }
    }

    function resetarMapa() {
      if (geoLayer && mapa) {
        mapa.fitBounds(geoLayer.getBounds().pad(0.08));
      }
    }

    function selecionarProvincia(nome) {
      provSelecionada = nome;
      const prov = DADOS.provincias.find(p => p.nome === nome);
      if (!prov) return;

      document.getElementById('det-nome').innerText = prov.nome;
      document.getElementById('det-regiao').innerText = prov.codigo;
      const zona = prov.margem_perc >= 15 ? 'BASTIAO' : (prov.margem_perc <= -15 ? 'OPOSICAO' : 'CAMPO_BATALHA');
      const zonaRotulo = prov.margem_perc >= 15 ? 'Bastião' : (prov.margem_perc <= -15 ? 'Oposição' : 'Campo de Batalha');
      
      const elZona = document.getElementById('det-zona');
      elZona.className = 'zona ' + zona;
      elZona.innerText = zonaRotulo;

      const elMargem = document.getElementById('det-margem');
      elMargem.innerText = (prov.margem_perc > 0 ? '+' : '') + prov.margem_perc.toLocaleString('pt-PT') + '%';
      elMargem.style.color = prov.margem_perc >= 0 ? 'var(--ok)' : 'var(--bad)';

      document.getElementById('det-eleitores').innerText = prov.eleitores.toLocaleString('pt-PT');
      document.getElementById('det-abstencao').innerText = prov.abstencao_perc.toLocaleString('pt-PT') + '%';
      document.getElementById('det-jovens').innerText = prov.jovens_perc.toLocaleString('pt-PT') + '%';

      // Deputados
      const totalSeats = Math.max(prov.hondt_mpla + prov.hondt_unita, 1);
      document.getElementById('det-bar-mpla').style.width = ((prov.hondt_mpla / totalSeats) * 100) + '%';
      document.getElementById('det-bar-unita').style.width = ((prov.hondt_unita / totalSeats) * 100) + '%';
      document.getElementById('det-pill-mpla').innerHTML = `<i class="seat-dot mpla"></i> ${prov.hondt_mpla} MPLA`;
      document.getElementById('det-pill-unita').innerHTML = `<i class="seat-dot unita"></i> ${prov.hondt_unita} UNITA`;

      if (prov.votos_virar > 0) {
        document.getElementById('det-virar-texto').innerHTML = `Faltam <strong>+${prov.votos_virar.toLocaleString('pt-PT')}</strong> votos para o MPLA virar próxima cadeira.`;
      } else {
        document.getElementById('det-virar-texto').innerHTML = `Maioria absoluta provincial conquistada neste círculo.`;
      }

      // Score
      document.getElementById('det-score').innerHTML = `${prov.score} <small>/ 100</small>`;
      document.getElementById('det-potencial').innerText = prov.potencial;
      document.getElementById('det-bar-potencial').style.width = Math.min(prov.potencial, 100) + '%';
      document.getElementById('det-comp').innerText = prov.competitividade;
      document.getElementById('det-bar-comp').style.width = Math.min(prov.competitividade, 100) + '%';
      document.getElementById('det-custo-badge').innerText = `${prov.custo_fator}× (${prov.custo_dificuldade})`;

      // Destaque na tabela
      document.querySelectorAll('#tbody-provincias tr').forEach(tr => {
        tr.className = tr.getAttribute('data-nome') === nome ? 'activa' : '';
      });

      if (geoLayer) {
        geoLayer.eachLayer(layer => {
          const isSel = layer.feature.properties.nome === nome;
          layer.setStyle({
            weight: isSel ? 3.5 : 1.2,
            color: isSel ? '#d6b25e' : (fundoAtivo === 'malha' ? '#141b24' : '#ffffff')
          });
          if (isSel && mapa) {
            mapa.panTo(layer.getBounds().getCenter(), { animate: true });
          }
        });
      }
    }

    function popularTabelaProvincias() {
      const tbody = document.getElementById('tbody-provincias');
      tbody.innerHTML = '';
      DADOS.provincias.forEach(p => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-nome', p.nome);
        if (p.nome === provSelecionada) tr.className = 'activa';
        const zonaClass = p.margem_perc >= 15 ? 'BASTIAO' : (p.margem_perc <= -15 ? 'OPOSICAO' : 'CAMPO_BATALHA');
        const zonaLabel = p.margem_perc >= 15 ? 'Bastião' : (p.margem_perc <= -15 ? 'Oposição' : 'Disputa');
        tr.innerHTML = `
          <td><strong>${p.nome}</strong></td>
          <td><span class="zona ${zonaClass}">${zonaLabel}</span></td>
          <td><span style="color:var(--mpla)">${p.hondt_mpla}</span>-<span style="color:var(--unita)">${p.hondt_unita}</span></td>
          <td class="num"><strong style="color:var(--accent)">${p.score}</strong></td>
        `;
        tr.onclick = () => selecionarProvincia(p.nome);
        tbody.appendChild(tr);
      });
    }

    function filtrarTabela() {
      const q = document.getElementById('filtro-nome').value.toLowerCase().trim();
      document.querySelectorAll('#tbody-provincias tr').forEach(tr => {
        const nome = tr.getAttribute('data-nome').toLowerCase();
        tr.style.display = nome.includes(q) ? '' : 'none';
      });
    }

    // === MOTOR HONDT CLIENT-SIDE ===
    function popularSelectHondt() {
      const select = document.getElementById('hondt-select-provincia');
      select.innerHTML = '';
      DADOS.provincias.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.nome;
        opt.innerText = p.nome;
        select.appendChild(opt);
      });
      select.value = 'Huambo';
    }

    function calcularHondtJS(votosA, votosB, votosOutros, assentosTotais = 5) {
      let quocientes = [];
      for (let s = 1; s <= assentosTotais; s++) {
        quocientes.push({ partido: 'MPLA', q: votosA / s });
        quocientes.push({ partido: 'UNITA', q: votosB / s });
      }
      quocientes.sort((x, y) => y.q - x.q);
      let eleitos = quocientes.slice(0, assentosTotais);
      let corte = eleitos[assentosTotais - 1].q;
      let ultimo = eleitos[assentosTotais - 1].partido;

      let contagem = { MPLA: 0, UNITA: 0 };
      eleitos.forEach(e => contagem[e.partido]++);

      // Próximo assento MPLA
      let proxMPLA = (contagem.MPLA + 1) * corte + 1;
      let faltamMPLA = Math.max(0, Math.ceil(proxMPLA - votosA));

      // Próximo assento UNITA
      let proxUNITA = (contagem.UNITA + 1) * corte + 1;
      let faltamUNITA = Math.max(0, Math.ceil(proxUNITA - votosB));

      return {
        assentos: contagem,
        corte: Math.floor(corte),
        ultimo: ultimo,
        faltamMPLA: faltamMPLA,
        faltamUNITA: faltamUNITA
      };
    }

    function atualizarSimuladorHondt() {
      const provNome = document.getElementById('hondt-select-provincia').value;
      const prov = DADOS.provincias.find(p => p.nome === provNome);
      if (!prov) return;

      const cA = parseInt(document.getElementById('slider-choque-mpla').value, 10);
      const cB = parseInt(document.getElementById('slider-choque-unita').value, 10);

      document.getElementById('val-choque-mpla').innerText = (cA > 0 ? '+' : '') + cA + '%';
      document.getElementById('val-choque-unita').innerText = (cB > 0 ? '+' : '') + cB + '%';

      const vA = Math.round(prov.votos_mpla * (1 + cA / 100));
      const vB = Math.round(prov.votos_unita * (1 + cB / 100));
      const res = calcularHondtJS(vA, vB, prov.votos_outros, 5);

      document.getElementById('hondt-res-titulo').innerText = `Projeção: ${provNome} (5 Deputados)`;
      document.getElementById('hondt-bar-mpla').style.width = ((res.assentos.MPLA / 5) * 100) + '%';
      document.getElementById('hondt-bar-unita').style.width = ((res.assentos.UNITA / 5) * 100) + '%';
      document.getElementById('hondt-pill-mpla').innerHTML = `<i class="seat-dot mpla"></i> ${res.assentos.MPLA} MPLA (${res.assentos.MPLA * 20}%)`;
      document.getElementById('hondt-pill-unita').innerHTML = `<i class="seat-dot unita"></i> ${res.assentos.UNITA} UNITA (${res.assentos.UNITA * 20}%)`;

      document.getElementById('hondt-resumo-verbal').innerText = `MPLA elege ${res.assentos.MPLA} deputados; UNITA elege ${res.assentos.UNITA} deputados.`;
      document.getElementById('hondt-corte').innerText = res.corte.toLocaleString('pt-PT') + ' votos';
      document.getElementById('hondt-ultimo').innerText = res.ultimo;

      document.getElementById('hondt-virar-mpla').innerHTML = res.faltamMPLA > 0 
        ? `Precisa de <strong>+${res.faltamMPLA.toLocaleString('pt-PT')}</strong> votos para ganhar mais 1 assento.`
        : `Já conquistou todos os 5 assentos possíveis neste cenário.`;

      document.getElementById('hondt-virar-unita').innerHTML = res.faltamUNITA > 0 
        ? `Precisa de <strong>+${res.faltamUNITA.toLocaleString('pt-PT')}</strong> votos para ganhar mais 1 assento.`
        : `Já conquistou todos os 5 assentos possíveis neste cenário.`;
    }

    function popularTabelaHondt() {
      const tbody = document.getElementById('tbody-hondt');
      tbody.innerHTML = '';
      DADOS.provincias.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${p.nome}</strong></td>
          <td><span class="seat-pill mpla" style="padding:2px 8px">${p.hondt_mpla}</span></td>
          <td><span class="seat-pill unita" style="padding:2px 8px">${p.hondt_unita}</span></td>
          <td class="num">${p.quociente_corte.toLocaleString('pt-PT')}</td>
          <td>${p.votos_virar > 0 ? `+${p.votos_virar.toLocaleString('pt-PT')}` : '—'} <span class="badge badge-${p.volatilidade.toLowerCase()}">${p.volatilidade}</span></td>
        `;
        tr.onclick = () => {
          document.getElementById('hondt-select-provincia').value = p.nome;
          atualizarSimuladorHondt();
        };
        tbody.appendChild(tr);
      });
    }

    function resetarHondt() {
      document.getElementById('slider-choque-mpla').value = 0;
      document.getElementById('slider-choque-unita').value = 0;
      atualizarSimuladorHondt();
    }

    // === CHATBOT WHATSAPP SIMULATOR ===
    function enviarMensagemBot(texto) {
      document.getElementById('chat-input').value = texto;
      enviarMensagemManual();
    }

    function enviarMensagemManual() {
      const input = document.getElementById('chat-input');
      const txt = input.value.trim();
      if (!txt) return;
      input.value = '';

      const chat = document.getElementById('chat-box');
      chat.innerHTML += `<div class="msg user">${txt}</div>`;
      chat.scrollTop = chat.scrollHeight;

      setTimeout(() => {
        let resp = '';
        const upper = txt.toUpperCase();
        if (upper.startsWith('MESA')) {
          const mun = txt.slice(4).trim() || 'Talatona';
          resp = `📍 <strong>Assembleia Pública Localizada:</strong><br>Município: ${mun}<br>Local de Voto: Escola Primária 2027<br>Salas: Mesas 01 a 08<br><span style="font-size:11px; color:var(--muted)">[SIMULADO: Confirmação oficial exclusiva nos cadernos CNE]</span>`;
        } else if (upper.startsWith('QUEIXA')) {
          resp = `✅ <strong>Queixa Comunitária Registada:</strong><br>Protocolo: <code>QX-${Math.floor(Math.random()*900000+100000)}</code><br>Telefone mascarado: +244 9xx *** 111 (HMAC SHA-256)<br>Encaminhado para a central de mobilização da campanha.`;
        } else {
          resp = `🇦🇴 <strong>Comandos Disponíveis:</strong><br>• <strong>MESA &lt;município&gt;</strong> — Consultar centro de votação.<br>• <strong>QUEIXA &lt;tema&gt; &lt;município&gt; &lt;texto&gt;</strong> — Reportar água, luz ou transporte.<br>• <strong>AJUDA</strong> — Ver instruções.`;
        }
        chat.innerHTML += `<div class="msg bot">${resp}</div>`;
        chat.scrollTop = chat.scrollHeight;
      }, 350);
    }

    function simularNovaAta() {
      const mesas = ['MESA-1090 (Cazenga)', 'MESA-0552 (Lubango)', 'MESA-3120 (Saurimo)', 'MESA-0081 (Cabinda)'];
      const m = mesas[Math.floor(Math.random()*mesas.length)];
      const vA = Math.floor(Math.random()*120 + 80);
      const vB = Math.floor(Math.random()*120 + 80);
      const agora = new Date().toLocaleTimeString('pt-PT');
      const hash = Math.random().toString(16).substring(2, 10) + '...' + Math.random().toString(16).substring(2, 6);

      const tbody = document.getElementById('tbody-atas');
      const tr = document.createElement('tr');
      tr.style.background = 'rgba(52, 211, 153, 0.1)';
      tr.innerHTML = `
        <td><code>${agora}</code></td>
        <td><strong>${m.split(' ')[0]}</strong></td>
        <td>${m.split(' ')[1] || 'Angola'}</td>
        <td class="num" style="color:var(--mpla); font-weight:700">${vA}</td>
        <td class="num" style="color:var(--unita); font-weight:700">${vB}</td>
        <td><code>${hash}</code></td>
        <td><span class="badge badge-baixa">✓ Ed25519 VÁLIDA</span></td>
      `;
      tbody.insertBefore(tr, tbody.firstChild);
    }

    function selecionarPlano(p) {
      alert(`Plano ${p} selecionado. O formulário abaixo foi preenchido para este âmbito.`);
      mudarAba('planos');
    }

    function gerarProtocolo(e) {
      e.preventDefault();
      const partido = document.getElementById('prop-partido').value;
      const nome = document.getElementById('prop-nome').value;
      const protocolo = 'AO-2027-' + Math.floor(Math.random()*900000 + 100000);

      const res = document.getElementById('protocolo-resultado');
      res.style.display = 'block';
      res.innerHTML = `
        <strong>✓ PROTOCOLO COMERCIAL GERADO COM SUCESSO:</strong> <code>${protocolo}</code><br>
        Organização: <strong>${partido}</strong> · Mandatário: <strong>${nome}</strong><br>
        Ambiente: Plano Nacional / HQ (Acesso Irrestrito 18 Províncias & Apuramento Dia D).<br>
        A nossa equipa de relações institucionais entrará em contacto nas próximas 24 horas úteis.
      `;
    }

    // Navegação de Abas
    const TITULOS = {
      dashboard: ["Dashboard Territorial & Campanha", "Inteligência geoespacial, cálculo de Hondt e priorização logística integrada."],
      hondt: ["Simulador Parlamentar de D'Hondt", "Cálculo algorítmico de mandatos provinciais com sensibilidade de choque eleitoral."],
      diad: ["Central de Apuramento Paralelo (Dia D)", "Transmissão criptográfica de atas físicas com assinatura Ed25519 e geofence."],
      eleitor: ["Canal WhatsApp do Eleitor (+244)", "Atendimento cívico automatizado e radar de queixas urbanas municipal."],
      planos: ["Catálogo Comercial & Formalização", "Especificação de capacidades operacionais, brigadas de terreno e SKUs para 2027."]
    };

    function mudarAba(id) {
      document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
      const target = document.getElementById('tab-' + id);
      if (target) target.style.display = 'grid';

      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.onclick && b.onclick.toString().includes(id));
      if (activeBtn) activeBtn.classList.add('active');

      if (TITULOS[id]) {
        document.getElementById('view-title').innerText = TITULOS[id][0];
        document.getElementById('view-subtitle').innerText = TITULOS[id][1];
      }

      if (id === 'dashboard') {
        setTimeout(() => {
          if (mapa) mapa.invalidateSize();
        }, 150);
      }
    }

    window.onload = function() {
      initMap();
      popularTabelaProvincias();
      popularSelectHondt();
      popularTabelaHondt();
      atualizarSimuladorHondt();
    };
  </script>
</body>
</html>
"""

# Salvar como apresentacao_cliente.html e demo_cliente.html na raiz do projeto
out_path = ROOT / "apresentacao_cliente.html"
with open(out_path, "w", encoding="utf-8") as f:
    f.write(html_template)

demo_path = ROOT / "demo_cliente.html"
shutil.copyfile(out_path, demo_path)

web_public_demo = ROOT / "web" / "public" / "demo.html"
web_public_demo.parent.mkdir(parents=True, exist_ok=True)
shutil.copyfile(out_path, web_public_demo)

print(f"Sucesso! Ficheiro gerado com {len(html_template)} bytes em:")
print(f" - {out_path}")
print(f" - {demo_path}")
print(f" - {web_public_demo}")
