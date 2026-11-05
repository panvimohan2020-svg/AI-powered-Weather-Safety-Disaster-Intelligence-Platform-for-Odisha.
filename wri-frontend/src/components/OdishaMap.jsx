import React, { useState } from 'react';
import { MapPin, Info, Compass, ShieldCheck } from 'lucide-react';

// Odisha's 30 districts with exact coordinates and climatic zones
const DISTRICT_MAP_PINS = [
  { name: "Angul", lat: 20.838, lon: 85.101, zone: "Central River Basin", coast_km: 145 },
  { name: "Balangir", lat: 20.718, lon: 83.488, zone: "Western Dry Belt", coast_km: 315 },
  { name: "Balasore", lat: 21.493, lon: 86.925, zone: "Coastal Maritime", coast_km: 15 },
  { name: "Bargarh", lat: 21.333, lon: 83.616, zone: "Western Dry Belt", coast_km: 345 },
  { name: "Bhadrak", lat: 21.054, lon: 86.495, zone: "Coastal Maritime", coast_km: 30 },
  { name: "Boudh", lat: 20.835, lon: 84.326, zone: "Central River Basin", coast_km: 210 },
  { name: "Cuttack", lat: 20.462, lon: 85.882, zone: "Central River Basin", coast_km: 70 },
  { name: "Deogarh", lat: 21.532, lon: 84.733, zone: "Northern Plateau", coast_km: 255 },
  { name: "Dhenkanal", lat: 20.665, lon: 85.594, zone: "Central River Basin", coast_km: 110 },
  { name: "Gajapati", lat: 18.815, lon: 84.156, zone: "Southern Eastern Ghats", coast_km: 65 },
  { name: "Ganjam (Brahmapur)", lat: 19.314, lon: 84.794, zone: "Coastal Maritime", coast_km: 10 },
  { name: "Jagatsinghpur", lat: 20.267, lon: 86.168, zone: "Coastal Maritime", coast_km: 35 },
  { name: "Jajpur", lat: 20.849, lon: 86.332, zone: "Central River Basin", coast_km: 60 },
  { name: "Jharsuguda", lat: 21.854, lon: 84.004, zone: "Western Dry Belt", coast_km: 330 },
  { name: "Kalahandi", lat: 19.907, lon: 83.164, zone: "Western Dry Belt", coast_km: 250 },
  { name: "Kandhamal", lat: 20.472, lon: 84.234, zone: "Southern Eastern Ghats", coast_km: 170 },
  { name: "Kendrapara", lat: 20.498, lon: 86.422, zone: "Coastal Maritime", coast_km: 25 },
  { name: "Kendujhar (Keonjhar)", lat: 21.628, lon: 85.582, zone: "Northern Plateau", coast_km: 160 },
  { name: "Khurda (Bhubaneswar)", lat: 20.296, lon: 85.824, zone: "Central River Basin", coast_km: 50 },
  { name: "Koraput", lat: 18.813, lon: 82.711, zone: "Southern Eastern Ghats", coast_km: 150 },
  { name: "Malkangiri", lat: 18.343, lon: 81.882, zone: "Southern Eastern Ghats", coast_km: 220 },
  { name: "Mayurbhanj (Baripada)", lat: 21.933, lon: 86.732, zone: "Northern Plateau", coast_km: 85 },
  { name: "Nabarangpur", lat: 19.229, lon: 82.548, zone: "Southern Eastern Ghats", coast_km: 180 },
  { name: "Nayagarh", lat: 20.131, lon: 85.104, zone: "Central River Basin", coast_km: 80 },
  { name: "Nuapada", lat: 20.833, lon: 82.528, zone: "Western Dry Belt", coast_km: 350 },
  { name: "Puri", lat: 19.813, lon: 85.831, zone: "Coastal Maritime", coast_km: 0 },
  { name: "Rayagada", lat: 19.167, lon: 83.416, zone: "Southern Eastern Ghats", coast_km: 130 },
  { name: "Sambalpur", lat: 21.466, lon: 83.981, zone: "Western Dry Belt", coast_km: 300 },
  { name: "Subarnapur (Sonepur)", lat: 20.840, lon: 83.916, zone: "Western Dry Belt", coast_km: 270 },
  { name: "Sundargarh", lat: 22.119, lon: 84.031, zone: "Northern Plateau", coast_km: 350 }
];

