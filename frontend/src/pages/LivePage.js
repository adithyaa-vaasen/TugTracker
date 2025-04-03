import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";

function LivePage() {
  const [vessels, setVessels] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/live")
      .then(res => res.json())
      .then(data => setVessels(data.data || []));
  }, []);

  const validVessels = vessels.filter(v => v.latitude && v.longitude);

  const center = validVessels.length > 0
    ? [validVessels[0].latitude, validVessels[0].longitude]
    : [37.7749, -122.4194];

  return (
    <div>
      <h2>Live Tug Positions</h2>
      <MapContainer center={center} zoom={6} style={{ height: "90vh" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {validVessels.map((v, i) => (
          <CircleMarker
            key={i}
            center={[v.latitude, v.longitude]}
            radius={6}
            pathOptions={{ color: "blue" }}
          >
            <Popup>
              <b>{v.name}</b><br />
              MMSI: {v.mmsi}<br />
              Speed: {v.speed} kn<br />
              Destination: {v.destination}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}

export default LivePage;