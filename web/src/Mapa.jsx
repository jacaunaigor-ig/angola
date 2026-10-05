import { useEffect } from "react";
import { GeoJSON, MapContainer, useMap } from "react-leaflet";
import { corZona } from "./territorio.js";

const ANGOLA = [
  [-18.15, 11.45],
  [-4.3, 24.15],
];

function Enquadrar() {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(ANGOLA, { padding: [18, 18] });
  }, [map]);
  return null;
}

export default function MapaTerritorio({ features, contorno, onSelect }) {
  if (!features?.length) {
    return <p className="vazio">A malha territorial não está disponível para este plano.</p>;
  }
  return (
    <MapContainer center={[-12.3, 17.6]} zoom={5} className="mapa" scrollWheelZoom aria-label="Mapa de zonamento de Angola">
      <Enquadrar />
      <GeoJSON
        key={features.map((f) => `${f.properties?.codigo_dpa || f.properties?.nome}:${f.properties?.zonamento_activo}`).join("|")}
        data={{ type: "FeatureCollection", features }}
        style={(feature) => {
          const zona = feature?.properties?.zonamento_activo || feature?.properties?.zonamento;
          return { color: "#0b1016", weight: 1, fillColor: corZona(zona), fillOpacity: 0.72 };
        }}
        onEachFeature={(feature, layer) => {
          layer.bindTooltip(feature?.properties?.nome || "Território", { sticky: true });
          layer.on("click", () => onSelect?.(feature.properties));
        }}
      />
      {contorno?.features && (
        <GeoJSON data={contorno} interactive={false} style={{ color: "#f4f1e8", weight: 1.4, fillOpacity: 0, opacity: 0.85 }} />
      )}
    </MapContainer>
  );
}
