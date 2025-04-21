
import React, { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
  Tooltip
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-polylinedecorator";

function MapPage() {
  const [mode, setMode] = useState("live");
  const [vessels, setVessels] = useState([]);
  const [search, setSearch] = useState("");
  const [searchMatch, setSearchMatch] = useState(null);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [visiblePath, setVisiblePath] = useState([]);
  const [sliderIndex, setSliderIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedName, setSelectedName] = useState("");
  const mapRef = useRef();

  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchLiveData = () => {
    if (mode === "live") {
      fetch("https://ontario-searches-ranch-local.trycloudflare.com/live")

        .then(res => res.json())
        .then(data => setVessels(data.data || []));
    }
  };

  useEffect(() => {
    if (isPlaying && mode === "historical") {
      const timer = setInterval(() => {
        setSliderIndex(prev => {
          if (prev < history.length - 1) return prev + 1;
          setIsPlaying(false);
          return prev;
        });
      }, 500);
      return () => clearInterval(timer);
    }
  }, [isPlaying, mode, history]);

  useEffect(() => {
    if (mode === "historical" && selected) {
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");
      const past = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
      fetch(`https://ontario-searches-ranch-local.trycloudflare.com/historical?mmsi=${selected}&start=${past}&end=${now}`)
        .then(res => res.json())
        .then(data => {
          const sorted = (data.data || []).filter(d => d.latitude && d.longitude);
          setHistory(sorted);
          setVisiblePath(sorted);
          setSliderIndex(sorted.length - 1);
          if (sorted.length > 0) setSelectedName(sorted[0].name);
          setTimeout(() => {
            if (mapRef.current && sorted.length > 1) {
              const bounds = L.latLngBounds(sorted.map(p => [p.latitude, p.longitude]));
              mapRef.current.fitBounds(bounds, { padding: [30, 30] });
            }
          }, 200);
        });
    }
  }, [mode, selected]);

  useEffect(() => {
    if (history.length > 0) {
      setVisiblePath(history.slice(0, sliderIndex + 1));
    }
  }, [sliderIndex, history]);

  const handleSearch = () => {
    const trimmed = search.trim();
    const isMMSI = /^\d+$/.test(trimmed);
    const input = trimmed.toLowerCase();

    const match = vessels.find(v => {
      const vesselName = (v.name || "").trim().toLowerCase();
      return isMMSI ? String(v.mmsi) === trimmed : vesselName === input;
    });

    if (match) {
      setSearchMatch(match);
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.flyTo([match.latitude, match.longitude], 10);
        }
      }, 100);
    } else {
      alert("Vessel not found.");
    }
  };

  const shipIcon = L.divIcon({
    className: "ship-icon",
    html: `<div style="font-size: 20px;">🚢</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  const startIcon = L.divIcon({ className: "start-icon", html: "🟢", iconSize: [20, 20], iconAnchor: [10, 10] });
  const endIcon = L.divIcon({ className: "end-icon", html: "🔺", iconSize: [20, 20], iconAnchor: [10, 10] });

  const getColor = (speed) => {
    if (speed < 6) return "green";
    if (speed <= 8.5) return "yellow";
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

  const vesselsToShow = searchMatch ? [searchMatch] : vessels;
  const currentCenter = mode === "live"
    ? (vesselsToShow[0] ? [vesselsToShow[0].latitude, vesselsToShow[0].longitude] : [36.5, -122])
    : (visiblePath[0] || [36.5, -122]);

  const currentTimestamp = visiblePath[visiblePath.length - 1]?.created_date;

  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px", backgroundColor: "#f5f5f5", borderBottom: "1px solid #ccc" }}>
        <img src="/logo.png" alt="Logo" style={{ height: "40px" }} />
        <h2 style={{ margin: 0 }}>Saltchuk Marine Tug Tracker</h2>
        <span style={{ fontSize: "0.9em", color: "#555" }}>Click or Search a vessel to view last 3 days of history</span>
      </header>

      <div style={{ padding: "10px", display: "flex", gap: "10px", alignItems: "center" }}>
        {mode === "historical" ? (
          <>
            <h3>{selectedName} Historical Activity</h3>
            <button onClick={() => {
              setMode("live");
              setSelected(null);
              setSearchMatch(null);
              setHistory([]);
              setVisiblePath([]);
              setSliderIndex(0);
              setIsPlaying(false);
            }}>
              🔄 Back to Live
            </button>
            {history.length > 0 && (
              <>
                <button onClick={() => setIsPlaying(!isPlaying)}>
                  {isPlaying ? "⏸ Pause" : "▶️ Play"}
                </button>
                <input
                  type="range"
                  min="0"
                  max={history.length - 1}
                  value={sliderIndex}
                  onChange={(e) => setSliderIndex(parseInt(e.target.value))}
                  style={{ width: "300px" }}
                />
                <span style={{ fontWeight: "bold" }}>{currentTimestamp}</span>
              </>
            )}
          </>
        ) : (
          <>
            <input
              type="text"
              placeholder="Enter MMSI or Name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button onClick={handleSearch}>Search</button>
            {searchMatch && (
              <button onClick={() => setSearchMatch(null)}>🔁 Reset Search</button>
            )}
          </>
        )}
      </div>

      <MapContainer center={currentCenter} zoom={6} style={{ height: "85vh" }} whenReady={(map) => { mapRef.current = map.target }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {mode === "live" && vesselsToShow.map((v, i) => (
          <Marker
            key={i}
            position={[v.latitude, v.longitude]}
            icon={shipIcon}
            eventHandlers={{
              click: () => {
                setSelected(v.mmsi);
                setMode("historical");
              }
            }}
          >
            <Tooltip direction="top" offset={[0, -10]}>
              <b>{v.name}</b><br />
              MMSI: {v.mmsi}<br />
              Speed: {v.speed} kn<br />
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
            {visiblePath[visiblePath.length - 1] && (
              <Marker position={[visiblePath[visiblePath.length - 1].latitude, visiblePath[visiblePath.length - 1].longitude]} icon={endIcon}>
                <Tooltip direction="top" offset={[0, -10]}>
                  End Time: {visiblePath[visiblePath.length - 1].created_date}
                </Tooltip>
              </Marker>
            )}
          </>
        )}
      </MapContainer>
    </div>
  );
}

export default MapPage;
