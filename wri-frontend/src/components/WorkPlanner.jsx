import React, { useState } from 'react';
import { 
  Calendar, Clock, Sprout, HardHat, Briefcase, Users, AlertTriangle, 
  ShieldCheck, CheckCircle2, Loader2, ArrowRight, MapPin, RotateCcw,
  Sun, Moon, CloudRain, Wind, ThermometerSun, AlertCircle
} from 'lucide-react';

export default function WorkPlanner({ 
  district, 
  locality, 
  coordinates, 
  apiBase, 
  isDay, 
  cardBg, 
  subText, 
  headingText, 
  inputBg 
}) {
  const [activity, setActivity] = useState('general');
  const [shiftDate, setShiftDate] = useState('today');
  const [startHour, setStartHour] = useState(7);
  const [duration, setDuration] = useState(4);
  const [isPlanning, setIsPlanning] = useState(false);
  const [planResult, setPlanResult] = useState(null);
  const [planError, setPlanError] = useState(null);

  const activities = [
    { id: 'farming', label: 'Farming & Agriculture', icon: Sprout, desc: 'Paddy labor, spraying, tilling, harvesting' },
    { id: 'construction', label: 'Construction & Rigging', icon: HardHat, desc: 'Scaffolding, concrete pouring, crane operation' },
    { id: 'daily_wage', label: 'Daily-Wage Labor', icon: Briefcase, desc: 'Manual transport, roadwork, bricklaying, loading' },
    { id: 'general', label: 'General Outdoor Public', icon: Users, desc: 'Travel, vendor stalls, logistics, transit' }
  ];

  // Dynamic Date Labels
  const todayObj = new Date();
  const tomorrowObj = new Date();
  tomorrowObj.setDate(todayObj.getDate() + 1);

  const formatDateLabel = (d) => {
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const todayLabel = `Today (${formatDateLabel(todayObj)})`;
  const tomorrowLabel = `Tomorrow (${formatDateLabel(tomorrowObj)})`;

  const handleGeneratePlan = async (overrideDate = null) => {
    const activeDateMode = overrideDate || shiftDate;
    setIsPlanning(true);
    setPlanError(null);

    try {
      const payload = {
        district: district || 'Rayagada',
        activity,
        shift_date: activeDateMode,
        shift_start_hour: parseInt(startHour, 10),
        duration_hours: parseInt(duration, 10)
      };

      if (locality) payload.locality = locality;
      if (coordinates?.latitude && coordinates?.longitude) {
        payload.latitude = coordinates.latitude;
        payload.longitude = coordinates.longitude;
      }

      const resp = await fetch(`${apiBase}/api/plan-work`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to generate workability plan from meteorological pipeline.');
      }

      const data = await resp.json();
      setPlanResult(data);
    } catch (err) {
      setPlanError(err.message || 'Error communicating with safety planner.');
    } finally {
      setIsPlanning(false);
    }
  };

  const getRiskBadge = (score) => {
    if (score >= 8.0) return { label: 'LOW RISK', bg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' };
    if (score >= 6.0) return { label: 'MODERATE RISK', bg: 'bg-yellow-500/15 border-yellow-500/40 text-yellow-400' };
    if (score >= 4.0) return { label: 'HIGH RISK', bg: 'bg-orange-500/15 border-orange-500/40 text-orange-400' };
    return { label: 'EXTREME RISK', bg: 'bg-rose-500/15 border-rose-500/40 text-rose-400' };
  };

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Header and Geographic Locality Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex flex-col gap-1">
          <h3 className="text-base sm:text-lg font-black flex items-center gap-2 text-white">
            <Calendar className="w-5 h-5 text-blue-500" />
            Work Safety Planner & Shift Feasibility Engine
          </h3>
          <p className={`text-xs ${subText}`}>
            Simulates hourly meteorological hazard exposure across planned working hours.
          </p>
        </div>

        {/* Resolved Location Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs">
          <MapPin className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-semibold text-slate-200">
            {district}
            {locality && locality.toLowerCase() !== district.toLowerCase() && (
              <span className="text-blue-400 font-bold ml-1.5">• {locality} (GPS)</span>
            )}
          </span>
        </div>
      </div>

      {/* Input Planning Form */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Activity Persona Selector */}
        <div className="flex flex-col gap-1.5 md:col-span-1">
          <label className={`text-[0.68rem] font-bold uppercase tracking-wider ${subText}`}>
            Occupation / Task Persona
          </label>
          <div className="flex flex-col gap-2">
            {activities.map(act => {
              const IconComp = act.icon;
              const isSelected = activity === act.id;
              return (
                <button
                  key={act.id}
                  onClick={() => setActivity(act.id)}
                  type="button"
                  className={`text-left p-2.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500/15 shadow-sm ring-1 ring-blue-500/50'
                      : 'border-slate-700/60 bg-slate-800/40 hover:border-blue-400/50 hover:bg-slate-800/70'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold leading-tight text-white">{act.label}</div>
                    <div className={`text-[0.62rem] ${subText} line-clamp-1`}>{act.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Shift Date, Start Time & Duration Pickers */}
        <div className="flex flex-col justify-between gap-4 md:col-span-2">
          {/* Shift Date Selector: Today vs Tomorrow */}
          <div className="flex flex-col gap-1.5">
            <label className={`text-[0.68rem] font-bold uppercase tracking-wider ${subText}`}>
              Planning Shift Date
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShiftDate('today')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  shiftDate === 'today'
                    ? 'border-blue-500 bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50'
                    : 'border-slate-700/60 bg-slate-800/40 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{todayLabel}</span>
              </button>
              <button
                type="button"
                onClick={() => setShiftDate('tomorrow')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  shiftDate === 'tomorrow'
                    ? 'border-blue-500 bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50'
                    : 'border-slate-700/60 bg-slate-800/40 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{tomorrowLabel}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`text-[0.68rem] font-bold uppercase tracking-wider mb-1.5 block ${subText}`}>
                Shift Start Time
              </label>
              <div className="relative">
                <select
                  value={startHour}
                  onChange={e => setStartHour(parseInt(e.target.value, 10))}
                  className={`w-full appearance-none rounded-xl py-3 pl-3.5 pr-8 font-bold text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
                >
                  {Array.from({ length: 24 }).map((_, i) => {
                    const period = i >= 12 ? 'PM' : 'AM';
                    const h12 = i === 0 ? 12 : (i > 12 ? i - 12 : i);
                    return (
                      <option key={i} value={i} className="bg-slate-900 text-white">
                        {h12.toString().padStart(2, '0')}:00 {period} {i >= 6 && i <= 10 ? '★ Early Shift' : ''}
                      </option>
                    );
                  })}
                </select>
                <Clock className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className={`text-[0.68rem] font-bold uppercase tracking-wider mb-1.5 block ${subText}`}>
                Shift Duration
              </label>
              <div className="relative">
                <select
                  value={duration}
                  onChange={e => setDuration(parseInt(e.target.value, 10))}
                  className={`w-full appearance-none rounded-xl py-3 pl-3.5 pr-8 font-bold text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
                >
                  <option value={4} className="bg-slate-900 text-white">4 Hours (Half Day Shift)</option>
                  <option value={6} className="bg-slate-900 text-white">6 Hours (Standard Field Shift)</option>
                  <option value={8} className="bg-slate-900 text-white">8 Hours (Full Working Shift)</option>
                  <option value={10} className="bg-slate-900 text-white">10 Hours (Extended Shift)</option>
                </select>
                <Calendar className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <button
            onClick={() => handleGeneratePlan()}
            disabled={isPlanning}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-70"
          >
            {isPlanning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Simulating Shift Weather Hazards...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Evaluate Work Shift Feasibility</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Plan Evaluation Error with Retry Button */}
      {planError && (
        <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <div className="font-bold text-white">Safety Evaluation Notice</div>
              <div className="text-red-300 mt-0.5">{planError}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleGeneratePlan()}
            className="px-3.5 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-white font-bold text-xs border border-red-500/40 flex items-center gap-1.5 transition-all cursor-pointer self-end sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Simulation</span>
          </button>
        </div>
      )}

      {/* Plan Evaluation Output */}
      {planResult && (
        <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-700/60 backdrop-blur-md flex flex-col gap-5 shadow-2xl animate-fade-in">
          {/* Past Shift Warning & Switch-to-Tomorrow Banner */}
          {planResult.is_past_shift && (
            <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="font-bold text-white">Shift Timeframe Has Passed for Today</div>
                  <div className="text-amber-200 mt-0.5">{planResult.past_shift_message}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShiftDate('tomorrow');
                  handleGeneratePlan('tomorrow');
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shadow-md self-end sm:self-auto"
              >
                <span>Plan for Tomorrow at {planResult.shift_start}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Assessment Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-700/60">
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[0.65rem] font-bold uppercase tracking-wider ${subText}`}>
                  {planResult.shift_date_label} Shift • {planResult.shift_start} to {planResult.shift_end} ({planResult.duration_hours}h)
                </span>
                <span className={`text-[0.62rem] font-bold px-2 py-0.5 rounded-full border ${
                  planResult.shift_status === 'PAST'
                    ? 'bg-slate-700/60 border-slate-600 text-slate-300'
                    : planResult.shift_status === 'IN PROGRESS'
                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-400 animate-pulse'
                    : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                }`}>
                  {planResult.shift_status || 'UPCOMING'}
                </span>
              </div>
              <h4 className="text-lg sm:text-xl font-black text-white mt-1">
                {planResult.shift_feasibility}
              </h4>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className={`text-[0.65rem] font-semibold ${subText}`}>Avg Safety Score</div>
                <div className="text-2xl font-black font-mono text-emerald-400">
                  {planResult.metrics?.average_safety_score}/10
                </div>
              </div>
              <div className="text-right border-l border-slate-700/60 pl-4">
                <div className={`text-[0.65rem] font-semibold ${subText}`}>Lowest Score</div>
                <div className="text-2xl font-black font-mono text-amber-400">
                  {planResult.metrics?.minimum_safety_score}/10
                </div>
              </div>
            </div>
          </div>

          {/* Summary Text */}
          <p className="text-xs sm:text-sm font-medium leading-relaxed text-slate-200">
            {planResult.summary}
          </p>

          {/* Key Metrics Quick-Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
              <span className={`text-[0.65rem] font-bold ${subText} block mb-1`}>Peak Temperature</span>
              <span className="text-lg font-black text-rose-400 font-mono">
                {planResult.metrics?.maximum_temperature_c}°C
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
              <span className={`text-[0.65rem] font-bold ${subText} block mb-1`}>Peak Rain Chance</span>
              <span className="text-lg font-black text-blue-400 font-mono">
                {planResult.metrics?.peak_rain_probability}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
              <span className={`text-[0.65rem] font-bold ${subText} block mb-1`}>Peak Wind Speed</span>
              <span className="text-lg font-black text-cyan-400 font-mono">
                {planResult.metrics?.peak_wind_kmh} km/h
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
              <span className={`text-[0.65rem] font-bold ${subText} block mb-1`}>Target Work Locality</span>
              <span className="text-sm font-black text-emerald-400 truncate block">
                {planResult.locality || planResult.district}
              </span>
            </div>
          </div>

          {/* ============================================================== */}
          {/* HOURLY SHIFT TIMELINE BREAKDOWN TABLE                          */}
          {/* ============================================================== */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-400" />
                Hourly Shift Timeline Breakdown ({planResult.shift_timeline?.length || 0} Hours)
              </span>
              <span className="text-[0.65rem] text-slate-400 font-semibold">
                Timezone: Indian Standard Time (IST)
              </span>
            </div>

            {planResult.shift_timeline && planResult.shift_timeline.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-700/60 bg-slate-950/60">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-bold text-[0.65rem] uppercase tracking-wider">
                      <th className="py-2.5 px-3">Time</th>
                      <th className="py-2.5 px-3">Condition</th>
                      <th className="py-2.5 px-3">Temp</th>
                      <th className="py-2.5 px-3">Humidity</th>
                      <th className="py-2.5 px-3">Wind / Gusts</th>
                      <th className="py-2.5 px-3">Rain Prob</th>
                      <th className="py-2.5 px-3">UV Index</th>
                      <th className="py-2.5 px-3 text-right">WRI Safety Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {planResult.shift_timeline.map((hour, idx) => {
                      const badge = getRiskBadge(hour.safety_score);
                      return (
                        <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-white whitespace-nowrap">
                            {hour.hour_label}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                            <span className="flex items-center gap-1.5">
                              {hour.is_daytime ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-300" />}
                              <span>{hour.condition || 'Mainly Clear'}</span>
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-rose-300 whitespace-nowrap">
                            {hour.temperature_c}°C
                          </td>
                          <td className="py-2.5 px-3 font-mono text-cyan-300 whitespace-nowrap">
                            {hour.humidity_percent}%
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-300 whitespace-nowrap">
                            {hour.wind_speed_kmh} <span className="text-[0.62rem] text-slate-500">km/h</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-400 whitespace-nowrap">
                            {hour.rain_percentage || `${Math.round(hour.rain_probability * 100)}%`}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-amber-300 whitespace-nowrap">
                            {hour.uv_index}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-mono font-black text-[0.65rem] ${badge.bg}`}>
                              <span>{hour.safety_score}/10</span>
                              <span>•</span>
                              <span>{badge.label}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 text-center text-xs text-slate-400">
                Shift timeline details currently unavailable.
              </div>
            )}
          </div>

          {/* Favorable vs Risky Windows */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="w-4 h-4" /> Favorable Working Windows
              </div>
              <div className="text-slate-300 leading-relaxed">
                {planResult.optimal_windows && planResult.optimal_windows.length > 0
                  ? planResult.optimal_windows.join(', ')
                  : 'No optimal low-risk hours detected during this shift.'}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <div className="font-bold text-amber-400 flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-4 h-4" /> High Risk Hours to Reconsider
              </div>
              <div className="text-slate-300 leading-relaxed">
                {planResult.risky_windows && planResult.risky_windows.length > 0
                  ? planResult.risky_windows.join(', ')
                  : 'No elevated risk spikes detected during this shift.'}
              </div>
            </div>
          </div>

          {/* Tailored Precautions & ISO Hydration Guidance */}
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs flex flex-col gap-2.5">
            <div>
              <div className="font-bold text-blue-400 mb-0.5">Tailored Persona Advisory:</div>
              <div className="text-slate-200 leading-relaxed">{planResult.tailored_precautions}</div>
            </div>
            {planResult.hydration_guidance && (
              <div className="pt-2.5 border-t border-blue-500/20 text-cyan-300 font-semibold flex items-center gap-2">
                <span className="text-base">💧</span>
                <span>{planResult.hydration_guidance}</span>
              </div>
            )}
          </div>

          {/* Sector Clearances */}
          {planResult.sector_clearance && (
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex flex-col gap-2.5 text-xs">
              <span className="font-bold uppercase tracking-wider text-[0.65rem] text-slate-400">
                Operational Sector Safety Clearances
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {planResult.sector_clearance.agriculture && (
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between gap-1">
                    <span className="text-[0.65rem] text-slate-400 font-semibold">Pesticide Spraying</span>
                    <span className={`text-xs font-black ${planResult.sector_clearance.agriculture.pesticide_spraying_permitted ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {planResult.sector_clearance.agriculture.pesticide_spraying_status}
                    </span>
                    <span className="text-[0.62rem] text-slate-400 line-clamp-1">{planResult.sector_clearance.agriculture.pesticide_spraying_reason}</span>
                  </div>
                )}
                {planResult.sector_clearance.construction && (
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between gap-1">
                    <span className="text-[0.65rem] text-slate-400 font-semibold">High Scaffolding</span>
                    <span className={`text-xs font-black ${planResult.sector_clearance.construction.high_scaffolding_permitted ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {planResult.sector_clearance.construction.high_scaffolding_status}
                    </span>
                    <span className="text-[0.62rem] text-slate-400 line-clamp-1">{planResult.sector_clearance.construction.high_scaffolding_reason}</span>
                  </div>
                )}
                {planResult.sector_clearance.construction && (
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between gap-1">
                    <span className="text-[0.65rem] text-slate-400 font-semibold">Crane Lifting</span>
                    <span className={`text-xs font-black ${planResult.sector_clearance.construction.crane_lifts_permitted ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {planResult.sector_clearance.construction.crane_lifts_status}
                    </span>
                    <span className="text-[0.62rem] text-slate-400 line-clamp-1">{planResult.sector_clearance.construction.crane_lifts_reason}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="text-[0.65rem] italic text-slate-500">
            {planResult.disclaimer}
          </div>
        </div>
      )}
    </div>
  );
}