export default function OdishaMap({ selectedDistrict, onSelectDistrict, currentScore, currentZone, isDay }) {
  const [activeZoneFilter, setActiveZoneFilter] = useState('ALL');
  const [hoveredPin, setHoveredPin] = useState(null);

  // Geographic projection bounds for Odisha
  const minLon = 81.2;
  const maxLon = 87.8;
  const minLat = 17.8;
  const maxLat = 22.6;

  const svgWidth = 640;
  const svgHeight = 480;

  // Coordinate projection to SVG pixels
  const projectCoords = (lat, lon) => {
    const x = ((lon - minLon) / (maxLon - minLon)) * (svgWidth - 60) + 30;
    const y = ((maxLat - lat) / (maxLat - minLat)) * (svgHeight - 60) + 30;
    return { x: Math.round(x), y: Math.round(y) };
  };

  const filteredPins = DISTRICT_MAP_PINS.filter(pin => {
    if (activeZoneFilter === 'ALL') return true;
    if (activeZoneFilter === 'COASTAL') return pin.zone === 'Coastal Maritime';
    if (activeZoneFilter === 'WESTERN') return pin.zone === 'Western Dry Belt';
    if (activeZoneFilter === 'GHATS') return pin.zone === 'Southern Eastern Ghats';
    if (activeZoneFilter === 'CENTRAL') return pin.zone === 'Central River Basin' || pin.zone === 'Northern Plateau';
    return true;
  });

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Map Control & Filter Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 font-bold">
          <Compass className="w-4 h-4 text-blue-500" />
          <span>Interactive Meteorological District Map</span>
          <span className="opacity-60">({filteredPins.length}/30 Districts)</span>
        </div>

        {/* Climatic Zone Filter Pills */}
        <div className="flex flex-wrap items-center gap-1 bg-black/10 dark:bg-white/10 p-1 rounded-xl font-semibold">
          {[
            { id: 'ALL', label: 'All 30' },
            { id: 'COASTAL', label: 'Coastal Corridor' },
            { id: 'CENTRAL', label: 'Central & Plateau' },
            { id: 'WESTERN', label: 'Western Belt' },
            { id: 'GHATS', label: 'Eastern Ghats' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setActiveZoneFilter(f.id)}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeZoneFilter === f.id
                  ? 'bg-blue-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Canvas Map */}
      <div className="relative w-full aspect-[4/3] max-h-[460px] rounded-2xl overflow-hidden bg-slate-900/60 border border-slate-700/60 p-2 flex items-center justify-center">
        
        {/* Ambient Bay of Bengal Ocean indicator */}
        <div className="absolute right-3 bottom-3 text-[0.65rem] font-bold text-sky-400/40 uppercase tracking-widest pointer-events-none select-none">
          Bay of Bengal (Coastline)
        </div>

        <svg 
          viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
          className="w-full h-full select-none"
        >
          {/* Subtle Grid Lines */}
          <line x1="30" y1="120" x2="610" y2="120" stroke="rgba(255,255,255,0.05)" strokeDasharray="4,4" />
          <line x1="30" y1="240" x2="610" y2="240" stroke="rgba(255,255,255,0.05)" strokeDasharray="4,4" />
          <line x1="30" y1="360" x2="610" y2="360" stroke="rgba(255,255,255,0.05)" strokeDasharray="4,4" />
          <line x1="160" y1="30" x2="160" y2="450" stroke="rgba(255,255,255,0.05)" strokeDasharray="4,4" />
          <line x1="320" y1="30" x2="320" y2="450" stroke="rgba(255,255,255,0.05)" strokeDasharray="4,4" />
          <line x1="480" y1="30" x2="480" y2="450" stroke="rgba(255,255,255,0.05)" strokeDasharray="4,4" />

          {/* Stylized Bay of Bengal Coastline Path */}
          <path
            d="M 285 415 Q 350 350 410 270 T 475 220 T 545 130"
            fill="none"
            stroke="rgba(56, 189, 248, 0.35)"
            strokeWidth="3"
            strokeDasharray="6,4"
          />

          {/* District Interactive Pins */}
          {filteredPins.map(pin => {
            const { x, y } = projectCoords(pin.lat, pin.lon);
            const isSelected = selectedDistrict && (
              pin.name === selectedDistrict || 
              selectedDistrict.startsWith(pin.name) || 
              pin.name.startsWith(selectedDistrict.split(' ')[0])
            );
            const isHovered = hoveredPin?.name === pin.name;

            // Pin styling based on selection and safety score
            let pinColor = '#3b82f6'; // default blue
            if (isSelected) {
              if (currentZone === 'GREEN') pinColor = '#10b981';
              else if (currentZone === 'YELLOW') pinColor = '#f59e0b';
              else if (currentZone === 'ORANGE') pinColor = '#f97316';
              else pinColor = '#ef4444';
            }

            return (
              <g 
                key={pin.name} 
                className="cursor-pointer transition-transform duration-200"
                onClick={() => onSelectDistrict(pin.name)}
                onMouseEnter={() => setHoveredPin(pin)}
                onMouseLeave={() => setHoveredPin(null)}
              >
                {/* Active Ripple on Selected District */}
                {isSelected && (
                  <circle
                    cx={x}
                    cy={y}
                    r="18"
                    fill={pinColor}
                    opacity="0.25"
                    className="animate-ping"
                  />
                )}

                {/* Base Outer Ring */}
                <circle
                  cx={x}
                  cy={y}
                  r={isSelected ? 10 : (isHovered ? 8 : 6)}
                  fill={pinColor}
                  stroke="#ffffff"
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  className="transition-all duration-300"
                />

                {/* Inner Dot */}
                <circle
                  cx={x}
                  cy={y}
                  r={isSelected ? 4 : 2.5}
                  fill="#ffffff"
                />

                {/* District Name Label */}
                <text
                  x={x}
                  y={y - (isSelected ? 14 : 9)}
                  textAnchor="middle"
                  fill={isSelected ? '#38bdf8' : (isHovered ? '#ffffff' : '#94a3b8')}
                  fontSize={isSelected ? '11' : '8.5'}
                  fontWeight={isSelected ? 'bold' : '600'}
                  className="pointer-events-none drop-shadow-md select-none font-sans"
                >
                  {pin.name.split(' ')[0]}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover / Selection Interactive Card Overlay */}
        {(hoveredPin || selectedDistrict) && (
          <div className="absolute left-3 top-3 bg-slate-950/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 text-xs max-w-[220px] pointer-events-none shadow-xl transition-all">
            {hoveredPin ? (
              <div>
                <div className="font-black text-sm text-sky-400">{hoveredPin.name}</div>
                <div className="text-[0.65rem] text-slate-400 mt-0.5">{hoveredPin.zone}</div>
                <div className="mt-1 text-[0.7rem] font-semibold text-slate-300 flex justify-between">
                  <span>Coast: {hoveredPin.coast_km} km</span>
                  <span>{hoveredPin.lat}°N</span>
                </div>
                <div className="text-[0.65rem] text-blue-400 mt-1 italic">Click to view weather & safety score</div>
              </div>
            ) : (
              <div>
                <div className="text-[0.65rem] uppercase font-bold text-slate-400">Selected District</div>
                <div className="font-black text-sm text-emerald-400">{selectedDistrict}</div>
                <div className="text-[0.7rem] font-bold text-slate-300 mt-0.5">
                  Live Safety Score: <span className="font-mono text-emerald-400">{currentScore ?? '8.0'}/10</span>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      <div className="flex items-center justify-between text-[0.7rem] text-slate-400 px-1">
        <span>Click any district pin to inspect its local weather hazards and safety index.</span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Favorable
          <span className="w-2 h-2 rounded-full bg-amber-500 ml-2"></span> Caution
          <span className="w-2 h-2 rounded-full bg-orange-500 ml-2"></span> Elevated
          <span className="w-2 h-2 rounded-full bg-red-500 ml-2"></span> Hazard
        </span>
      </div>
    </div>
  );
}
