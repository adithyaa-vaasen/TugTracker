import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap
} from "react-leaflet";
import L from "leaflet";
import "leaflet-polylinedecorator";

function HistoricalPage() {
  const [positions, setPositions] = useState([]);

  useEffect(() => {
    const mmsi = prompt("Enter MMSI to view history:");
    fetch(`http://127.0.0.1:8000/historical?mmsi=${mmsi}`)
      .then(res => res.json())
      .then(data => {
        const points = (data.data || [])
          .filter(d => d.latitude && d.longitude)
          .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        setPositions(points);
      });
  }, []);

  const start = positions[0];
  const end = positions[positions.length - 1];
  const path = positions.map(p => [p.latitude, p.longitude]);

  const ArrowDecorator = () => {
    const map = useMap();
    useEffect(() => {
      if (!map || path.length < 2) return;

      const polyline = L.polyline(path);
      const decorator = L.polylineDecorator(polyline, {
        patterns: [
          {
            offset: 25,
            repeat: 50,
            symbol: L.Symbol.arrowHead({
              pixelSize: 10,
              polygon: false,
              pathOptions: { stroke: true, color: "blue" }
            })
          }
        ]
      });
      decorator.addTo(map);

      return () => {
        map.removeLayer(decorator);
      };
    }, [map, path]);

    return null;
  };

  const triangleIcon = L.divIcon({
    className: "triangle-icon",
    html: "🔺",
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  const circleIcon = L.divIcon({
    className: "circle-icon",
    html: "🟢",
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  return (
    <div>
      <h2>Historical Tug Path</h2>
      <MapContainer center={path[0] || [37.7749, -122.4194]} zoom={7} style={{ height: "90vh" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {path.length > 0 && (
          <>
            <Polyline positions={path} color="blue" />
            <ArrowDecorator />
            {start && (
              <Marker position={[start.latitude, start.longitude]} icon={circleIcon}>
                <Popup>Start</Popup>
              </Marker>
            )}
            {end && (
              <Marker position={[end.latitude, end.longitude]} icon={triangleIcon}>
                <Popup>End</Popup>
              </Marker>
            )}
          </>
        )}
      </MapContainer>
    </div>
  );
}

export default HistoricalPage;