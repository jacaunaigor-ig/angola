import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import { corZona } from "./territorio.js";

export default function MapaTerritorio({ features, onSelect }) {
  if (!features?.length) {
    return <p className="muted">A malha ainda não chegou da API.</p>;
  }
  return (
    <MapContainer center={[-12.2, 17.5]} zoom={5} className="mapa" scrollWheelZoom>
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <GeoJSON
        key={features.map((f) => f.properties?.codigo_dpa || f.properties?.nome).join("|")}
        data={{ type: "FeatureCollection", features }}
        style={(feature) => {
          const zona = feature?.properties?.zonamento_activo || feature?.properties?.zonamento;
          const cor = corZona(zona);
          return { color: "#0F172A", weight: 1.5, fillColor: cor, fillOpacity: 0.62 };
        }}
        onEachFeature={(feature, layer) => {
          const nome = feature?.properties?.nome || "Território";
          layer.bindTooltip(nome);
          layer.on("click", () => onSelect?.(feature.properties));
        }}
      />
    </MapContainer>
  );
}
