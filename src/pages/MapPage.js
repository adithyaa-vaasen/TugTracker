import React, { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Tooltip,
  ZoomControl
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-polylinedecorator";

function MapPage() {
  const [mode, setMode] = useState("live");
  const [vessels, setVessels] = useState([]);
  const [allVessels, setAllVessels] = useState([]); // Store all vessels for dropdown
  const [selectedVessels, setSelectedVessels] = useState([]); // Selected vessel MMSIs
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState("");
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
  const [vesselFilter, setVesselFilter] = useState("both"); // "SM", "competitors", "both"
  const dropdownRef = useRef();
  const searchInputRef = useRef();
  
  // SM vessel MMSIs
  const smTugsMMSI = [
    368066590,  // BERING WIND --CITB
    367576720,  // BRISTOL WIND --CITB Added on 04/24/25
    368104850,  // KUPARUK WIND --CITB Added on 04/24/25
    368247150,  // KAVIK WIND --CITB Added on 04/24/25
    368104860,  // SAG WIND --CITB Added on 04/24/25
    368026520,  // CAPT FRANK MOODY
    367304650,  // GLACIER WIND --CITB
    368210150,  // RESURRECTION --CITB
    367186610,  // STELLAR WIND --CITB
    367771910,  // DR HANK KAPLAN --CITB
    367434360, // KALAMA --CITB
    368421370, // LIBERTY -- FPRRJ
    366979360,  // ARTHUR FOSS --CSR
    367039250,  // BETSY L --CSR
    367384780,  // CAROLYN DOROTHY --CSR
    367529030,  // CONNOR FOSS --CSR
    367732430,  // DENISE FOSS --CSR
    367608420,  // PETER J BRIX --CSR
    367764250,  // PJ BRIX --CSR
    367702780,  // SARAH --CSR
    367101530,  // CARIBE ALLIANCE --ELS
    367678850,  // LELA FRANCO --ELS
    367408930,  // LUCY FOSS --ELS
    367056982,  // HOKU LOA --FHI
    367148660,  // MANUOKEKAI --FHI
    366972620,  // MIKIOI --FHI
    367776660,  // MOUNT BAKER --FHI
    367389160,  // PI'ILANI --FHI
    338627000,  // KAPENA BOB PURDY --FHI
    338033000,  // KAPENA GEORGE PANUI --FHI
    368477000,  // KAPENA RAYMOND ALAPAI --FHI
    367151240,  // MAMO --FHI
    368385860, // MOANA --FHI
    366254000,  // KAPENA JACK YOUNG --FHI
    368278450,  // EARL W REDD --FOW
    368296000,  // HAWAII --FOW
    367657270,  // MICHELE FOSS --FOW
    367774490,  // NICOLE FOSS --FOW
    368312940,  // REBEKAH --FOW
    367581220,  // JAMIE RENEA --NorCal
    367330510,  // PATRICIA ANN - AM --NorCal
    367122220,  // REVOLUTION - AM --NorCal
    367305920,  // SANDRA HUGH - AM --NorCal
    367396790,  // Z FIVE - SL --NorCal
    367396710,  // Z FOUR - SL --NorCal
    367396670,  // Z THREE - AM --NorCal
    367369720,  // ALTA JUNE --NorCal
    368171990,  // LEISA FLORENCE --NorCal
    368196320,  // RACHAEL ALLEN --NorCal
    367004670,  // SAN JOAQUIN RIVER --NorCal
    367416420,  // FREEDOM --Other
    368351000,  // IVER FOSS --Other
    366934290,  // SANDRA FOSS --Other
    366932970,  // STACEY FOSS --Other
    303466000,  // SARAH AVRICK - AM --Other
    367642530,  // BO BRUSCO --PNW
    //366982340,  // BRYNN FOSS --PNW
    //366932980,  // DREW FOSS --PNW
    366767140,  // GARTH FOSS --PNW
    //366976870,  // HENRY FOSS --PNW
    366767150,  // LINDSEY FOSS --PNW
    366919770,  // LYNN MARIE --PNW
    366982320,  // MARSHALL FOSS --PNW
    366976920,  // WEDELL FOSS --PNW
    368365290,  // DANIEL FOSS --PNW
    368292850,  // JOHN QUIGG --PNW
    303275000,  // JUSTINE FOSS --PRJ
    368321010,  // LAUREN FOSS --PRJ
    367569830,  // BARBARA JEAN MULHOLLAND --SoCal
    367175860,  // INDEPENDENCE - AM --SoCal
    367661930,  // MICHELLE SLOAN - AM --SoCal
    366998840,  // MILLENNIUM MAVERICK --SoCal
    366926740,  // TIM QUIGG --SoCal
    367467120,  // AVA FOSS --SoCal
    366979370,  // EDITH FOSS --SoCal
    366892000,  // JAMIE ANN --SoCal
    368010330,  // LILLIAN FOSS --SoCal
    367017440,  // PIPER INNESS --SoCal
    367566980,   // WYNEMA SPIRIT --CSR  Foss charter from Brusco
  ];
  
  // SM vessel groups for different colors
  const smVesselGroups = {
    // CITB vessels (CITBB group) - Light Blue
    citb: [
      368066590,  // BERING WIND --CITB
      367576720,  // BRISTOL WIND --CITB
      368104850,  // KUPARUK WIND --CITB
      368247150,  // KAVIK WIND --CITB
      368104860,  // SAG WIND --CITB
      367304650,  // GLACIER WIND --CITB
      368210150,  // RESURRECTION --CITB
      367186610,  // STELLAR WIND --CITB
      367771910,  // DR HANK KAPLAN --CITB
      367434360,  // KALAMA --CITB
    ],
    
    // AmNav vessels (AM group) - Red
    amnav: [
      367330510,  // PATRICIA ANN - AM
      367122220,  // REVOLUTION - AM
      367305920,  // SANDRA HUGH - AM
      367396670,  // Z THREE - AM
      367175860,  // INDEPENDENCE - AM
      367661930,  // MICHELLE SLOAN - AM
      303466000,  // SARAH AVRICK - AM
    ],
    
    // All other SM vessels (Foss and others) - Green (default)
    // These will get green color by default
  };
  
  // Custom vessel colors - Add vessels here with their MMSI and desired color
  const customVesselColors = {
    // Example: MMSI: color
    // 368066590: "#FF0000",  // BERING WIND - Red
    // 367576720: "#FFA500",  // BRISTOL WIND - Orange
    // 367304650: "#800080",  // GLACIER WIND - Purple
    // Add more vessels here as needed
  };
  
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

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (dropdownOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current.focus();
      }, 100);
    }
  }, [dropdownOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
        setDropdownSearch(""); // Clear search when closing
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchLiveData = () => {
    if (mode === "live") {
      setLoading(true);
      fetch("https://tug.foss.com/live")
        .then(res => res.json())
        .then(data => {
          const vesselsData = data.data || [];
          setAllVessels(vesselsData); // Store all vessels for dropdown
          
          // Debug: Log vessels by color group
          console.log("=== Vessel Color Groups ===");
          const citbVessels = vesselsData.filter(v => smVesselGroups.citb.includes(v.mmsi));
          const amnavVessels = vesselsData.filter(v => smVesselGroups.amnav.includes(v.mmsi));
          console.log("citb vessels (Light Blue):", citbVessels.map(v => v.name));
          console.log("amnav vessels (Red):", amnavVessels.map(v => v.name));
          
          // Apply vessel filter first
          let filteredByCategory = vesselsData;
          if (vesselFilter === "sm") {
            filteredByCategory = vesselsData.filter(v => isSMTug(v.mmsi));
          } else if (vesselFilter === "competitors") {
            filteredByCategory = vesselsData.filter(v => !isSMTug(v.mmsi));
          }
          
          // Then apply vessel selection
          if (selectedVessels.length === 0) {
            setVessels(filteredByCategory);
          } else {
            const filtered = filteredByCategory.filter(v => 
              selectedVessels.includes(v.mmsi)
            );
            setVessels(filtered);
          }
        })
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    if (isPlaying && mode === "historical") {
      const currentStep = speedOptions[playSpeed] || 1;
      const timer = setInterval(() => {
        setSliderIndex(prev => {
          const nextIndex = Math.min(prev + currentStep, history.length - 1);
          if (nextIndex >= history.length - 1) {
            setIsPlaying(false);
          }
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

  // Helper function to check if vessel is SM
  const isSMTug = (mmsi) => smTugsMMSI.includes(mmsi);

  // Get vessel category
  const getVesselCategory = (vessel) => {
    return isSMTug(vessel.mmsi) ? "Saltchuk Marine" : "Competitor";
  };

  // Get vessel color
  const getVesselColor = (vessel) => {
    // First check if vessel has a custom color
    if (customVesselColors[vessel.mmsi]) {
      return customVesselColors[vessel.mmsi];
    }
    
    // Check if it's a Saltchuk Marine vessel
    if (isSMTug(vessel.mmsi)) {
      // Check which SM group it belongs to
      if (smVesselGroups.citb.includes(vessel.mmsi)) {
        return "#5DADE2"; // Light Blue for citb group
      } else if (smVesselGroups.amnav.includes(vessel.mmsi)) {
        return "#E74C3C"; // Red for AM group
      } else {
        return "#4CA61C"; // Green for Foss and other SM vessels
      }
    }
    
    // Blue for Competitors
    return "#161CB0";
  };

  // Update displayed vessels when selection changes
  useEffect(() => {
    if (mode === "live" && allVessels.length > 0) {
      let vesselsToShow = allVessels;
      
      // Filter by vessel category (SM/Competitors/Both)
      if (vesselFilter === "sm") {
        vesselsToShow = vesselsToShow.filter(v => isSMTug(v.mmsi));
      } else if (vesselFilter === "competitors") {
        vesselsToShow = vesselsToShow.filter(v => !isSMTug(v.mmsi));
      }
      
      // Then filter by selected vessels
      if (selectedVessels.length === 0) {
        setVessels(vesselsToShow); // Show all in category if none selected
      } else {
        const filtered = vesselsToShow.filter(v => 
          selectedVessels.includes(v.mmsi)
        );
        setVessels(filtered);
        
        // Auto-adjust map view to fit selected vessels
        if (filtered.length > 0 && mapRef.current) {
          setTimeout(() => {
            const bounds = L.latLngBounds(filtered.map(v => [v.latitude, v.longitude]));
            mapRef.current.fitBounds(bounds, { padding: [50, 50] });
          }, 100);
        }
      }
    }
  }, [selectedVessels, allVessels, mode, vesselFilter]);

  const handleVesselSelect = (mmsi) => {
    setSelectedVessels(prev => {
      if (prev.includes(mmsi)) {
        // Remove if already selected
        return prev.filter(id => id !== mmsi);
      } else {
        // Add if not selected
        return [...prev, mmsi];
      }
    });
  };

  const handleSelectAll = () => {
    const filteredVessels = getFilteredVessels();
    if (selectedVessels.length === filteredVessels.length) {
      setSelectedVessels([]); // Deselect all
    } else {
      setSelectedVessels(filteredVessels.map(v => v.mmsi)); // Select all filtered
    }
  };

  // Filter vessels based on search term AND vessel filter
  const getFilteredVessels = () => {
    let vessels = allVessels;
    
    // First apply the vessel category filter
    if (vesselFilter === "sm") {
      vessels = vessels.filter(v => isSMTug(v.mmsi));
    } else if (vesselFilter === "competitors") {
      vessels = vessels.filter(v => !isSMTug(v.mmsi));
    }
    
    // Then apply search filter
    if (dropdownSearch.trim()) {
      const searchTerm = dropdownSearch.toLowerCase().trim();
      vessels = vessels.filter(vessel => {
        const name = (vessel.name || "").toLowerCase();
        const mmsi = String(vessel.mmsi);
        return name.includes(searchTerm) || mmsi.includes(searchTerm);
      });
    }
    
    // Sort the vessels - Change this section for different sorting
    return vessels.sort((a, b) => {
      // Sort by name alphabetically (A-Z)
      const nameA = (a.name || "").toLowerCase();
      const nameB = (b.name || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });
  };

  const getColor = (speed) => {
    if (speed <= 8.5) return "green";
    if (speed <= 9.5) return "yellow";
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
    ? (vessels[0] ? [vessels[0].latitude, vessels[0].longitude] : [36.5, -122])
    : (visiblePath[0] || [36.5, -122]);

  const currentTimestamp = visiblePath[visiblePath.length - 1]?.created_date;

  const rotatedIcon = (angle, vessel) => L.divIcon({
    className: "ship-icon",
    html: `<div style="font-size: 20px; transform: rotate(${angle - 90}deg); transform-origin: center center; color: ${getVesselColor(vessel)};">➤</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  const historicalEndIcon = (angle, vessel) => L.divIcon({
    className: "ship-icon",
    html: `<div style="font-size: 20px; transform: rotate(${angle - 90}deg); transform-origin: center center; color: ${vessel ? getVesselColor(vessel) : '#5af3f4'};">➤</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  const startIcon = L.divIcon({ className: "start-icon", html: "🟢", iconSize: [20, 20], iconAnchor: [10, 10] });

  return (
    <div>
      <style>
        {`
          /* Move zoom controls to the right */
          .leaflet-container .leaflet-control-zoom {
            margin-right: 10px !important;
            margin-left: 0 !important;
            right: 0 !important;
            left: auto !important;
          }
          
          /* Also target the leaflet top left container */
          .leaflet-container .leaflet-top.leaflet-left {
            right: 0 !important;
            left: auto !important;
          }
          
          /* Move attribution to the left if needed */
          .leaflet-container .leaflet-control-attribution {
            right: auto !important;
            left: 0 !important;
          }
        `}
      </style>
      
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px", backgroundColor: "#f5f5f5", borderBottom: "1px solid #ccc" }}>
        <img src="/logo.png" alt="Logo" style={{ height: "40px" }} />
        <h2 style={{ margin: 0 }}>Saltchuk Marine Tug Tracker</h2>
        <span style={{ fontSize: "0.9em", color: "#555" }}>Click or Search a vessel to view the historical data</span>
      </header>

      {loadingHistory && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "#fff", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 6px rgba(0,0,0,0.2)", zIndex: 1000 }}>
          <h3>Loading Historical Data...</h3>
        </div>
      )}

      {loading && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "#fff",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          zIndex: 1000
        }}>
          <h3>Loading...</h3>
        </div>
      )}

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
              }}>
                🔄 Back to Live
              </button>
              {history.length > 0 && (
                <>
                  <button onClick={() => setIsPlaying(!isPlaying)}>
                    {isPlaying ? "⏸ Pause" : "▶️ Play"}
                  </button>
                  <label style={{ marginLeft: "10px" }}>
                    Speed:
                    <select value={playSpeed} onChange={(e) => setPlaySpeed(Number(e.target.value))} style={{ marginLeft: "5px" }}>
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
                  <span style={{ fontWeight: "bold" }}>{currentTimestamp}</span>
                </>
              )}
            </>
          ) : (
            <>
              {/* Multi-select dropdown */}
              <div ref={dropdownRef} style={{ position: "relative", display: "inline-block" }}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  style={{
                    padding: "8px 16px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    backgroundColor: "#fff",
                    cursor: "pointer",
                    minWidth: "200px",
                    textAlign: "left"
                  }}
                >
                  {selectedVessels.length === 0 
                    ? "Select Vessels (All shown)" 
                    : selectedVessels.length === 1 
                      ? `1 vessel selected`
                      : `${selectedVessels.length} vessels selected`
                  } ▼
                </button>
                
                {dropdownOpen && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    backgroundColor: "#fff",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                    zIndex: 1000,
                    maxHeight: "350px",
                    overflowY: "auto"
                  }}>
                    {/* Search input */}
                    <div style={{ padding: "8px", borderBottom: "1px solid #eee", backgroundColor: "#f9f9f9" }}>
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search vessels..."
                        value={dropdownSearch}
                        onChange={(e) => setDropdownSearch(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          border: "1px solid #ccc",
                          borderRadius: "3px",
                          fontSize: "14px",
                          boxSizing: "border-box"
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    {/* Select All option */}
                    <div
                      onClick={handleSelectAll}
                      style={{
                        padding: "8px 16px",
                        cursor: "pointer",
                        backgroundColor: "#f5f5f5",
                        borderBottom: "1px solid #eee",
                        fontWeight: "bold"
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedVessels.length === getFilteredVessels().length && getFilteredVessels().length > 0}
                        onChange={() => {}} // Handled by onClick
                        style={{ marginRight: "8px" }}
                      />
                      Select All ({getFilteredVessels().length} vessels)
                    </div>
                    
                    {/* Individual vessel options */}
                    {getFilteredVessels().length > 0 ? (
                      getFilteredVessels().map(vessel => (
                        <div
                          key={vessel.mmsi}
                          onClick={() => handleVesselSelect(vessel.mmsi)}
                          style={{
                            padding: "8px 16px",
                            cursor: "pointer",
                            borderBottom: "1px solid #eee",
                            backgroundColor: selectedVessels.includes(vessel.mmsi) ? "#e6f3ff" : "#fff"
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = "#f0f0f0"}
                          onMouseLeave={(e) => e.target.style.backgroundColor = selectedVessels.includes(vessel.mmsi) ? "#e6f3ff" : "#fff"}
                        >
                          <input
                            type="checkbox"
                            checked={selectedVessels.includes(vessel.mmsi)}
                            onChange={() => {}} // Handled by onClick
                            style={{ marginRight: "8px" }}
                          />
  
                          {vessel.name || `MMSI: ${vessel.mmsi}`}
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: "8px 16px", color: "#666", fontStyle: "italic" }}>
                        No vessels found matching "{dropdownSearch}"
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {selectedVessels.length > 0 && (
                <button 
                  onClick={() => setSelectedVessels([])}
                  style={{
                    padding: "8px 16px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    backgroundColor: "#fff",
                    cursor: "pointer"
                  }}
                >
                  🔁 Show All
                </button>
              )}
              
              {/* Vessel Category Toggle */}
              <div style={{ display: "flex", gap: "5px", marginLeft: "10px" }}>
                <button
                  onClick={() => setVesselFilter("sm")}
                  style={{
                    padding: "6px 12px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    backgroundColor: vesselFilter === "sm" ? "#4CA61C" : "#fff",
                    color: vesselFilter === "sm" ? "white" : "#4CA61C",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "bold"
                  }}
                >
                  Saltchuk Marine
                </button>
                <button
                  onClick={() => setVesselFilter("competitors")}
                  style={{
                    padding: "6px 12px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    backgroundColor: vesselFilter === "competitors" ? "#161CB0" : "#fff",
                    color: vesselFilter === "competitors" ? "white" : "#161CB0",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "bold"
                  }}
                >
                  Competitors
                </button>
                <button
                  onClick={() => setVesselFilter("both")}
                  style={{
                    padding: "6px 12px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    backgroundColor: vesselFilter === "both" ? "#666" : "#fff",
                    color: vesselFilter === "both" ? "white" : "#666",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "bold"
                  }}
                >
                  Both
                </button>
              </div>
              
              {/* Color Legend */}
              <div style={{ 
                display: "flex", 
                gap: "15px", 
                marginLeft: "20px", 
                padding: "5px 10px", 
                backgroundColor: "#f5f5f5", 
                borderRadius: "4px",
                fontSize: "13px"
              }}>
                <span>
                  <span style={{ color: "#5DADE2", fontWeight: "bold" }}>● CITB</span>
                </span>
                <span>
                  <span style={{ color: "#E74C3C", fontWeight: "bold" }}>● AmNav</span>
                </span>
                <span>
                  <span style={{ color: "#4CA61C", fontWeight: "bold" }}>● Foss</span>
                </span>
                <span>
                  <span style={{ color: "#161CB0", fontWeight: "bold" }}>● Competitors</span>
                </span>
              </div>
            </>
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

      <MapContainer center={currentCenter} zoom={6} style={{ height: "85vh" }} whenReady={(map) => { mapRef.current = map.target }} zoomControl={false}>
        <ZoomControl position="topright" />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
        />

        {mode === "live" && vessels.map((v, i) => (
          <Marker
            key={i}
            position={[v.latitude, v.longitude]}
            icon={rotatedIcon(v.heading || 0, v)}
            eventHandlers={{
              click: () => {
                const rangeDays = 1; // Always default to 1 day on click
                setLoadingHistory(true);
                setSelected(v.mmsi);

                const now = new Date().toISOString().slice(0, 19).replace("T", " ");
                const fullStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");

                fetch(`https://tug.foss.com/historical?mmsi=${v.mmsi}&start=${fullStart}&end=${now}`)
                  .then(res => res.json())
                  .then(data => {
                    let sorted = (data.data || []).filter(d => d.latitude && d.longitude);

                    if (sorted.length > 10000) {
                      const step = Math.ceil(sorted.length / 1000);
                      sorted = sorted.filter((_, i) => i % step === 0);
                    }

                    setFullHistory(sorted);  // Store all 30 days

                    // Slice only the last 1 day for initial display
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
              <b style={{ color: getVesselColor(v) }}>{v.name}</b><br />
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
              // Create a vessel object for the historical end icon
              const endVessel = { mmsi: endPoint.mmsi || selected };
              return (
                <Marker
                  position={[endPoint.latitude, endPoint.longitude]}
                  icon={historicalEndIcon(endPoint.heading || 0, endVessel)}
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