import React, { useState } from 'react';
import { Calendar, Clock, Sprout, HardHat, Briefcase, Users, AlertTriangle, ShieldCheck, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

export default function WorkPlanner({ district, apiBase, isDay, cardBg, subText, headingText, inputBg }) {
  const [activity, setActivity] = useState('farming');
  const [startHour, setStartHour] = useState(7);
  const [duration, setDuration] = useState(8);
  const [isPlanning, setIsPlanning] = useState(false);
  const [planResult, setPlanResult] = useState(null);
  const [planError, setPlanError] = useState(null);

  const activities = [
    { id: 'farming', label: 'Farming & Agriculture', icon: Sprout, desc: 'Paddy field labor, tilling, pesticide spraying, harvesting' },
    { id: 'construction', label: 'Construction & Rigging', icon: HardHat, desc: 'Scaffolding, concrete pouring, crane operation, roofing' },
    { id: 'daily_wage', label: 'Daily-Wage Labor', icon: Briefcase, desc: 'Manual transport, roadwork, bricklaying, loading' },
    { id: 'general', label: 'General Outdoor Public', icon: Users, desc: 'Travel, vendor stalls, logistics, sports & transit' }
  ];

  const handleGeneratePlan = async () => {
    setIsPlanning(true);
    setPlanError(null);
    try {
      const resp = await fetch(`${apiBase}/api/plan-work`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          district,
          activity,
          shift_start_hour: parseInt(startHour, 10),
          duration_hours: parseInt(duration, 10)
        })
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to generate workability plan.');
      }

      const data = await resp.json();
      setPlanResult(data);
    } catch (err) {
      setPlanError(err.message || 'Error communicating with safety planner.');
    } finally {
      setIsPlanning(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-500" />
          Plan My Outdoor Work (Shift Feasibility Engine)
        </h3>
        <p className={`text-xs ${subText}`}>
          Simulates meteorological hazard exposure across your intended working hours for <strong className="text-blue-500">{district}</strong>.
        </p>
      </div>

      {/* Input Form */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Activity Selector */}
        <div className="flex flex-col gap-1.5 md:col-span-1">
          <label className={`text-[0.68rem] font-bold uppercase tracking-wider ${subText}`}>
            Occupation / Outdoor Task
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
                  className={`text-left p-2.5 rounded-xl border flex items-center gap-3 transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500/15 shadow-sm'
                      : 'border-slate-300/40 dark:border-slate-800 hover:border-blue-400/50'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-blue-500 text-white' : 'bg-slate-200/50 dark:bg-slate-800 text-slate-400'}`}>
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold leading-tight">{act.label}</div>
                    <div className={`text-[0.62rem] ${subText} line-clamp-1`}>{act.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Shift Start & Duration Pickers */}
        <div className="flex flex-col justify-between gap-4 md:col-span-2">
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
                      <option key={i} value={i}>
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
                  <option value={4}>4 Hours (Half Day Shift)</option>
                  <option value={6}>6 Hours (Standard Field Shift)</option>
                  <option value={8}>8 Hours (Full Working Shift)</option>
                  <option value={10}>10 Hours (Extended Shift)</option>
                </select>
                <Calendar className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <button
            onClick={handleGeneratePlan}
            disabled={isPlanning}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
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

      {/* Plan Evaluation Error */}
      {planError && (
        <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-500 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{planError}</span>
        </div>
      )}

      {/* Plan Evaluation Output */}
      {planResult && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/40 border border-slate-700/60 flex flex-col gap-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-700/60">
            <div>
              <span className={`text-[0.65rem] font-bold uppercase tracking-wider ${subText}`}>
                Shift Feasibility Assessment ({planResult.shift_start} for {planResult.duration_hours}h)
              </span>
              <h4 className="text-base sm:text-lg font-black text-white mt-0.5">
                {planResult.shift_feasibility}
              </h4>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className={`text-[0.65rem] font-semibold ${subText}`}>Avg Safety Score</div>
                <div className="text-xl font-black font-mono text-emerald-400">
                  {planResult.metrics?.average_safety_score}/10
                </div>
              </div>
              <div className="text-right border-l border-slate-700 pl-3">
                <div className={`text-[0.65rem] font-semibold ${subText}`}>Lowest Score</div>
                <div className="text-xl font-black font-mono text-amber-400">
                  {planResult.metrics?.minimum_safety_score}/10
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs sm:text-sm font-medium leading-relaxed text-slate-200">
            {planResult.summary}
          </p>

          {/* Favorable vs Risky Windows */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Favorable Working Windows
              </div>
              <div className="text-slate-300">
                {planResult.optimal_windows && planResult.optimal_windows.length > 0
                  ? planResult.optimal_windows.join(', ')
                  : 'No optimal low-risk hours detected during this shift.'}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="font-bold text-amber-400 flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3.5 h-3.5" /> High Risk Hours to Reconsider
              </div>
              <div className="text-slate-300">
                {planResult.risky_windows && planResult.risky_windows.length > 0
                  ? planResult.risky_windows.join(', ')
                  : 'No elevated risk spikes detected during this shift.'}
              </div>
            </div>
          </div>

          {/* Tailored Precautions & ISO Hydration Guidance */}
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs flex flex-col gap-2">
            <div>
              <div className="font-bold text-blue-400 mb-0.5">Tailored Occupation Advisory:</div>
              <div className="text-slate-200 leading-normal">{planResult.tailored_precautions}</div>
            </div>
            {planResult.hydration_guidance && (
              <div className="pt-2 border-t border-blue-500/20 text-cyan-300 font-semibold flex items-center gap-1.5">
                <span>💧</span>
                <span>{planResult.hydration_guidance}</span>
              </div>
            )}
          </div>

          {/* Sector Clearances (Agriculture / Construction / Marine) */}
          {planResult.sector_clearance && (
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col gap-2 text-xs">
              <span className="font-bold uppercase tracking-wider text-[0.65rem] text-slate-400">
                Operational Sector Safety Clearances
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {planResult.sector_clearance.agriculture && (
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                    <span className="text-[0.65rem] text-slate-400">Pesticide Spraying</span>
                    <span className={`text-xs font-black ${planResult.sector_clearance.agriculture.pesticide_spraying_permitted ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {planResult.sector_clearance.agriculture.pesticide_spraying_status}
                    </span>
                    <span className="text-[0.62rem] text-slate-400 line-clamp-1">{planResult.sector_clearance.agriculture.pesticide_spraying_reason}</span>
                  </div>
                )}
                {planResult.sector_clearance.construction && (
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                    <span className="text-[0.65rem] text-slate-400">High Scaffolding</span>
                    <span className={`text-xs font-black ${planResult.sector_clearance.construction.high_scaffolding_permitted ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {planResult.sector_clearance.construction.high_scaffolding_status}
                    </span>
                    <span className="text-[0.62rem] text-slate-400 line-clamp-1">{planResult.sector_clearance.construction.high_scaffolding_reason}</span>
                  </div>
                )}
                {planResult.sector_clearance.construction && (
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                    <span className="text-[0.65rem] text-slate-400">Crane Lifting</span>
                    <span className={`text-xs font-black ${planResult.sector_clearance.construction.crane_lifts_permitted ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {planResult.sector_clearance.construction.crane_lifts_status}
                    </span>
                    <span className="text-[0.62rem] text-slate-400 line-clamp-1">{planResult.sector_clearance.construction.crane_lifts_reason}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="text-[0.65rem] italic text-slate-400">
            {planResult.disclaimer}
          </div>
        </div>
      )}
    </div>
  );
}
