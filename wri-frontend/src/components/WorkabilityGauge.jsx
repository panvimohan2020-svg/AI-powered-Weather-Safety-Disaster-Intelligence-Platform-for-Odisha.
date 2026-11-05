import React from 'react';
import { 
  ShieldCheck, AlertTriangle, ShieldAlert, 
  Thermometer, Droplets, Wind, CloudRain, Sun, Gauge, Info
} from 'lucide-react';

/**
 * Modern Circular Workability Safety Gauge
 * Visualizes the 0 to 10 safety score with animated SVG ring progress,
 * color-coded status badges, and simplified plain-language hazard factor cards.
 */
export default function WorkabilityGauge({ 
  score = 8.5, 
  riskLevel = 'SAFE / LOW RISK', 
  district = 'Khurda (Bhubaneswar)', 
  locality = null,
  summaryAdvice = '',
  penalties = {},
  contributions = {},
  weather = {},
  occupationalGuidelines = null,
  primaryLimitingFactor = '',
  isDay = false
}) {
  const numericScore = typeof score === 'number' ? Math.max(0, Math.min(10, score)) : 5.0;

  // Gauge SVG Math (Radius 76, Circumference ~477.5)
  const radius = 76;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (numericScore / 10) * circumference;

  // Determine Color Scheme by score band
  const getTheme = () => {
    if (numericScore >= 8.0) {
      return {
        stroke: '#10b981', // emerald-500
        glow: 'rgba(16, 185, 129, 0.25)',
        badgeBg: 'bg-emerald-500/15',
        badgeBorder: 'border-emerald-500/30',
        badgeText: 'text-emerald-400',
        label: 'FAVORABLE / LOW RISK',
        textColor: 'text-emerald-400',
        icon: ShieldCheck
      };
    } else if (numericScore >= 5.0) {
      return {
        stroke: '#f59e0b', // amber-500
        glow: 'rgba(245, 158, 11, 0.25)',
        badgeBg: 'bg-amber-500/15',
        badgeBorder: 'border-amber-500/30',
        badgeText: 'text-amber-400',
        label: 'MODERATE RISK / CAUTION',
        textColor: 'text-amber-400',
        icon: AlertTriangle
      };
    } else {
      return {
        stroke: '#ef4444', // red-500
        glow: 'rgba(239, 68, 68, 0.25)',
        badgeBg: 'bg-red-500/15',
        badgeBorder: 'border-red-500/30',
        badgeText: 'text-red-400',
        label: 'HIGH RISK / DANGER',
        textColor: 'text-red-400',
        icon: ShieldAlert
      };
    }
  };

  const theme = getTheme();
  const StatusIcon = theme.icon;

  // Hazard factor breakdowns with simple human-friendly explanations
  const thermalVal = penalties.thermal ?? penalties.temp ?? 0;
  const rainVal = penalties.rain ?? 0;
  const windVal = penalties.wind ?? 0;
  const uvVal = penalties.uv ?? 0;

  const hazardFactors = [
    {
      id: 'temp',
      name: 'Thermal Strain (WBGT)',
      icon: Thermometer,
      val: `${weather.temperature_c ?? '--'}°C`,
      penalty: thermalVal,
      description: thermalVal > 1.5 ? 'Significant heat strain on body' : (thermalVal > 0.5 ? 'Moderate heat load' : 'Normal thermal range'),
      color: thermalVal > 1.0 ? 'text-red-400' : 'text-slate-300'
    },
    {
      id: 'rain',
      name: 'Rain / Thunderstorm',
      icon: CloudRain,
      val: `${weather.precipitation_today_mm ?? 0} mm`,
      penalty: rainVal,
      description: rainVal > 1.5 ? 'Heavy precipitation / storm' : (rainVal > 0.5 ? 'Scattered rain threat' : 'Dry ground conditions'),
      color: rainVal > 1.0 ? 'text-blue-400' : 'text-slate-300'
    },
    {
      id: 'wind',
      name: 'Wind & Gusts',
      icon: Wind,
      val: `${weather.wind_speed_kmh ?? '--'} km/h`,
      penalty: windVal,
      description: (weather.wind_speed_kmh ?? 0) > 28 ? 'Elevated mechanical wind hazard' : 'Safe gentle breeze',
      color: windVal > 0.8 ? 'text-amber-400' : 'text-slate-300'
    },
    {
      id: 'uv',
      name: 'Solar UV Exposure',
      icon: Sun,
      val: `UV ${weather.uv_index ?? 5.0}`,
      penalty: uvVal,
      description: uvVal > 0.6 ? 'High solar radiation burn risk' : 'Manageable solar exposure',
      color: uvVal > 0.6 ? 'text-amber-400' : 'text-slate-300'
    }
  ];

  return (
    <div className="rounded-3xl border border-slate-700/60 bg-slate-900/80 backdrop-blur-md p-6 sm:p-8 flex flex-col justify-between shadow-xl relative overflow-hidden transition-all duration-300">
      
      {/* Background Soft Glow */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full pointer-events-none blur-3xl -z-10"
        style={{ backgroundColor: theme.glow }}
      />

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <span className="text-[0.7rem] font-bold uppercase tracking-wider text-slate-400">
            Workability Safety Index
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 mt-0.5">
            <span>{district}</span>
            {locality && locality !== district && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                📍 {locality}
              </span>
            )}
          </h3>
        </div>

        {/* Status Badge */}
        <div className={`self-start sm:self-auto px-3.5 py-1.5 rounded-full border ${theme.badgeBg} ${theme.badgeBorder} ${theme.badgeText} flex items-center gap-1.5 text-xs font-black uppercase tracking-wider shadow-sm`}>
          <StatusIcon className="w-4 h-4" />
          <span>{theme.label}</span>
        </div>
      </div>

      {/* Center Circular Gauge Visual */}
      <div className="flex flex-col items-center justify-center my-4">
        <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 180 180">
            {/* Background Track */}
            <circle
              cx="90"
              cy="90"
              r={radius}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Dynamic Progress Stroke */}
            <circle
              cx="90"
              cy="90"
              r={radius}
              stroke={theme.stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-out"
            />
          </svg>

          {/* Core Score Number inside Ring */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className={`text-5xl sm:text-6xl font-black tracking-tight ${theme.textColor}`}>
              {numericScore.toFixed(1)}
            </span>
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">
              out of 10
            </span>
          </div>
        </div>

        {/* Human-Readable Advice Sentence */}
        <p className="text-center text-sm sm:text-base font-semibold text-slate-200 mt-4 max-w-md px-2 leading-snug">
          {summaryAdvice || (
            numericScore >= 8.0 
              ? 'Weather conditions are favorable for all normal outdoor work and agricultural operations.' 
              : (numericScore >= 5.0 
                  ? 'Moderate weather stress detected. Stay hydrated and schedule short shaded rests.' 
                  : 'Hazardous weather conditions. Minimize strenuous outdoor exposure during peak heat or rain.')
          )}
        </p>

        {/* ISO 7243 Work-Rest & Hydration Chips */}
        {occupationalGuidelines && (
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 border border-blue-500/30 text-blue-300">
              ⏱️ {occupationalGuidelines.work_rest_cycle || 'Continuous Work'}
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
              💧 {occupationalGuidelines.hydration_target_ml_hr || 500} mL/hr Target
            </span>
          </div>
        )}

        {/* Primary Limiting Hazard Chip (if conditions elevated) */}
        {primaryLimitingFactor && numericScore < 8.0 && (
          <div className="mt-2.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[0.72rem] font-bold text-amber-300/90 text-center">
            ⚠️ Limiting Factor: {primaryLimitingFactor}
          </div>
        )}
      </div>

      {/* Key Reasons / Deductions Grid */}
      <div className="mt-6 pt-5 border-t border-slate-800">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          <span>Key Factors Affecting Score</span>
          <span className="text-[0.65rem] font-normal text-slate-400">Penalties deducted from 10</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {hazardFactors.map(factor => (
            <div 
              key={factor.id} 
              className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-1 text-slate-400 mb-1">
                <factor.icon className="w-4 h-4 text-slate-400" />
                <span className={`text-xs font-black ${factor.penalty > 0.5 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {factor.penalty > 0 ? `-${factor.penalty.toFixed(1)} pts` : '0 pts'}
                </span>
              </div>
              <div className="font-bold text-xs text-white truncate">{factor.name}</div>
              <div className="text-[0.68rem] text-slate-400 mt-0.5 line-clamp-1">{factor.val} • {factor.description}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

