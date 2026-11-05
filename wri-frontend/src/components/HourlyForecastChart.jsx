import React, { useState } from 'react';
import { 
  CloudRain, Wind, ThermometerSun, Sun, Moon, Cloud, 
  CloudDrizzle, CloudLightning, ShieldCheck, Clock, TrendingUp 
} from 'lucide-react';

export default function HourlyForecastChart({ hourlyData, isDay, cardBg, subText, headingText }) {
  const [activeHourIndex, setActiveHourIndex] = useState(0);

  if (!hourlyData || !hourlyData.timeline || hourlyData.timeline.length === 0) {
    return (
      <div className="p-4 rounded-2xl bg-black/10 text-center text-xs text-slate-400">
        24-hour forecast timeline currently unavailable.
      </div>
    );
  }

  const timeline = hourlyData.timeline;
  const activeHour = timeline[activeHourIndex] || timeline[0];

  const getConditionIcon = (iconName, isDaytime) => {
    const size = "w-4 h-4";
    if (iconName.includes('rain') || iconName.includes('drizzle')) return <CloudRain className={`${size} text-blue-400`} />;
    if (iconName.includes('lightning') || iconName.includes('storm')) return <CloudLightning className={`${size} text-amber-400`} />;
    if (iconName.includes('cloud')) return <Cloud className={`${size} text-slate-300`} />;
    return isDaytime ? <Sun className={`${size} text-amber-400`} /> : <Moon className={`${size} text-indigo-300`} />;
  };

  const getScoreColor = (score) => {
    if (score >= 8.0) return 'text-emerald-400 border-emerald-500 bg-emerald-500/15';
    if (score >= 6.0) return 'text-amber-400 border-amber-500 bg-amber-500/15';
    if (score >= 4.0) return 'text-orange-400 border-orange-500 bg-orange-500/15';
    return 'text-red-400 border-red-500 bg-red-500/15';
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Header & Smart Insight */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-black uppercase tracking-wider">
              24-Hour Weather & Workability Forecast
            </h3>
            <span className="text-[0.65rem] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">
              Next 24 Hours
            </span>
          </div>
          {hourlyData.forecast_insight && (
            <p className="text-xs text-blue-400 font-semibold mt-1">
              💡 {hourlyData.forecast_insight}
            </p>
          )}
        </div>

        <span className={`text-[0.65rem] font-mono ${subText}`}>
          Issued: {new Date(hourlyData.issued_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Hourly Interactive Visual Scroller */}
      <div className="flex gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-slate-700">
        {timeline.map((item, idx) => {
          const isSelected = idx === activeHourIndex;
          const scoreClass = getScoreColor(item.safety_score);
          const barHeightPercent = Math.max(15, (item.safety_score / 10.0) * 100);

          return (
            <button
              key={item.time_iso}
              onClick={() => setActiveHourIndex(idx)}
              className={`flex-shrink-0 w-16 sm:w-20 p-2 sm:p-2.5 rounded-2xl flex flex-col items-center justify-between gap-1.5 transition-all text-xs cursor-pointer ${
                isSelected 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-2 ring-blue-400 scale-105' 
                  : 'bg-slate-900/40 hover:bg-slate-800/60 border border-slate-700/40 text-slate-300'
              }`}
            >
              {/* Hour Label */}
              <span className="text-[0.65rem] font-bold">
                {item.hour_label}
              </span>

              {/* Weather Icon */}
              <div className="my-0.5">
                {getConditionIcon(item.icon, item.is_daytime)}
              </div>

              {/* Temperature */}
              <span className="font-extrabold text-xs">
                {Math.round(item.temperature_c)}°C
              </span>

              {/* Workability Mini Bar */}
              <div className="w-full bg-black/30 rounded-full h-8 flex flex-col justify-end p-0.5 mt-1">
                <div 
                  className={`w-full rounded-full transition-all duration-300 ${
                    item.safety_score >= 8.0 ? 'bg-emerald-400' :
                    item.safety_score >= 6.0 ? 'bg-amber-400' :
                    item.safety_score >= 4.0 ? 'bg-orange-400' : 'bg-red-400'
                  }`}
                  style={{ height: `${barHeightPercent}%` }}
                />
              </div>

              {/* Score Number Badge */}
              <span className={`text-[0.62rem] font-mono font-black px-1.5 py-0.5 rounded-md ${
                isSelected ? 'bg-white/20 text-white' : scoreClass
              }`}>
                {item.safety_score.toFixed(1)}
              </span>

              {/* Rain Probability */}
              <span className={`text-[0.6rem] font-medium flex items-center gap-0.5 ${
                item.rain_probability > 0.4 ? 'text-blue-300 font-bold' : 'opacity-60'
              }`}>
                💧 {item.rain_percentage}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Hour Detailed Inspector */}
      {activeHour && (
        <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <div className={`text-[0.65rem] font-bold uppercase ${subText}`}>Selected Hour</div>
            <div className="text-sm font-black text-white mt-0.5">
              {activeHour.hour_label} ({activeHour.condition})
            </div>
          </div>

          <div>
            <div className={`text-[0.65rem] font-bold uppercase ${subText}`}>Workability Score</div>
            <div className={`text-sm font-black font-mono mt-0.5 ${
              activeHour.safety_score >= 8.0 ? 'text-emerald-400' :
              activeHour.safety_score >= 6.0 ? 'text-amber-400' :
              activeHour.safety_score >= 4.0 ? 'text-orange-400' : 'text-red-400'
            }`}>
              {activeHour.safety_score.toFixed(1)}/10 ({activeHour.risk_zone})
            </div>
          </div>

          <div>
            <div className={`text-[0.65rem] font-bold uppercase ${subText}`}>Precipitation</div>
            <div className="text-sm font-black text-white mt-0.5">
              {activeHour.precipitation_mm} mm ({activeHour.rain_percentage} chance)
            </div>
          </div>

          <div>
            <div className={`text-[0.65rem] font-bold uppercase ${subText}`}>Wind & Solar UV</div>
            <div className="text-sm font-black text-white mt-0.5">
              {activeHour.wind_speed_kmh} km/h • UV {activeHour.uv_index}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
