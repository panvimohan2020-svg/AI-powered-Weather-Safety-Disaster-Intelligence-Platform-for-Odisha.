import React, { useState } from 'react';
import { MapPin, Loader2, Map } from 'lucide-react';

const ODISHA_DISTRICTS = [
  { name: 'Angul', coords: [20.838, 85.101] },
  { name: 'Balangir', coords: [20.718, 83.488] },
  { name: 'Balasore', coords: [21.493, 86.925] },
  { name: 'Bargarh', coords: [21.333, 83.616] },
  { name: 'Bhadrak', coords: [21.054, 86.495] },
  { name: 'Boudh', coords: [20.835, 84.326] },
  { name: 'Cuttack', coords: [20.462, 85.882] },
  { name: 'Deogarh', coords: [21.532, 84.733] },
  { name: 'Dhenkanal', coords: [20.665, 85.594] },
  { name: 'Gajapati', coords: [18.815, 84.156] },
  { name: 'Ganjam (Brahmapur)', coords: [19.314, 84.794] },
  { name: 'Jagatsinghpur', coords: [20.267, 86.168] },
  { name: 'Jajpur', coords: [20.849, 86.332] },
  { name: 'Jharsuguda', coords: [21.854, 84.004] },
  { name: 'Kalahandi', coords: [19.907, 83.164] },
  { name: 'Kandhamal', coords: [20.472, 84.234] },
  { name: 'Kendrapara', coords: [20.498, 86.422] },
  { name: 'Kendujhar (Keonjhar)', coords: [21.628, 85.582] },
  { name: 'Khurda (Bhubaneswar)', coords: [20.296, 85.824] },
  { name: 'Koraput', coords: [18.813, 82.711] },
  { name: 'Malkangiri', coords: [18.343, 81.882] },
  { name: 'Mayurbhanj (Baripada)', coords: [21.933, 86.732] },
  { name: 'Nabarangpur', coords: [19.229, 82.548] },
  { name: 'Nayagarh', coords: [20.131, 85.104] },
  { name: 'Nuapada', coords: [20.833, 82.528] },
  { name: 'Puri', coords: [19.813, 85.831] },
  { name: 'Rayagada', coords: [19.167, 83.416] },
  { name: 'Sambalpur', coords: [21.466, 83.981] },
  { name: 'Subarnapur (Sonepur)', coords: [20.840, 83.916] },
  { name: 'Sundargarh', coords: [22.119, 84.031] }
];

export default function LocationInterface({ onLocationFetched, isLoading }) {
  const [selectedDistrict, setSelectedDistrict] = useState('');

  const handleGpsClick = () => {
    if (!navigator.geolocation) {
      alert('GPS is not supported on this device.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onLocationFetched(position.coords.latitude, position.coords.longitude);
      },
      (err) => {
        alert('Unable to retrieve location. Please select from the dropdown.');
      },
      { timeout: 10000 }
    );
  };

  const handleManualSubmit = () => {
    if (!selectedDistrict) return;
    const [lat, lon] = selectedDistrict.split(',').map(Number);
    onLocationFetched(lat, lon);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Massive GPS Button */}
      <button
        onClick={handleGpsClick}
        disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white rounded-2xl p-8 shadow-xl shadow-blue-900/20 transition-all flex flex-col items-center justify-center gap-4 group"
      >
        {isLoading ? (
          <Loader2 className="w-16 h-16 animate-spin text-blue-200" />
        ) : (
          <MapPin className="w-16 h-16 text-blue-100 group-hover:scale-110 transition-transform" />
        )}
        <span className="text-2xl font-bold tracking-wide">
          {isLoading ? 'Scanning...' : 'USE MY LOCATION'}
        </span>
      </button>

      <div className="flex items-center gap-4 py-2">
        <div className="h-px bg-slate-700 flex-1"></div>
        <span className="text-slate-500 font-medium uppercase tracking-widest text-sm">OR</span>
        <div className="h-px bg-slate-700 flex-1"></div>
      </div>

      {/* Manual Fallback */}
      <div className="bg-slate-800 rounded-xl p-4 shadow-lg border border-slate-700">
        <label className="flex items-center gap-2 text-slate-300 font-semibold mb-3">
          <Map className="w-5 h-5" /> Select District Manually
        </label>
        <div className="flex flex-col gap-3">
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="w-full bg-slate-900 text-white border border-slate-600 rounded-lg p-4 text-lg appearance-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="" disabled>Choose your location...</option>
            {ODISHA_DISTRICTS.map((d) => (
              <option key={d.name} value={`${d.coords[0]},${d.coords[1]}`}>
                {d.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleManualSubmit}
            disabled={!selectedDistrict || isLoading}
            className="w-full bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-bold text-lg rounded-lg p-4 transition-colors"
          >
            CHECK SAFETY
          </button>
        </div>
      </div>
    </div>
  );
}
