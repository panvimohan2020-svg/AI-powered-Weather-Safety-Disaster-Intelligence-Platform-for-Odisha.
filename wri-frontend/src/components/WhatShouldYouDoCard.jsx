import React from 'react';
import { 
  CheckCircle2, AlertOctagon, Droplets, Clock, Umbrella, 
  Wind, Shield, Sun, Home, Radio, HelpCircle
} from 'lucide-react';

/**
 * Actionable Safety Directives Card: "What should you do today?"
 * Translates meteorological telemetry and hazard scores into clear,
 * actionable precautions for farmers, laborers, and everyday citizens.
 */
export default function WhatShouldYouDoCard({ 
  wriData = null, 
  hasDisasterAlert = false,
  primaryAlert = null
}) {
  const score = wriData?.prediction?.safety_score ?? 8.0;
  const temp = wriData?.weather?.temperature_c ?? 30;
  const rainProb = (wriData?.prediction?.rain_probability ?? 0.1) * 100;
  const windSpeed = wriData?.weather?.wind_speed_kmh ?? 12;
  const uvIndex = wriData?.prediction?.penalties?.uv ?? 0;

  // Build dynamic, situational advice
  const getActionDirectives = () => {
    const list = [];

    // 1. Critical Disaster Warning Directive
    if (hasDisasterAlert && primaryAlert) {
      list.push({
        id: 'disaster',
        type: 'danger',
        icon: AlertOctagon,
        title: `${primaryAlert.category || 'Disaster'} Protocol Active`,
        desc: primaryAlert.action_instructions || 'Remain indoors, keep emergency radio on, and follow district evacuation guidance.',
        tag: 'IMMEDIATE ACTION'
      });
    }

    // 2. Heat Stress / Thermal Load Directive
    if (temp >= 38) {
      list.push({
        id: 'heat_extreme',
        type: 'warning',
        icon: Sun,
        title: 'Cease Strenuous Afternoon Labor',
        desc: 'Halt heavy field digging, construction lifting, and roof work between 11:30 AM and 3:30 PM to avoid fatal heatstroke.',
        tag: 'WORK RESTRICTION'
      });
    } else if (temp >= 33) {
      list.push({
        id: 'heat_moderate',
        type: 'caution',
        icon: Clock,
        title: 'Adopt Shift Rest Cycles',
        desc: 'Schedule 15-minute shaded rest breaks every 45 minutes of continuous outdoor activity.',
        tag: 'REST CYCLES'
      });
    }

    // 3. Hydration Directive (Always relevant in tropical Odisha)
    list.push({
      id: 'hydration',
      type: 'info',
      icon: Droplets,
      title: 'Mandatory Hydration Schedule',
      desc: temp >= 35 
        ? 'Drink 250ml to 300ml of clean potable water or oral rehydration solution (ORS) every 20 minutes, even if you do not feel thirsty.' 
        : 'Drink water at regular intervals throughout your shift to maintain bodily electrolyte balance.',
      tag: 'HEALTH DIRECTIVE'
    });

    // 4. Rain & Convective Storm Directive
    if (rainProb >= 60) {
      list.push({
        id: 'rain_high',
        type: 'warning',
        icon: Umbrella,
        title: 'Rain & Convective Inundation Watch',
        desc: 'Cover exposed agricultural produce and cement bags. In the event of lightning or sudden thunder, avoid standing beneath tall trees.',
        tag: 'CROP & SITE SAFETY'
      });
    } else if (rainProb >= 35) {
      list.push({
        id: 'rain_moderate',
        type: 'info',
        icon: Umbrella,
        title: 'Prepare Waterproof Coverage',
        desc: 'Keep rain covers ready for harvested grain and clear storm drainage canals before evening showers.',
        tag: 'ADVISORY'
      });
    }

    // 5. High Wind & Spraying Directive
    if (windSpeed >= 25) {
      list.push({
        id: 'wind_high',
        type: 'warning',
        icon: Wind,
        title: 'Pause Pesticide Spraying & High Scaffolding',
        desc: 'Strong winds will cause chemical spray drift onto adjacent crops and make tall ladders and crane operations hazardous.',
        tag: 'OPERATIONAL PAUSE'
      });
    }

    // Default favorable condition directive if few hazards exist
    if (list.length < 3) {
      list.push({
        id: 'favorable',
        type: 'success',
        icon: CheckCircle2,
        title: 'Normal Outdoor Operations Permitted',
        desc: 'Atmospheric risk is within safe thresholds. Proceed with agricultural harvesting, construction work, and standard commutes.',
        tag: 'PERMITTED'
      });
    }

    return list.slice(0, 4); // Keep concise and clean
  };

  const directives = getActionDirectives();

  const getTagBadge = (type) => {
    switch (type) {
      case 'danger':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'warning':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'caution':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'success':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'info':
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <div className="rounded-3xl border border-slate-700/60 bg-slate-900/80 backdrop-blur-md p-6 sm:p-8 flex flex-col justify-between shadow-xl transition-all duration-300">
      
      {/* Title Header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <span className="text-[0.7rem] font-bold uppercase tracking-wider text-slate-400">
            Practical Daily Directives
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-white mt-0.5">
            What should you do today?
          </h3>
        </div>
        <div className="p-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-300">
          <HelpCircle className="w-5 h-5 text-blue-400" />
        </div>
      </div>

      {/* Actionable List */}
      <div className="flex flex-col gap-3">
        {directives.map(item => (
          <div 
            key={item.id}
            className="p-3.5 sm:p-4 rounded-2xl bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/50 transition-all flex items-start gap-3.5"
          >
            <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 flex-shrink-0 mt-0.5">
              <item.icon className="w-4 h-4 text-slate-200" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <h4 className="text-sm font-bold text-white truncate">
                  {item.title}
                </h4>
                <span className={`text-[0.65rem] font-extrabold px-2 py-0.5 rounded-full border ${getTagBadge(item.type)}`}>
                  {item.tag}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Note */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[0.7rem] text-slate-400">
        <span>Based on IMD & National Weather Guidelines</span>
        <span>Empirical Outdoor Safety</span>
      </div>

    </div>
  );
}

