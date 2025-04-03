import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polyline } from "react-leaflet";

function HistoricalPage() {
  const [positions, setPositions] = useState([]);

  useEffect(() => {
    const mmsi = prompt("Enter MMSI to view history:");
    fetch(`http://172.16.84.181:8000/historical?mmsi=${mmsi}`)
      .then(res => res.json())
      .then(data => {
        const points = (data.data || []).map(d => [d.latitude, d.longitude]);
        setPositions(points);
      });
  }, []);

  return (
    <div>
      <h2>Historical Tug Path</h2>
      <MapContainer center={[37.7749, -122.4194]} zoom={4} style={{ height: "90vh" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {positions.length > 0 && <Polyline positions={positions} color="blue" />}
      </MapContainer>
    </div>
  );
}

export default HistoricalPage;