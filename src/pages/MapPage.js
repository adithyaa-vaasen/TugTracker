// Full version of Tug Tracker frontend with multi-select dropdown and all original features re-integrated

import React, { useEffect, useState, useRef } from "react";
import Select from "react-select";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Tooltip
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-polylinedecorator";

function MapPage() {
  const [mode, setMode] = useState("live");
  const [vessels, setVessels] = useState([]);
  const [selectedVessels, setSelectedVessels] = useState([]);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [visiblePath, setVisiblePath] = useState([]);
  const [sliderIndex, setSliderIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(100);
  const [selectedName, setSelectedName] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [fullHistory, setFullHistory] = useState([]);
  const [historyRange, setHistoryRange] = useState(1);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef();

  const speedOptions = {
    500: 1,
    250: 1,
    100: 1,
    50: 1
  };

  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchLiveData = () => {
    if (mode === "live") {
      setLoading(true);
      fetch("https://tug.foss.com/live")
        .then(res => res.json())
        .then(data => setVessels(data.data || []))
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    if (isPlaying && mode === "historical") {
      const timer = setInterval(() => {
        setSliderIndex(prev => {
          const nextIndex = Math.min(prev + (speedOptions[playSpeed] || 1), history.length - 1);
          if (nextIndex >= history.length - 1) setIsPlaying(false);
          return nextIndex;
        });
      }, playSpeed);
      return () => clearInterval(timer);
    }
  }, [isPlaying, mode, history, playSpeed]);

  useEffect(() => {
    if (history.length > 0) {
      setVisiblePath(history.slice(0, sliderIndex + 1));
    }
  }, [sliderIndex, history]);

  useEffect(() => {
    if (mode === "historical" && fullHistory.length > 0) {
      const cutoff = new Date(Date.now() - historyRange * 24 * 60 * 60 * 1000);
      const sliced = fullHistory.filter(p => new Date(p.created_date) >= cutoff);
      setHistory(sliced);
      setVisiblePath(sliced);
      setSliderIndex(0);
    }
  }, [historyRange]);

  const getColor = (speed) => {
    if (speed < 8.5) return "green";
    if (speed <= 9) return "yellow";
    return "red";
  };

  const SegmentedPath = () => visiblePath.slice(0, -1).map((point, i) => {
    const next = visiblePath[i + 1];
    const color = getColor(point.speed);
    return (
      <Polyline
        key={i}
        positions={[[point.latitude, point.longitude], [next.latitude, next.longitude]]}
        pathOptions={{ color }}
      />
    );
  });

  const currentCenter = mode === "live"
    ? (selectedVessels[0] ? [selectedVessels[0].latitude, selectedVessels[0].longitude] : (vessels[0] ? [vessels[0].latitude, vessels[0].longitude] : [36.5, -122]))
    : (visiblePath[0] || [36.5, -122]);

  const rotatedIcon = (angle) => L.divIcon({
    className: "ship-icon",
    html: `<div style="font-size: 20px; transform: rotate(${angle - 90}deg); color: #5af3f4">\u27A4</div>`
  });

  const startIcon = L.divIcon({ html: "\ud83d\udfe2", iconSize: [20, 20], iconAnchor: [10, 10] });

  const historicalEndIcon = (angle) => L.divIcon({
    html: `<div style="font-size: 20px; transform: rotate(${angle - 90}deg); color: #5af3f4">\u27A4</div>`
  });

  const vesselOptions = vessels.map(v => ({ value: v.mmsi, label: `${v.name} (${v.mmsi})`, vessel: v }));

  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", padding: 10 }}>
        <img src="/logo.png" alt="Logo" style={{ height: 40 }} />
        <h2>Saltchuk Marine Tug Tracker</h2>
        <span>Click or Select a vessel to view historical data</span>
      </header>

      {loadingHistory && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "#fff", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 6px rgba(0,0,0,0.2)", zIndex: 1000 }}>
          <h3>Loading Historical Data...</h3>
        </div>
      )}

      {loading && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "#fff", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 6px rgba(0,0,0,0.2)", zIndex: 1000 }}>
          <h3>Loading...</h3>
        </div>
      )}

      <div style={{ padding: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {mode === "historical" ? (
            <>
              <h3>{selectedName} Historical Activity</h3>
              <button onClick={() => {
                setMode("live");
                setSelected(null);
                setHistory([]);
                setVisiblePath([]);
                setSliderIndex(0);
                setIsPlaying(false);
              }}>🔄 Back to Live</button>
              {history.length > 0 && (
                <>
                  <button onClick={() => setIsPlaying(!isPlaying)}>
                    {isPlaying ? "⏸ Pause" : "▶️ Play"}
                  </button>
                  <label>
                    Speed:
                    <select value={playSpeed} onChange={(e) => setPlaySpeed(Number(e.target.value))}>
                      <option value={500}>Slow</option>
                      <option value={250}>Normal</option>
                      <option value={100}>Fast</option>
                      <option value={50}>Very Fast</option>
                    </select>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={history.length - 1}
                    value={sliderIndex}
                    onChange={(e) => setSliderIndex(parseInt(e.target.value))}
                    style={{ width: "300px" }}
                  />
                  <span>{visiblePath[sliderIndex]?.created_date}</span>
                </>
              )}
            </>
          ) : (
            <div style={{ minWidth: "300px" }}>
              <Select
                options={vesselOptions}
                isMulti
                placeholder="Select Tugs..."
                onChange={(selectedOptions) => {
                  setSelectedVessels(selectedOptions.map(opt => opt.vessel));
                }}
              />
            </div>
          )}
        </div>

        {mode === "historical" && (
          <div style={{ display: "flex", gap: "10px" }}>
            {[1, 7, 30].map(days => (
              <button
                key={days}
                style={{
                  padding: "6px 12px",
                  backgroundColor: historyRange === days ? "#007bff" : "#eee",
                  color: historyRange === days ? "white" : "black",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
                onClick={() => setHistoryRange(days)}
              >
                {days === 1 ? "1 Day" : days === 7 ? "7 Days" : "30 Days"}
              </button>
            ))}
          </div>
        )}
      </div>

      <MapContainer center={currentCenter} zoom={6} style={{ height: "85vh" }} whenReady={(map) => { mapRef.current = map.target }}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
        />

        {mode === "live" && (selectedVessels.length > 0 ? selectedVessels : vessels).map((v, i) => (
          <Marker
            key={i}
            position={[v.latitude, v.longitude]}
            icon={rotatedIcon(v.heading || 0)}
            eventHandlers={{
              click: () => {
                const now = new Date().toISOString().slice(0, 19).replace("T", " ");
                const fullStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
                setLoadingHistory(true);
                fetch(`https://tug.foss.com/historical?mmsi=${v.mmsi}&start=${fullStart}&end=${now}`)
                  .then(res => res.json())
                  .then(data => {
                    let sorted = (data.data || []).filter(d => d.latitude && d.longitude);
                    if (sorted.length > 10000) {
                      const step = Math.ceil(sorted.length / 1000);
                      sorted = sorted.filter((_, i) => i % step === 0);
                    }
                    setFullHistory(sorted);
                    const cutoff = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
                    const sliced = sorted.filter(p => new Date(p.created_date) >= cutoff);
                    setHistory(sliced);
                    setVisiblePath(sliced);
                    setSelectedName(sliced[0]?.name);
                    setHistoryRange(1);
                    setMode("historical");
                    setTimeout(() => {
                      if (mapRef.current && sliced.length > 1) {
                        const bounds = L.latLngBounds(sliced.map(p => [p.latitude, p.longitude]));
                        mapRef.current.fitBounds(bounds, { padding: [30, 30] });
                      }
                    }, 200);
                  })
                  .finally(() => setLoadingHistory(false));
              }
            }}
          >
            <Tooltip direction="top" offset={[0, -10]}>
              <b>{v.name}</b><br />
              MMSI: {v.mmsi}<br />
              Speed: {v.speed} kn<br />
              Heading: {v.heading}°<br />
              Course: {v.course}°<br />
              Time: {v.created_date}
            </Tooltip>
          </Marker>
        ))}

        {mode === "historical" && (
          <>
            <SegmentedPath />
            {visiblePath[0] && (
              <Marker position={[visiblePath[0].latitude, visiblePath[0].longitude]} icon={startIcon}>
                <Tooltip direction="top" offset={[0, -10]}>
                  Start Time: {visiblePath[0].created_date}
                </Tooltip>
              </Marker>
            )}
            {visiblePath[visiblePath.length - 1] && (() => {
              const endPoint = visiblePath[visiblePath.length - 1];
              return (
                <Marker
                  position={[endPoint.latitude, endPoint.longitude]}
                  icon={historicalEndIcon(endPoint.heading || 0)}
                >
                  <Tooltip direction="top" offset={[0, -10]}>
                    End Time: {endPoint.created_date}
                  </Tooltip>
                </Marker>
              );
            })()}
          </>
        )}
      </MapContainer>
    </div>
  );
}

export default MapPage;
