import L from "leaflet";
import React, { useEffect, useMemo, useRef } from "react";
import { CircleMarker, GeoJSON, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { corCamada, fmtInt, fmtPct, rotuloZona } from "./territorio.js";

/** África centro-sul: Angola visível ao centro, com RDC, Congo, Zâmbia e Namíbia ao redor. */
const REGIAO = [
  [-29.5, 4.5],
  [7.5, 36.5],
];

const FUNDOS = {
  ruas: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  satelite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
  },
};

function boundsDe(features) {
  const poligonos = (features || []).filter((f) => f?.geometry && f.geometry.type !== "Point");
  if (!poligonos.length) return null;
  const camada = L.geoJSON({ type: "FeatureCollection", features: poligonos });
  const caixa = camada.getBounds();
  return caixa.isValid() ? caixa : null;
}

function Enquadrar({ malhaId, features, alvoNome, resetTrigger }) {
  const map = useMap();
  const actual = useRef(features);
  actual.current = features;
  useEffect(() => {
    const malha = actual.current || [];
    const alvo = malha.find((f) => f.properties?.nome === alvoNome);
    const caixa = alvo ? boundsDe([alvo]) : boundsDe(malha);
    if (!caixa) return;
    map.fitBounds(caixa.pad(alvo ? 0.08 : 0.35), { maxZoom: alvo ? 8 : 5.4, animate: true });
  }, [map, malhaId, alvoNome, resetTrigger]);
  return null;
}

function Creditos({ fundo }) {
  const map = useMap();
  useEffect(() => {
    map.attributionControl.setPrefix("Leaflet");
    map.attributionControl.addAttribution("geo_angola · CC BY 4.0");
  }, [map, fundo]);
  return null;
}

function tooltipHtml(props) {
  const zona = rotuloZona(props.zonamento_activo || props.zonamento);
  const geom = props.proveniencia_geometria === "SIMULADO" ? "<br/><em>Sem traçado oficial</em>" : "";
  return `<strong>${props.nome || "Território"}</strong><br/>${zona}<br/>Margem ${fmtPct(props.margem_apurada_perc)}<br/>Score ${props.score_prioridade ?? props.score ?? "—"} · ${fmtInt(props.eleitores_cne)} eleitores${geom}`;
}

function estilo(feature, { camada, selecionado, filtro, fundo }) {
  const props = feature?.properties || {};
  const zona = props.zonamento_activo || props.zonamento;
  const dim = filtro && zona !== filtro;
  const activo = selecionado && (props.nome === selecionado || props.codigo_dpa === selecionado);
  const comFundo = fundo !== "nenhum";
  return {
    color: activo ? "#f5c518" : comFundo ? "#f4eee4" : "#100c0b",
    weight: activo ? 2.4 : comFundo ? 1.1 : 1,
    fillColor: corCamada(camada, props),
    fillOpacity: dim ? 0.08 : comFundo ? 0.38 : 0.78,
    opacity: dim ? 0.35 : 1,
  };
}

export default function MapaTerritorio({
  features,
  contorno,
  onSelect,
  selecionado,
  camada = "zona",
  filtro = "",
  compacto = false,
  fundo = "ruas",
  carregando = false,
  resetTrigger = 0,
}) {
  const lista = features || [];
  const poligonos = useMemo(() => lista.filter((f) => f.geometry?.type !== "Point"), [lista]);
  const pontos = useMemo(() => lista.filter((f) => f.geometry?.type === "Point"), [lista]);
  const malhaId = poligonos.map((f) => f.properties?.codigo_dpa || f.properties?.nome).join("|");
  const tiles = FUNDOS[fundo];

  if (carregando) {
    return <div className={compacto ? "mapa mapa-compacto skeleton" : "mapa skeleton"} aria-busy="true" />;
  }

  if (!lista.length) {
    return (
      <div className={compacto ? "mapa mapa-compacto" : "mapa"} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p className="vazio">A malha territorial não está disponível para este plano.</p>
      </div>
    );
  }

  const chave = `${camada}|${filtro}|${selecionado}|${fundo}|${poligonos.map((f) => f.properties?.codigo_dpa || f.properties?.nome).join(",")}`;

  return (
    <MapContainer
      center={[-12.3, 17.6]}
      zoom={5}
      className={compacto ? "mapa mapa-compacto" : "mapa"}
      scrollWheelZoom
      minZoom={3}
      maxZoom={12}
      maxBounds={REGIAO}
      maxBoundsViscosity={0.55}
      worldCopyJump={false}
      aria-label="Mapa de zonamento de Angola e países vizinhos"
    >
      <Creditos fundo={fundo} />
      {tiles && (
        <TileLayer
          url={tiles.url}
          attribution={tiles.attribution}
          maxZoom={19}
          crossOrigin
        />
      )}
      <Enquadrar malhaId={malhaId} features={poligonos} alvoNome={selecionado} resetTrigger={resetTrigger} />
      {contorno?.features && (
        <GeoJSON
          data={contorno}
          interactive={false}
          style={{ color: "#f5c518", weight: 2.2, fillOpacity: 0, opacity: 0.95 }}
        />
      )}
      <GeoJSON
        key={chave}
        data={{ type: "FeatureCollection", features: poligonos }}
        style={(feature) => estilo(feature, { camada, selecionado, filtro, fundo })}
        onEachFeature={(feature, layer) => {
          layer.bindTooltip(tooltipHtml(feature.properties || {}), {
            sticky: true,
            className: "mapa-tip",
            opacity: 0.97,
          });
          layer.on("click", () => onSelect?.(feature.properties));
          layer.on("mouseover", () => layer.setStyle({ weight: 2.4, color: "#f5c518" }));
          layer.on("mouseout", () => layer.setStyle(estilo(feature, { camada, selecionado, filtro, fundo })));
        }}
      />
      {pontos.map((f) => {
        const [lng, lat] = f.geometry.coordinates;
        const props = f.properties || {};
        const activo = selecionado === props.nome;
        return (
          <CircleMarker
            key={props.codigo_dpa || props.nome}
            center={[lat, lng]}
            radius={activo ? 11 : 8}
            pathOptions={{
              color: activo ? "#f5c518" : "#f4eee4",
              weight: 1.5,
              fillColor: corCamada(camada, props),
              fillOpacity: 0.92,
              dashArray: "3 3",
            }}
            eventHandlers={{ click: () => onSelect?.(props) }}
          >
            <Tooltip className="mapa-tip" sticky>
              {props.nome} · sem traçado oficial (DPA 2024)
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
