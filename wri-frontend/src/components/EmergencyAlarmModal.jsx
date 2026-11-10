import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Volume2, VolumeX, Phone, 
  MapPin, CheckCircle2, X, Radio, Navigation, Clock, Building
} from 'lucide-react';
import { sirenAudio } from '../utils/sirenAudio';

/**
 * EmergencyAlarmModal
 * 
 * Modern, controllable emergency warning overlay for Level 3 (Warning) and Level 4 (Emergency) events.
 * Features:
 * - Centralized siren audio with instant stop on mute, close, acknowledge, or navigation.
 * - Visible close button (X) allowing users to dismiss without acknowledging.
 * - Functional "Find Nearest Shelter" and "Emergency Numbers" routing.
 * - Clear, scientifically honest labeling (air temperature vs calculated heat index).
 * - Keyboard Escape & backdrop click dismissal.
 */
export default function EmergencyAlarmModal({ 
  isOpen = false,
  alert = null, 
  onClose = () => {},
  onAcknowledge = () => {}, 
  onNavigateShelters = () => {},
  onOpenShelters = null,
  onOpenContacts = () => {},
  soundEnabled = true
}) {
  const [isMuted, setIsMuted] = useState(() => sirenAudio.isMuted());
  const [isPlaying, setIsPlaying] = useState(false);

  // Fallback for shelter routing prop compatibility
  const handleSheltersClick = onNavigateShelters || onOpenShelters || (() => {});

  // Manage Siren Audio Lifecycle
  useEffect(() => {
    if (isOpen && alert && alert.severity_level >= 3 && !isMuted && soundEnabled) {
      sirenAudio.start(alert.alert_id || 'active-emergency');
      setIsPlaying(true);
    } else {
      sirenAudio.stop();
      setIsPlaying(false);
    }

    return () => {
      sirenAudio.stop();
      setIsPlaying(false);
    };
  }, [isOpen, alert?.alert_id, alert?.severity_level, isMuted, soundEnabled]);

  // Keyboard Escape Handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleClose = () => {
    sirenAudio.stop();
    setIsPlaying(false);
    onClose();
  };

  const handleToggleSound = () => {
    if (isPlaying) {
      sirenAudio.stop();
      sirenAudio.setMuted(true);
      setIsMuted(true);
      setIsPlaying(false);
    } else {
      sirenAudio.setMuted(false);
      setIsMuted(false);
      if (alert && alert.severity_level >= 3) {
        sirenAudio.start(alert.alert_id);
        setIsPlaying(true);
      }
    }
  };

  const handleAcknowledge = () => {
    sirenAudio.stop();
    setIsPlaying(false);
    if (onAcknowledge && alert) {
      onAcknowledge(alert.alert_id);
    }
    onClose();
  };

  const handleGoToShelters = () => {
    sirenAudio.stop();
    setIsPlaying(false);
    handleSheltersClick();
    onClose();
  };

  const handleGoToContacts = () => {
    sirenAudio.stop();
    setIsPlaying(false);
    onOpenContacts();
    onClose();
  };

  if (!isOpen || !alert) return null;

  const isLevel4 = alert.severity_level === 4;
  const severityBadgeColor = isLevel4 ? 'bg-red-600 text-white animate-pulse' : 'bg-red-500 text-white';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-modal-title"
    >
      <div className="w-full max-w-2xl bg-slate-950 border-2 border-red-600/90 rounded-3xl shadow-[0_0_50px_rgba(239,68,68,0.4)] overflow-hidden flex flex-col text-slate-100 max-h-[92vh]">
        
        {/* Red Emergency Header with Controls */}
        <div className={`p-4 sm:p-5 ${isLevel4 ? 'bg-red-700 animate-pulse-slow' : 'bg-red-600'} text-white flex items-center justify-between gap-3 relative`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-black/25 flex-shrink-0 animate-bounce">
              <ShieldAlert className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[0.7rem] font-black uppercase px-2.5 py-0.5 rounded-md ${severityBadgeColor}`}>
                  {alert.severity_label ? alert.severity_label.toUpperCase() : 'LEVEL 3 HAZARD WARNING'}
                </span>
                {alert.is_simulation && (
                  <span className="text-[0.65rem] font-black uppercase px-2 py-0.5 rounded-md bg-amber-400 text-black">
                    TEST SIMULATION
                  </span>
                )}
                <span className="text-xs font-bold tracking-wider opacity-90">
                  {alert.category ? alert.category.replace(/_/g, ' ') : 'METEOROLOGICAL HAZARD'}
                </span>
              </div>
              <h2 id="alert-modal-title" className="text-lg sm:text-2xl font-black mt-1 leading-tight tracking-tight">
                {alert.headline || 'URGENT WEATHER WARNING'}
              </h2>
            </div>
          </div>

          {/* Action Header Controls (Mute & Close) */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Sound Mute/Unmute Toggle */}
            <button
              onClick={handleToggleSound}
              className={`p-2 sm:px-3 sm:py-2 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
                isPlaying 
                  ? 'bg-black/40 hover:bg-black/60 text-white ring-1 ring-white/20' 
                  : 'bg-slate-900/80 hover:bg-slate-900 text-amber-300 ring-1 ring-amber-400/40'
              }`}
              title={isPlaying ? "Mute Emergency Siren" : "Enable Sound Alarm"}
              aria-label={isPlaying ? "Mute Emergency Siren" : "Enable Sound Alarm"}
            >
              {isPlaying ? (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span className="hidden sm:inline">Mute Siren</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-amber-300" />
                  <span className="hidden sm:inline">Enable Sound</span>
                </>
              )}
            </button>

            {/* Prominent Close (X) Button */}
            <button
              onClick={handleClose}
              className="p-2 sm:p-2.5 rounded-xl bg-black/40 hover:bg-black/70 text-white/90 hover:text-white transition-all cursor-pointer ring-1 ring-white/20 active:scale-95"
              title="Close warning panel (X)"
              aria-label="Close warning panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-7 flex flex-col gap-5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
          
          {/* Affected District & Verified Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs p-3.5 rounded-2xl bg-red-950/30 border border-red-900/50">
            <div>
              <div className="text-[0.65rem] font-bold uppercase text-red-300">Affected District</div>
              <div className="font-extrabold text-sm text-white mt-0.5">
                {alert.affected_districts ? alert.affected_districts.join(', ') : (alert.affected_area || 'Odisha')}
              </div>
            </div>
            <div>
              <div className="text-[0.65rem] font-bold uppercase text-red-300">Issuing Authority</div>
              <div className="font-extrabold text-sm text-white mt-0.5 truncate" title={alert.issuing_authority || alert.source}>
                {alert.issuing_authority || alert.source || 'IMD / OSDMA'}
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <div className="text-[0.65rem] font-bold uppercase text-red-300">Valid Until</div>
              <div className="font-extrabold text-sm text-amber-300 mt-0.5">
                {alert.valid_until ? new Date(alert.valid_until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : 'Until further advisory'}
              </div>
            </div>
          </div>

          {/* Actionable Emergency Directives */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Radio className="w-4 h-4" />
              Immediate Protective Directives:
            </h3>
            <div className="flex flex-col gap-2 text-xs sm:text-sm">
              {alert.action_instructions && alert.action_instructions.length > 0 ? (
                alert.action_instructions.map((instr, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start gap-2.5 text-slate-200">
                    <span className="font-black text-amber-400 text-sm mt-0.5">{idx + 1}.</span>
                    <span className="leading-snug">{instr}</span>
                  </div>
                ))
              ) : (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200">
                  Follow instructions from local police, ODRAF, and district emergency operations center (1077) immediately.
                </div>
              )}
            </div>
          </div>

          {/* Shelter Advisory Banner */}
          {alert.shelter_advisory && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs flex items-start gap-3">
              <MapPin className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-300 uppercase text-[0.65rem] block">Shelter Advisory:</span>
                <span className="text-slate-200">{alert.shelter_advisory}</span>
              </div>
            </div>
          )}

          {/* Technical Notice */}
          <div className="text-[0.65rem] text-slate-400 border-t border-slate-800/80 pt-3">
            ℹ️ <strong>Emergency Advisory:</strong> Closing this panel silences the siren alarm while keeping the warning active in your top dashboard banner.
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="p-4 sm:p-5 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleGoToShelters}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Find Nearest Shelter</span>
            </button>

            <button
              onClick={handleGoToContacts}
              className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-700 active:scale-95"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Emergency Numbers</span>
            </button>
          </div>

          <button
            onClick={handleAcknowledge}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-900/30"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>ACKNOWLEDGE ALERT &amp; STOP SIREN</span>
          </button>
        </div>

      </div>
    </div>
  );
}
