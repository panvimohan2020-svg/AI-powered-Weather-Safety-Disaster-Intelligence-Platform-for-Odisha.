import React from 'react';
import { ArrowLeft, CloudRain, ThermometerSun, Wind } from 'lucide-react';

export default function ResultDashboard({ data, onReset }) {
  const { wri, meteorological_features } = data;
  const score = wri.wri_score;
  const zone = wri.zone; // 'GREEN', 'YELLOW', 'RED'
  
  // Dynamic Styling based on Risk Zone
  const zoneConfig = {
    GREEN: {
      bg: 'bg-emerald-500',
      text: 'text-emerald-950',
      border: 'border-emerald-600',
      icon: '✓',
    },
    YELLOW: {
      bg: 'bg-yellow-400 shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]',
      text: 'text-black',
      border: 'border-yellow-500',
      icon: '!',
    },
    RED: {
      bg: 'bg-red-600 animate-pulse shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]',
      text: 'text-white',
      border: 'border-red-700',
      icon: '✕',
    }
  };
  
  const currentZone = zoneConfig[zone] || zoneConfig.GREEN;
  
  // Calculate Progress Bar Width
  const progressPercent = (score / 10) * 100;

  return (
    <div className="flex flex-col gap-4 animate-slide-up">
      {/* Massive Score Card */}
      <div className={`${currentZone.bg} ${currentZone.text} rounded-2xl p-6 shadow-2xl relative overflow-hidden`}>
        <div className="flex justify-between items-start mb-2">
          <span className="font-bold tracking-widest uppercase opacity-80">Safety Score</span>
          <span className="text-3xl font-black opacity-40">{currentZone.icon}</span>
        </div>
        
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-7xl font-black tracking-tighter">{score}</span>
          <span className="text-2xl font-bold opacity-70">/ 10</span>
        </div>

        {/* Progress Bar Gauge */}
        <div className="w-full bg-black/20 rounded-full h-3 mb-6">
          <div 
            className="bg-white h-3 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <p className="text-xl font-bold leading-tight">
          {wri.advice}
        </p>
      </div>

      {/* Driving Factors List */}
      <div className="bg-slate-800 rounded-xl p-5 shadow-lg border border-slate-700">
        <h3 className="text-slate-400 font-bold uppercase tracking-wider text-sm mb-4">Risk Factors</h3>
        
        <div className="flex flex-col gap-4">
          {/* Rain Factor */}
          <div className="flex items-center gap-4 animate-slide-in-1">
            <div className={`p-3 rounded-lg ${wri.penalties.rain > 0 ? 'bg-blue-900/50 text-blue-400' : 'bg-slate-900 text-slate-500'}`}>
              <CloudRain className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="font-bold text-slate-200">Rain Risk</span>
                <span className="font-mono text-slate-400">-{wri.penalties.rain} pts</span>
              </div>
            </div>
          </div>

          {/* Heat Factor */}
          <div className="flex items-center gap-4 animate-slide-in-2">
            <div className={`p-3 rounded-lg ${wri.penalties.heat > 0 ? 'bg-red-900/50 text-red-400' : 'bg-slate-900 text-slate-500'}`}>
              <ThermometerSun className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="font-bold text-slate-200">Heat Stress</span>
                <span className="font-mono text-slate-400">-{wri.penalties.heat} pts</span>
              </div>
              <p className="text-sm text-slate-500">{meteorological_features.temp_max_c}°C Max</p>
            </div>
          </div>

          {/* Wind Factor */}
          <div className="flex items-center gap-4 animate-slide-in-3">
            <div className={`p-3 rounded-lg ${wri.penalties.wind > 0 ? 'bg-teal-900/50 text-teal-400' : 'bg-slate-900 text-slate-500'}`}>
              <Wind className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="font-bold text-slate-200">Wind Hazard</span>
                <span className="font-mono text-slate-400">-{wri.penalties.wind} pts</span>
              </div>
              <p className="text-sm text-slate-500">{meteorological_features.wind_speed_kmh} km/h</p>
            </div>
          </div>
        </div>
      </div>

      <button 
        onClick={onReset}
        className="mt-2 flex items-center justify-center gap-2 w-full p-4 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-colors font-semibold"
      >
        <ArrowLeft className="w-5 h-5" /> Check Another Location
      </button>
    </div>
  );
}
