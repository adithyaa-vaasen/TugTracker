import React, { useEffect, useState, useRef, useMemo } from "react";
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
import { find } from 'geo-tz';

// ============ TIMEZONE HELPER FUNCTIONS (NEW) ============
const getVesselLocalTime = (latitude, longitude, utcTimestamp) => {
  try {
    const timezones = find(latitude, longitude);
    const timezone = timezones[0];
    const date = new Date(utcTimestamp);
    return date.toLocaleString('en-US', {
      timeZone: timezone,
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error getting timezone:', error);
    return new Date(utcTimestamp).toLocaleString();
  }
};

const getTimezoneAbbr = (latitude, longitude) => {
  try {
    const timezones = find(latitude, longitude);
    const timezone = timezones[0];
    const date = new Date();
    const abbr = date.toLocaleTimeString('en-US', {
      timeZone: timezone,
      timeZoneName: 'short'
    }).split(' ').pop();
    return abbr;
  } catch (error) {
    return '';
  }
};
// ============ END TIMEZONE HELPERS ============

// ============ ADDITIONS START HERE ============
// Helper function to convert color names to RGB
const getColorRGB = (colorName) => {
  const colors = {
    green: 'rgb(0, 200, 0)',
    yellow: 'rgb(255, 215, 0)',
    red: 'rgb(255, 0, 0)'
  };
  return colors[colorName] || colorName;
};

// Custom hook for canvas overlay with gradient lines
const useCanvasOverlay = (map, historicalData, sliderIndex, getColor) => {
  useEffect(() => {
    if (!map || Object.keys(historicalData).length === 0) return;

    const CanvasLayer = L.Layer.extend({
      onAdd: function(map) {
        this._map = map;
        this._canvas = L.DomUtil.create('canvas', 'leaflet-layer');
        this._ctx = this._canvas.getContext('2d');
        
        const size = this._map.getSize();
        this._canvas.width = size.x;
        this._canvas.height = size.y;
        
        this._map.getPanes().overlayPane.appendChild(this._canvas);
        this._map.on('moveend zoom', this._reset, this);
        this._reset();
      },
      
      onRemove: function(map) {
        L.DomUtil.remove(this._canvas);
        map.off('moveend zoom', this._reset, this);
      },
      
      _reset: function() {
        const topLeft = this._map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(this._canvas, topLeft);
        this._redraw();
      },
      
      _redraw: function() {
        if (!this._map) return;
        
        const size = this._map.getSize();
        this._canvas.width = size.x;
        this._canvas.height = size.y;
        
        const ctx = this._ctx;
        ctx.clearRect(0, 0, size.x, size.y);
        
        // Draw each vessel's path
        Object.keys(historicalData).forEach(mmsi => {
          const points = historicalData[mmsi] || [];
          const visiblePoints = points.slice(0, sliderIndex + 1);
          
          if (visiblePoints.length < 2) return;
          
          // Draw segments with gradients
          for (let i = 0; i < visiblePoints.length - 1; i++) {
            const p1 = visiblePoints[i];
            const p2 = visiblePoints[i + 1];
            
            const point1 = this._map.latLngToContainerPoint([p1.latitude, p1.longitude]);
            const point2 = this._map.latLngToContainerPoint([p2.latitude, p2.longitude]);
            
            // Create gradient
            const gradient = ctx.createLinearGradient(point1.x, point1.y, point2.x, point2.y);
            const color1 = getColorRGB(getColor(p1.speed));
            const color2 = getColorRGB(getColor(p2.speed));
            
            gradient.addColorStop(0, color1);
            gradient.addColorStop(1, color2);
            
            ctx.beginPath();
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.moveTo(point1.x, point1.y);
            ctx.lineTo(point2.x, point2.y);
            ctx.stroke();
          }
        });
      }
    });
    
    const canvasLayer = new CanvasLayer();
    canvasLayer.addTo(map);
    
    return () => {
      map.removeLayer(canvasLayer);
    };
  }, [map, historicalData, sliderIndex, getColor]);
};
// ============ ADDITIONS END HERE ============

function MapPage() {
  const [mode, setMode] = useState("live");
  const [vessels, setVessels] = useState([]);
  const [allVessels, setAllVessels] = useState([]);
  const [selectedVessels, setSelectedVessels] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [historicalData, setHistoricalData] = useState({});
  const [history, setHistory] = useState([]);
  const [visiblePath, setVisiblePath] = useState([]);
  const [sliderIndex, setSliderIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(100);
  const [selectedName, setSelectedName] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const mapRef = useRef();
  const [historyRange, setHistoryRange] = useState(1);
  const [fullHistoricalData, setFullHistoricalData] = useState({});
  const [fullHistory, setFullHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupFilter, setGroupFilter] = useState("all");
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
    366982340,  // BRYNN FOSS --PNW
    366767140,  // GARTH FOSS --PNW
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
      368026520,  // CAPT FRANK MOODY
    ],
    
    // AmNav vessels (AM group) - Red
    amnav: [
      367330510,  // PATRICIA ANN - AM
      367122220,  // REVOLUTION - AM
      367305920,  // SANDRA HUGH - AM
      367396670,  // Z THREE - AM
      367396790,  // Z FIVE - SL --NorCal
      367396710,  // Z FOUR - SL --NorCal
      367175860,  // INDEPENDENCE - AM
      367661930,  // MICHELLE SLOAN - AM
      303466000,  // SARAH AVRICK - AM
      366926740,  // TIM QUIGG --SoCal
      367581220,  // JAMIE RENEA --NorCal
      366998840,  // MILLENNIUM MAVERICK --SoCal
      367569830,  // BARBARA JEAN MULHOLLAND --SoCal
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
    const interval = setInterval(fetchLiveData, 4 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (dropdownOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current.focus();
      }, 100);
    }
  }, [dropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
        setDropdownSearch("");
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
          setAllVessels(vesselsData);
          
          let filteredByCategory = vesselsData;
          
          if (groupFilter === "saltchuk") {
            filteredByCategory = vesselsData.filter(v => isSMTug(v.mmsi));
          } else if (groupFilter === "amnav") {
            filteredByCategory = vesselsData.filter(v => smVesselGroups.amnav.includes(v.mmsi));
          } else if (groupFilter === "citb") {
            filteredByCategory = vesselsData.filter(v => smVesselGroups.citb.includes(v.mmsi));
          } else if (groupFilter === "foss") {
            filteredByCategory = vesselsData.filter(v => 
              isSMTug(v.mmsi) && 
              !smVesselGroups.amnav.includes(v.mmsi) && 
              !smVesselGroups.citb.includes(v.mmsi)
            );
          } else if (groupFilter === "competitors") {
            filteredByCategory = vesselsData.filter(v => !isSMTug(v.mmsi));
          }
          
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
          const lengths = Object.values(historicalData).map(arr => arr.length);
          if (lengths.length === 0) return prev;
          const maxLength = Math.max(...lengths);
          const nextIndex = Math.min(prev + currentStep, maxLength - 1);
          if (nextIndex >= maxLength - 1) {
            setIsPlaying(false);
          }
          return nextIndex;
        });
      }, playSpeed);
      return () => clearInterval(timer);
    }
  }, [isPlaying, mode, historicalData, playSpeed]);

  useEffect(() => {
    if (mode === "historical" && Object.keys(fullHistoricalData).length > 0) {
      const cutoff = new Date(Date.now() - historyRange * 24 * 60 * 60 * 1000);
      const newData = {};
      Object.keys(fullHistoricalData).forEach(mmsi => {
        newData[mmsi] = fullHistoricalData[mmsi].filter(p => new Date(p.created_date) >= cutoff);
      });
      setHistoricalData(newData);
      setSliderIndex(0);
      
      // Auto-fit map to historical data when time range changes
      setTimeout(() => {
        if (mapRef.current) {
          const allPoints = Object.values(newData).flat();
          if (allPoints.length > 1) {
            const bounds = L.latLngBounds(allPoints.map(p => [p.latitude, p.longitude]));
            mapRef.current.fitBounds(bounds, { padding: [30, 30] });
          }
        }
      }, 200);
    }
  }, [historyRange, fullHistoricalData, mode]);

  const isSMTug = (mmsi) => smTugsMMSI.includes(mmsi);

  const getVesselCategory = (vessel) => {
    return isSMTug(vessel.mmsi) ? "Saltchuk Marine" : "Competitor";
  };

  const getVesselColor = (vessel) => {
    if (customVesselColors[vessel.mmsi]) {
      return customVesselColors[vessel.mmsi];
    }
    
    if (isSMTug(vessel.mmsi)) {
      if (smVesselGroups.citb.includes(vessel.mmsi)) {
        return "#5DADE2";
      } else if (smVesselGroups.amnav.includes(vessel.mmsi)) {
        return "#E74C3C";
      } else {
        return "#4CA61C";
      }
    }
    
    return "#161CB0";
  };

  useEffect(() => {
    if (mode === "live" && allVessels.length > 0) {
      let vesselsToShow = allVessels;
      
      if (groupFilter === "saltchuk") {
        vesselsToShow = vesselsToShow.filter(v => isSMTug(v.mmsi));
      } else if (groupFilter === "amnav") {
        vesselsToShow = vesselsToShow.filter(v => smVesselGroups.amnav.includes(v.mmsi));
      } else if (groupFilter === "citb") {
        vesselsToShow = vesselsToShow.filter(v => smVesselGroups.citb.includes(v.mmsi));
      } else if (groupFilter === "foss") {
        vesselsToShow = vesselsToShow.filter(v => 
          isSMTug(v.mmsi) && 
          !smVesselGroups.amnav.includes(v.mmsi) && 
          !smVesselGroups.citb.includes(v.mmsi)
        );
      } else if (groupFilter === "competitors") {
        vesselsToShow = vesselsToShow.filter(v => !isSMTug(v.mmsi));
      }
      
      if (selectedVessels.length === 0) {
        setVessels(vesselsToShow);
        
        // Auto-fit map to filtered vessels when group filter changes
        if (vesselsToShow.length > 0 && mapRef.current && groupFilter !== "all") {
          setTimeout(() => {
            const bounds = L.latLngBounds(vesselsToShow.map(v => [v.latitude, v.longitude]));
            mapRef.current.fitBounds(bounds, { padding: [50, 50] });
          }, 100);
        }
      } else {
        const filtered = vesselsToShow.filter(v => 
          selectedVessels.includes(v.mmsi)
        );
        setVessels(filtered);
        
        if (filtered.length > 0 && mapRef.current) {
          setTimeout(() => {
            const bounds = L.latLngBounds(filtered.map(v => [v.latitude, v.longitude]));
            mapRef.current.fitBounds(bounds, { padding: [50, 50] });
          }, 100);
        }
      }
    }
  }, [selectedVessels, allVessels, mode, groupFilter]);

  const handleVesselSelect = (mmsi) => {
    setSelectedVessels(prev => {
      if (prev.includes(mmsi)) {
        return prev.filter(id => id !== mmsi);
      } else {
        return [...prev, mmsi];
      }
    });
  };

  const handleSelectAll = () => {
    const filteredVessels = getFilteredVessels();
    if (selectedVessels.length === filteredVessels.length) {
      setSelectedVessels([]);
    } else {
      setSelectedVessels(filteredVessels.map(v => v.mmsi));
    }
  };

  const getFilteredVessels = () => {
    let vessels = allVessels;
    
    if (groupFilter === "saltchuk") {
      vessels = vessels.filter(v => isSMTug(v.mmsi));
    } else if (groupFilter === "amnav") {
      vessels = vessels.filter(v => smVesselGroups.amnav.includes(v.mmsi));
    } else if (groupFilter === "citb") {
      vessels = vessels.filter(v => smVesselGroups.citb.includes(v.mmsi));
    } else if (groupFilter === "foss") {
      vessels = vessels.filter(v => 
        isSMTug(v.mmsi) && 
        !smVesselGroups.amnav.includes(v.mmsi) && 
        !smVesselGroups.citb.includes(v.mmsi)
      );
    } else if (groupFilter === "competitors") {
      vessels = vessels.filter(v => !isSMTug(v.mmsi));
    }
    
    if (dropdownSearch.trim()) {
      const searchTerm = dropdownSearch.toLowerCase().trim();
      vessels = vessels.filter(vessel => {
        const name = (vessel.name || "").toLowerCase();
        const mmsi = String(vessel.mmsi);
        return name.includes(searchTerm) || mmsi.includes(searchTerm);
      });
    }
    
    return vessels.sort((a, b) => {
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

  const fetchMultipleHistorical = (mmsiList, rangeDays = 1) => {
    setLoadingHistory(true);
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const fullStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
    
    const mmsiString = mmsiList.join(',');
    
    fetch(`https://tug.foss.com/historical?mmsi=${mmsiString}&start=${fullStart}&end=${now}`)
      .then(res => res.json())
      .then(data => {
        const allData = data.data || [];
        
        const groupedByMMSI = {};
        allData.forEach(point => {
          if (!groupedByMMSI[point.mmsi]) {
            groupedByMMSI[point.mmsi] = [];
          }
          if (point.latitude && point.longitude) {
            groupedByMMSI[point.mmsi].push(point);
          }
        });
        
        Object.keys(groupedByMMSI).forEach(mmsi => {
          let sorted = groupedByMMSI[mmsi];
          if (sorted.length > 10000) {
            const step = Math.ceil(sorted.length / 1000);
            sorted = sorted.filter((_, i) => i % step === 0);
            groupedByMMSI[mmsi] = sorted;
          }
        });
        
        setFullHistoricalData(groupedByMMSI);
        
        const cutoff = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000);
        const slicedData = {};
        Object.keys(groupedByMMSI).forEach(mmsi => {
          slicedData[mmsi] = groupedByMMSI[mmsi].filter(p => new Date(p.created_date) >= cutoff);
        });
        
        setHistoricalData(slicedData);
        setSliderIndex(0);
        setHistoryRange(rangeDays);
        setLoadingHistory(false);
        setMode("historical");
        
        setTimeout(() => {
          if (mapRef.current) {
            const allPoints = Object.values(slicedData).flat();
            if (allPoints.length > 1) {
              const bounds = L.latLngBounds(allPoints.map(p => [p.latitude, p.longitude]));
              mapRef.current.fitBounds(bounds, { padding: [30, 30] });
            }
          }
        }, 200);
      })
      .catch(err => {
        console.error("Error fetching historical data:", err);
        setLoadingHistory(false);
      });
  };

  const currentCenter = mode === "live"
    ? (vessels[0] ? [vessels[0].latitude, vessels[0].longitude] : [36.5, -122])
    : (() => {
        const allPoints = Object.values(historicalData).flat();
        return allPoints[0] ? [allPoints[0].latitude, allPoints[0].longitude] : [36.5, -122];
      })();

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

  const maxSliderValue = Object.keys(historicalData).length > 0 
    ? Math.max(...Object.values(historicalData).map(arr => arr.length)) - 1
    : 0;

  // MODIFIED: Get current time at slider position with local timezone
  const getCurrentSliderTime = () => {
    if (Object.keys(historicalData).length === 0) return null;
    const times = Object.values(historicalData).map(arr => {
      const idx = Math.min(sliderIndex, arr.length - 1);
      const point = arr[idx];
      return point?.created_date ? { 
        timestamp: new Date(point.created_date), 
        lat: point.latitude, 
        lon: point.longitude 
      } : null;
    }).filter(t => t !== null);
    if (times.length === 0) return null;
    return times.reduce((prev, curr) => prev.timestamp < curr.timestamp ? prev : curr);
  };

  // MODIFIED: Display slider time with local timezone
  const currentSliderTime = useMemo(() => {
    const pointData = getCurrentSliderTime();
    if (!pointData) return "–";
    const localTime = getVesselLocalTime(pointData.lat, pointData.lon, pointData.timestamp);
    const tzAbbr = getTimezoneAbbr(pointData.lat, pointData.lon);
    return `${localTime} ${tzAbbr}`;
  }, [sliderIndex, historicalData]);

  // ============ ONLY ADDITION IN THE COMPONENT BODY ============
  // Use canvas overlay for gradient lines in historical mode
  useCanvasOverlay(mapRef.current, historicalData, sliderIndex, getColor);
  // ==============================================================

  return (
    <div>
      <style>
        {`
          .leaflet-container .leaflet-control-zoom {
            margin-right: 10px !important;
            margin-left: 0 !important;
            right: 0 !important;
            left: auto !important;
          }
          
          .leaflet-container .leaflet-top.leaflet-left {
            right: 0 !important;
            left: auto !important;
          }
          
          .leaflet-container .leaflet-control-attribution {
            right: auto !important;
            left: 0 !important;
          }
        `}
      </style>
      
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px", backgroundColor: "#f5f5f5", borderBottom: "1px solid #ccc" }}>
        <img src="/logo.png" alt="Logo" style={{ height: "40px" }} />
        <h2 style={{ margin: 0 }}>Saltchuk Marine Tug Tracker</h2>
        <span style={{ fontSize: "0.9em", color: "#555" }}>Select vessels and click "View Historical" to compare</span>
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
              <h3 style={{ margin: 0 }}>
                {Object.keys(historicalData).length} Vessel{Object.keys(historicalData).length !== 1 ? 's' : ''} - Historical Activity
              </h3>
              <button onClick={() => {
                setMode("live");
                setSelected(null);
                setHistoricalData({});
                setFullHistoricalData({});
                setSliderIndex(0);
                setIsPlaying(false);
              }}>
                🔄 Back to Live
              </button>
              {Object.keys(historicalData).length > 0 && (
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
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "320px" }}>
                    <input
                      type="range"
                      min="0"
                      max={maxSliderValue}
                      value={sliderIndex}
                      onChange={(e) => setSliderIndex(parseInt(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    {/* MODIFIED: Width increased to accommodate timezone abbreviation */}
                    <span style={{ minWidth: "180px", fontWeight: "600", fontSize: "0.9rem" }}>
                      {currentSliderTime}
                    </span>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
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
                        onChange={() => {}}
                        style={{ marginRight: "8px" }}
                      />
                      Select All ({getFilteredVessels().length} vessels)
                    </div>
                    
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
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f0f0f0"}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = selectedVessels.includes(vessel.mmsi) ? "#e6f3ff" : "#fff"}
                        >
                          <input
                            type="checkbox"
                            checked={selectedVessels.includes(vessel.mmsi)}
                            onChange={() => {}}
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
                <>
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
                  <button 
                    onClick={() => fetchMultipleHistorical(selectedVessels, 1)}
                    style={{
                      padding: "8px 16px",
                      border: "1px solid #4CA61C",
                      borderRadius: "4px",
                      backgroundColor: "#4CA61C",
                      color: "white",
                      cursor: "pointer",
                      fontWeight: "bold"
                    }}
                  >
                    📊 View Historical ({selectedVessels.length})
                  </button>
                </>
              )}
              
              <div style={{ 
                display: "flex", 
                gap: "8px", 
                marginLeft: "20px", 
                padding: "5px 10px", 
                backgroundColor: "#f5f5f5", 
                borderRadius: "4px",
                fontSize: "13px"
              }}>
                <button
                  onClick={() => setGroupFilter(groupFilter === "saltchuk" ? "all" : "saltchuk")}
                  style={{
                    padding: "4px 10px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    backgroundColor: groupFilter === "saltchuk" ? "#12506b" : "#fff",
                    color: groupFilter === "saltchuk" ? "white" : "#12506b",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "12px"
                  }}
                >
                  Saltchuk Marine
                </button>
                <button
                  onClick={() => setGroupFilter(groupFilter === "amnav" ? "all" : "amnav")}
                  style={{
                    padding: "4px 10px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    backgroundColor: groupFilter === "amnav" ? "#E74C3C" : "#fff",
                    color: groupFilter === "amnav" ? "white" : "#E74C3C",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "12px"
                  }}
                >
                  AmNav
                </button>
                <button
                  onClick={() => setGroupFilter(groupFilter === "citb" ? "all" : "citb")}
                  style={{
                    padding: "4px 10px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    backgroundColor: groupFilter === "citb" ? "#5DADE2" : "#fff",
                    color: groupFilter === "citb" ? "white" : "#5DADE2",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "12px"
                  }}
                >
                  CITB
                </button>
                <button
                  onClick={() => setGroupFilter(groupFilter === "foss" ? "all" : "foss")}
                  style={{
                    padding: "4px 10px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    backgroundColor: groupFilter === "foss" ? "#4CA61C" : "#fff",
                    color: groupFilter === "foss" ? "white" : "#4CA61C",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "12px"
                  }}
                >
                  Foss
                </button>
                <button
                  onClick={() => setGroupFilter(groupFilter === "competitors" ? "all" : "competitors")}
                  style={{
                    padding: "4px 10px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    backgroundColor: groupFilter === "competitors" ? "#161CB0" : "#fff",
                    color: groupFilter === "competitors" ? "white" : "#161CB0",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "12px"
                  }}
                >
                  Competitors
                </button>
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
                {days === 1 ? "1 Day" : days=== 7 ? "7 Days" : "30 Days"}
              </button>
            ))}
          </div>
        )}
      </div>

      <MapContainer center={currentCenter} zoom={6} style={{ height: "85vh", position: "relative" }} whenReady={(map) => { mapRef.current = map.target }} zoomControl={false}>
        <ZoomControl position="topright" />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
        />

        {mode === "historical" && (
          <div style={{
            position: "absolute",
            bottom: "20px",
            left: "20px",
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            padding: "12px 16px",
            borderRadius: "6px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            zIndex: 1000,
            border: "1px solid #ccc"
          }}>
            <div style={{ fontWeight: "bold", marginBottom: "8px", fontSize: "14px" }}>Speed Legend</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "30px", height: "4px", backgroundColor: "green", borderRadius: "2px" }}></div>
                <span>≤ 8.5 knots</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "30px", height: "4px", backgroundColor: "yellow", borderRadius: "2px" }}></div>
                <span>8.5 - 9.5 knots</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "30px", height: "4px", backgroundColor: "red", borderRadius: "2px" }}></div>
                <span>&gt; 9.5 knots</span>
              </div>
            </div>
          </div>
        )}

        {/* MODIFIED: Live mode tooltips now show local time */}
        {mode === "live" && vessels.map((v, i) => (
          <Marker
            key={i}
            position={[v.latitude, v.longitude]}
            icon={rotatedIcon(v.heading || 0, v)}
            eventHandlers={{
              click: () => {
                fetchMultipleHistorical([v.mmsi], 1);
              }
            }}
          >
            <Tooltip direction="top" offset={[0, -10]}>
              <b style={{ color: getVesselColor(v) }}>{v.name}</b><br />
              MMSI: {v.mmsi}<br />
              Speed: {v.speed} kn<br />
              Heading: {v.heading}°<br />
              Course: {v.course}°<br />
              Local Time: {getVesselLocalTime(v.latitude, v.longitude, v.created_date)}
            </Tooltip>
          </Marker>
        ))}

        {/* MODIFIED: Historical mode tooltips now show local time */}
        {mode === "historical" && Object.keys(historicalData).map(mmsi => {
          const points = historicalData[mmsi] || [];
          const visiblePoints = points.slice(0, sliderIndex + 1);
          
          if (visiblePoints.length === 0) return null;
          
          const vesselInfo = allVessels.find(v => v.mmsi === parseInt(mmsi)) || { mmsi: parseInt(mmsi) };
          
          return (
            <React.Fragment key={mmsi}>
              {visiblePoints.slice(0, -1).map((point, i) => {
                const next = visiblePoints[i + 1];
                const color = getColor(point.speed);
                const vesselInfo = allVessels.find(v => v.mmsi === parseInt(mmsi)) || { mmsi: parseInt(mmsi) };
                return (
                  <Polyline
                    key={`${mmsi}-${i}`}
                    positions={[[point.latitude, point.longitude], [next.latitude, next.longitude]]}
                    pathOptions={{ color, weight: 3, opacity: 0 }}
                  >
                    <Tooltip direction="top" offset={[0, -10]} sticky>
                      <b style={{ color: getVesselColor(vesselInfo) }}>{point.name || `MMSI: ${mmsi}`}</b><br />
                      Local Time: {getVesselLocalTime(point.latitude, point.longitude, point.created_date)}<br />
                      Speed: {point.speed} kn<br />
                      Heading: {point.heading}°
                    </Tooltip>
                  </Polyline>
                );
              })}
              
              {visiblePoints[0] && (
                <Marker position={[visiblePoints[0].latitude, visiblePoints[0].longitude]} icon={startIcon}>
                  <Tooltip direction="top" offset={[0, -10]}>
                    <b style={{ color: getVesselColor(vesselInfo) }}>{visiblePoints[0].name || `MMSI: ${mmsi}`}</b><br />
                    Start Time: {getVesselLocalTime(visiblePoints[0].latitude, visiblePoints[0].longitude, visiblePoints[0].created_date)}
                  </Tooltip>
                </Marker>
              )}
              
              {visiblePoints[visiblePoints.length - 1] && (
                <Marker
                  position={[visiblePoints[visiblePoints.length - 1].latitude, visiblePoints[visiblePoints.length - 1].longitude]}
                  icon={historicalEndIcon(visiblePoints[visiblePoints.length - 1].heading || 0, vesselInfo)}
                >
                  <Tooltip direction="top" offset={[0, -10]}>
                    <b style={{ color: getVesselColor(vesselInfo) }}>{visiblePoints[visiblePoints.length - 1].name || `MMSI: ${mmsi}`}</b><br />
                    Current Time: {getVesselLocalTime(visiblePoints[visiblePoints.length - 1].latitude, visiblePoints[visiblePoints.length - 1].longitude, visiblePoints[visiblePoints.length - 1].created_date)}<br />
                    Speed: {visiblePoints[visiblePoints.length - 1].speed} kn<br />
                    Heading: {visiblePoints[visiblePoints.length - 1].heading}°
                  </Tooltip>
                </Marker>
              )}
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}

export default MapPage;