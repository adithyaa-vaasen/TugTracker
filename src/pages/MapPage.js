// Full updated React component with multi-select dropdown replacing search input

import React, { useEffect, useState, useRef } from "react";
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
import Select from "react-select";

function MapPage() {
  const [mode, setMode] = useState("live");
  const [vessels, setVessels] = useState([]);
  const [selectedTugs, setSelectedTugs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [visiblePath, setVisiblePath] = useState([]);
  const [sliderIndex, setSliderIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(100);
  const [selectedName, setSelectedName] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const mapRef = useRef();
  const [historyRange, setHistoryRange] = useState(1);
  const [fullHistory, setFullHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const speedOptions = { 500: 1, 250: 1, 100: 1, 50: 1 };

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
      const currentStep = speedOptions[playSpeed] || 1;
      const timer = setInterval(() => {
        setSliderIndex(prev => {
          const nextIndex = Math.min(prev + currentStep, history.length - 1);
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

  const getColor = speed => {
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
    ? (selectedTugs.length > 0 && vessels.length > 0
        ? [vessels[0].latitude, vessels[0].longitude]
        : [36.5, -122])
    : (visiblePath[0] || [36.5, -122]);

  const currentTimestamp = visiblePath[visiblePath.length - 1]?.created_date;

  const rotatedIcon = angle => L.divIcon({
    className: "ship-icon",
    html: `<div style="font-size: 20px; transform: rotate(${angle - 90}deg); color: #5af3f4;">➤</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  const startIcon = L.divIcon({ className: "start-icon", html: "🟢", iconSize: [20, 20], iconAnchor: [10, 10] });

  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px", backgroundColor: "#f5f5f5", borderBottom: "1px solid #ccc" }}>
        <img src="/logo.png" alt="Logo" style={{ height: "40px" }} />
        <h2 style={{ margin: 0 }}>Saltchuk Marine Tug Tracker</h2>
        <span style={{ fontSize: "0.9em", color: "#555" }}>Click or select a vessel to view history</span>
      </header>

      {loadingHistory && <div className="loading-overlay"><h3>Loading Historical Data...</h3></div>}
      {loading && <div className="loading-overlay"><h3>Loading...</h3></div>}

      <div style={{ padding: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {mode === "historical" ? (
            <>
              <h3 style={{ margin: 0 }}>{selectedName} Historical Activity</h3>
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
                  <button onClick={() => setIsPlaying(!isPlaying)}>{isPlaying ? "⏸ Pause" : "▶️ Play"}</button>
                  <label style={{ marginLeft: "10px" }}>Speed:
                    <select value={playSpeed} onChange={(e) => setPlaySpeed(Number(e.target.value))}>
                      <option value={500}>Slow</option>
                      <option value={250}>Normal</option>
                      <option value={100}>Fast</option>
                      <option value={50}>Very Fast</option>
                    </select>
                  </label>
                  <input type="range" min="0" max={history.length - 1} value={sliderIndex} onChange={(e) => setSliderIndex(parseInt(e.target.value))} />
                  <span><b>{currentTimestamp}</b></span>
                </>
              )}
            </>
          ) : (
            <Select
              isMulti
              placeholder="Select Tugs..."
              options={vessels.map(v => ({ value: v.mmsi, label: v.name || v.mmsi }))}
              value={selectedTugs}
              onChange={(options) => setSelectedTugs(options || [])}
              styles={{ container: base => ({ ...base, minWidth: "300px" }) }}
            />
          )}
        </div>

        {mode === "historical" && (
          <div style={{ display: "flex", gap: "10px" }}>
            {[1, 7, 30].map(days => (
              <button
                key={days}
                style={{ padding: "6px 12px", backgroundColor: historyRange === days ? "#007bff" : "#eee", color: historyRange === days ? "white" : "black", border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer" }}
                onClick={() => setHistoryRange(days)}>
                {days === 1 ? "1 Day" : `${days} Days`}
              </button>
            ))}
          </div>
        )}
      </div>

      <MapContainer center={currentCenter} zoom={6} style={{ height: "85vh" }} whenReady={map => { mapRef.current = map.target }}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
        />

        {mode === "live" && (selectedTugs.length > 0 ? vessels.filter(v => selectedTugs.some(s => s.value === v.mmsi)) : vessels).map((v, i) => (
          <Marker
            key={i}
            position={[v.latitude, v.longitude]}
            icon={rotatedIcon(v.heading || 0)}
            eventHandlers={{
              click: () => {
                const rangeDays = 1;
                setLoadingHistory(true);
                setSelected(v.mmsi);

                const now = new Date().toISOString().slice(0, 19).replace("T", " ");
                const fullStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");

                fetch(`https://tug.foss.com/historical?mmsi=${v.mmsi}&start=${fullStart}&end=${now}`)
                  .then(res => res.json())
                  .then(data => {
                    let sorted = (data.data || []).filter(d => d.latitude && d.longitude);
                    if (sorted.length > 10000) sorted = sorted.filter((_, i) => i % Math.ceil(sorted.length / 1000) === 0);

                    setFullHistory(sorted);
                    const cutoff = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000);
                    const sliced = sorted.filter(p => new Date(p.created_date) >= cutoff);
                    setHistory(sliced);
                    setVisiblePath(sliced);
                    setSliderIndex(0);
                    if (sliced.length > 0) setSelectedName(sliced[0].name);
                    setHistoryRange(rangeDays);
                    setLoadingHistory(false);
                    setMode("historical");

                    setTimeout(() => {
                      if (mapRef.current && sliced.length > 1) {
                        const bounds = L.latLngBounds(sliced.map(p => [p.latitude, p.longitude]));
                        mapRef.current.fitBounds(bounds, { padding: [30, 30] });
                      }
                    }, 200);
                  });
              }
            }}
          >
            <Tooltip direction="top" offset={[0, -10]}>
              <b>{v.name}</b><br />MMSI: {v.mmsi}<br />Speed: {v.speed} kn<br />Heading: {v.heading}°<br />Course: {v.course}°<br />Time: {v.created_date}
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
                <Marker position={[endPoint.latitude, endPoint.longitude]} icon={rotatedIcon(endPoint.heading || 0)}>
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
