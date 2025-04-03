import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

function LivePage() {
  const [vessels, setVessels] = useState([]);

  useEffect(() => {
    fetch("http://172.16.84.181:8000/live")
      .then(res => res.json())
      .then(data => setVessels(data.data || []));
  }, []);

  return (
    <div>
      <h2>Live Tug Positions</h2>
      <MapContainer center={[37.7749, -122.4194]} zoom={4} style={{ height: "90vh" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {vessels
          .filter(v => v.latitude && v.longitude && !isNaN(v.latitude) && !isNaN(v.longitude))
          .map((v, i) => (
          <Marker
            key={i}
            position={[v.latitude, v.longitude]}
            icon={L.icon({ iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png" })}
          >
            <Popup>
              <b>{v.name}</b><br />
              MMSI: {v.mmsi}<br />
              Speed: {v.speed} kn<br />
              Destination: {v.destination}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default LivePage;