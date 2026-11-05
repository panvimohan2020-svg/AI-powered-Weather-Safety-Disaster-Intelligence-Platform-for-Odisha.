import React, { useState } from 'react';
import { AlertTriangle, AlertCircle, ShieldAlert, ChevronDown, ChevronUp, Bell, Siren, Volume2 } from 'lucide-react';

export default function AlertsBanner({ alerts, onOpenEmergencyView, onSoundAlarm }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!alerts || alerts.length === 0) {
    return null;
  }

  // Check highest severity level
  const maxLevel = Math.max(...alerts.map(a => a.severity_level || (a.severity === 'RED' ? 3 : (a.severity === 'ORANGE' ? 2 : 1))));
  const isLevel4 = maxLevel === 4;
  const isLevel3 = maxLevel === 3;

  let bannerStyle = 'bg-amber-500/15 border-amber-500/40 text-amber-300';
  let badgeStyle = 'bg-amber-500 text-black';
  let primaryIcon = AlertTriangle;

  if (isLevel4) {
    bannerStyle = 'bg-red-600/30 border-red-500 text-white shadow-2xl ring-2 ring-red-500 animate-pulse-slow';
    badgeStyle = 'bg-red-600 text-white animate-pulse';
    primaryIcon = Siren;
  } else if (isLevel3) {
    bannerStyle = 'bg-red-500/20 border-red-500/50 text-red-300';
    badgeStyle = 'bg-red-600 text-white';
    primaryIcon = ShieldAlert;
  } else if (maxLevel === 2) {
    bannerStyle = 'bg-orange-500/20 border-orange-500/50 text-orange-300';
    badgeStyle = 'bg-orange-600 text-white';
    primaryIcon = AlertCircle;
  }

  const IconComp = primaryIcon;
  const primaryAlert = alerts[0];

  return (
    <div className={`w-full rounded-3xl border p-4 sm:p-5 flex flex-col gap-3 shadow-xl transition-all ${bannerStyle}`}>
      {/* Top Banner Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-2xl bg-black/30 flex-shrink-0 animate-bounce">
            <IconComp className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[0.65rem] font-black uppercase px-2.5 py-0.5 rounded-md ${badgeStyle}`}>
                {isLevel4 ? 'CRITICAL LEVEL 4 EMERGENCY' : (isLevel3 ? 'RED WARNING - TAKE ACTION' : (maxLevel === 2 ? 'ORANGE WATCH - BE PREPARED' : 'YELLOW ADVISORY'))}
              </span>
              <span className="text-xs font-semibold opacity-85 text-slate-200">
                {alerts.length} Active {alerts.length === 1 ? 'Warning' : 'Warnings'} for {primaryAlert.affected_districts ? primaryAlert.affected_districts.join(', ') : primaryAlert.affected_area}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-white mt-1 leading-snug">
              {primaryAlert.headline || primaryAlert.title}
            </h3>
            <p className="text-xs font-medium text-slate-200 mt-0.5 leading-snug">
              {primaryAlert.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {(isLevel3 || isLevel4) && onSoundAlarm && (
            <button
              onClick={() => onSoundAlarm(primaryAlert)}
              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1 shadow cursor-pointer animate-pulse"
              title="Sound Emergency Siren Alarm"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sound Alarm</span>
            </button>
          )}

          {onOpenEmergencyView && (
            <button
              onClick={onOpenEmergencyView}
              className="px-3 py-1.5 rounded-xl bg-black/30 hover:bg-black/50 text-white font-bold text-xs flex items-center gap-1 cursor-pointer border border-white/10"
            >
              Emergency Network
            </button>
          )}

          {alerts.length > 1 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs font-bold px-2.5 py-1.5 rounded-xl bg-black/20 hover:bg-black/30 text-white flex items-center gap-1 flex-shrink-0 cursor-pointer"
            >
              <span>{isExpanded ? 'Hide' : `+${alerts.length - 1} More`}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Recommended Action Directive */}
      <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-xs text-white">
        <span className="font-bold text-amber-300">Mandatory Protective Action: </span>
        <span>
          {primaryAlert.action_instructions 
            ? primaryAlert.action_instructions.join('; ')
            : primaryAlert.recommended_action}
        </span>
        <div className="text-[0.62rem] opacity-75 mt-1.5 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-1">
          <span>Source: {primaryAlert.issuing_authority || primaryAlert.source}</span>
          <span>Valid until: {new Date(primaryAlert.valid_until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span>
        </div>
      </div>

      {/* Expanded Multi-Alerts List */}
      {isExpanded && alerts.length > 1 && (
        <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
          {alerts.slice(1).map((alert, idx) => (
            <div key={alert.alert_id || idx} className="p-3 rounded-2xl bg-black/30 border border-white/10 text-xs text-slate-200 flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-white">{alert.headline || alert.title}</span>
                <span className="text-[0.62rem] font-bold px-2 py-0.5 rounded bg-red-600/30 text-red-300">
                  {alert.severity_label || alert.severity}
                </span>
              </div>
              <div>{alert.description}</div>
              <div className="text-amber-200 font-medium">
                Directive: {alert.action_instructions ? alert.action_instructions.join('; ') : alert.recommended_action}
              </div>
              <div className="text-[0.62rem] opacity-70">Source: {alert.issuing_authority || alert.source}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
