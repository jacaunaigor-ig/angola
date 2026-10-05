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
    return <p className="muted">A malha ainda não chegou da API.</p>;
  }
  return (
    <MapContainer center={[-12.3, 17.6]} zoom={5} className="mapa" scrollWheelZoom zoomControl>
      <Enquadrar />
      <GeoJSON
        key={features.map((f) => f.properties?.codigo_dpa || f.properties?.nome).join("|")}
        data={{ type: "FeatureCollection", features }}
        style={(feature) => {
          const zona = feature?.properties?.zonamento_activo || feature?.properties?.zonamento;
          const cor = corZona(zona);
          return { color: "#0b1016", weight: 1, fillColor: cor, fillOpacity: 0.72 };
        }}
        onEachFeature={(feature, layer) => {
          const nome = feature?.properties?.nome || "Território";
          layer.bindTooltip(nome, { sticky: true });
          layer.on("click", () => onSelect?.(feature.properties));
        }}
      />
      {contorno?.features && (
        <GeoJSON
          data={contorno}
          interactive={false}
          style={{ color: "#f4f1e8", weight: 1.4, fillOpacity: 0, opacity: 0.85 }}
        />
      )}
    </MapContainer>
  );
}
