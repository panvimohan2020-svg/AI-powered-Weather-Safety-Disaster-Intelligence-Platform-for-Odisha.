import React from 'react';
import { 
  Sun, CloudSun, Cloud, CloudRain, CloudLightning, 
  Wind, Droplets, Compass, RefreshCw, MapPin, Eye, Thermometer
} from 'lucide-react';

/**
 * Premium Simplified Weather Hero Component
 * Visually prominent temperature, clean Apple Weather-style hierarchy,
 * and understandable, non-technical human labels for all observations.
 */
export default function SimplifiedWeatherHero({ 
  district = 'Rayagada', 
  locality = null,
  weather = {},
  lastUpdated = 'Just now',
  onRefresh = () => {},
  isLoading = false
}) {
  const temp = Math.round(weather.temperature_c ?? 30);
  const feelsLike = Math.round(weather.apparent_temperature_c ?? temp);
  const condition = weather.weather_condition || 'Clear Skies';
  const humidity = weather.humidity_percent ?? 60;
  const windSpeed = Math.round(weather.wind_speed_kmh ?? 12);
  const windGusts = Math.round(weather.wind_gusts_kmh ?? 16);
  const rainChance = Math.round((weather.rain_probability ?? 0.1) * 100);
  const uvIndex = weather.uv_index ?? 5.0;

  // Feels like plain-language interpretation
  const getFeelsLikeNote = () => {
    if (feelsLike >= 42) return 'Extreme Heat Risk — Avoid Midday Sun';
    if (feelsLike >= 36) return 'High Heat Stress — Drink Water Regularly';
    if (feelsLike >= 28) return 'Comfortable Outdoor Thermal Conditions';
    if (feelsLike >= 18) return 'Pleasant Mild Weather';
    return 'Cool Temperature';
  };

  // Weather Icon Matcher
  const getWeatherIcon = () => {
    const iconType = weather.icon || 'sun';
    const props = { className: "w-14 h-14 sm:w-16 sm:h-16 text-amber-400 drop-shadow-md" };
    switch (iconType) {
      case 'cloud-rain':
        return <CloudRain {...props} className="w-14 h-14 sm:w-16 sm:h-16 text-blue-400 drop-shadow-md" />;
      case 'cloud-lightning':
        return <CloudLightning {...props} className="w-14 h-14 sm:w-16 sm:h-16 text-purple-400 drop-shadow-md" />;
      case 'cloud':
        return <Cloud {...props} className="w-14 h-14 sm:w-16 sm:h-16 text-slate-300 drop-shadow-md" />;
      case 'cloud-sun':
        return <CloudSun {...props} className="w-14 h-14 sm:w-16 sm:h-16 text-amber-300 drop-shadow-md" />;
      case 'sun':
      default:
        return <Sun {...props} className="w-14 h-14 sm:w-16 sm:h-16 text-amber-400 animate-[spin_30s_infinite_linear] drop-shadow-md" />;
    }
  };

  return (
    <div className="rounded-3xl border border-slate-700/60 bg-slate-900/80 backdrop-blur-md p-6 sm:p-8 flex flex-col justify-between shadow-xl relative overflow-hidden transition-all duration-300">
      
      {/* Top District & Live Bar */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live District Weather</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white flex flex-wrap items-center gap-2 mt-1">
            <span>{district}</span>
            {locality && locality !== district && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {locality}
              </span>
            )}
          </h2>
          <div className="text-xs text-slate-400 mt-0.5">
            Updated {lastUpdated}
          </div>
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white transition-all active:scale-95 cursor-pointer shadow-sm"
          title="Refresh real-time meteorological observations"
          aria-label="Refresh real-time meteorological observations"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
        </button>
      </div>

      {/* Main Temperature & Condition Row */}
      <div className="flex items-center justify-between gap-4 my-3 sm:my-5">
        <div>
          {/* Most prominent element: Giant Temperature */}
          <div className="flex items-baseline gap-1">
            <span className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tighter text-white">
              {temp}°
            </span>
            <span className="text-xl sm:text-2xl font-bold text-slate-400">C</span>
          </div>

          {/* Condition Text */}
          <div className="text-lg sm:text-xl font-bold text-slate-200 mt-1">
            {condition}
          </div>
        </div>

        {/* Condition Animated Icon */}
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-800/40 border border-slate-700/40 flex items-center justify-center">
          {getWeatherIcon()}
        </div>
      </div>

      {/* Human-Friendly Feels-Like Banner */}
      <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-2.5 mb-5">
        <Thermometer className="w-5 h-5 text-amber-400 flex-shrink-0" />
        <span className="text-xs sm:text-sm font-semibold text-slate-200">
          Feels like <strong>{feelsLike}°C</strong> — {getFeelsLikeNote()}
        </span>
      </div>

      {/* 4-Card Simple Metrics Grid (Accessible plain language) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 border-t border-slate-800">
        
        {/* Chance of Rain */}
        <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/40">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold">Chance of Rain</span>
            <CloudRain className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-black text-white">{rainChance}%</div>
          <div className="text-[0.68rem] text-slate-400 truncate mt-0.5">
            {rainChance > 50 ? 'Rain showers likely' : 'Low probability'}
          </div>
        </div>

        {/* Humidity */}
        <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/40">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold">Humidity</span>
            <Droplets className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-black text-white">{humidity}%</div>
          <div className="text-[0.68rem] text-slate-400 truncate mt-0.5">
            Amount of moisture in air
          </div>
        </div>

        {/* Wind Speed */}
        <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/40">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold">Wind Speed</span>
            <Wind className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-white">{windSpeed} <span className="text-xs font-normal text-slate-400">km/h</span></div>
          <div className="text-[0.68rem] text-slate-400 truncate mt-0.5">
            Gusts up to {windGusts} km/h
          </div>
        </div>

        {/* UV Index */}
        <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/40">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold">Sun UV Index</span>
            <Sun className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-black text-white">{uvIndex.toFixed(1)}</div>
          <div className="text-[0.68rem] text-slate-400 truncate mt-0.5">
            {uvIndex >= 6 ? 'High solar intensity' : 'Moderate sun level'}
          </div>
        </div>

      </div>

    </div>
  );
}

