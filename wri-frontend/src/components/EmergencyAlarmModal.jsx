import React, { useState, useEffect, useRef } from 'react';
import { 
  AlertTriangle, ShieldAlert, Volume2, VolumeX, Phone, 
  MapPin, CheckCircle2, X, ExternalLink, Radio, Navigation, BellRing
} from 'lucide-react';

export default function EmergencyAlarmModal({ 
  alert, 
  onAcknowledge, 
  onOpenShelters, 
  onOpenContacts,
  soundEnabled = true,
  vibrationEnabled = true 
}) {
  const [isMuted, setIsMuted] = useState(!soundEnabled);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioCtxRef = useRef(null);
  const oscillatorRef = useRef(null);
  const gainNodeRef = useRef(null);
  const intervalRef = useRef(null);

  // Initialize and play Web Audio API siren
  const startSiren = () => {
    try {
      if (isMuted) return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }

      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Dual-tone emergency siren modulation (800 Hz to 960 Hz alternating)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, ctx.currentTime);

      gain.gain.setValueAtTime(0.35, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      oscillatorRef.current = osc;
      gainNodeRef.current = gain;
      setIsPlaying(true);

      // Modulate frequency to create recognizable emergency siren warble
      let highTone = false;
      intervalRef.current = setInterval(() => {
        if (oscillatorRef.current && ctx.state === 'running') {
          highTone = !highTone;
          const targetFreq = highTone ? 960 : 720;
          oscillatorRef.current.frequency.exponentialRampToValueAtTime(targetFreq, ctx.currentTime + 0.3);
        }
      }, 400);

      // Haptic vibration where supported on mobile
      if (vibrationEnabled && navigator.vibrate) {
        navigator.vibrate([600, 300, 600, 300, 600]);
      }
    } catch (e) {
      console.warn('AudioContext playback prevented by browser auto-play policy:', e);
    }
  };

  const stopSiren = () => {
    try {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
        oscillatorRef.current = null;
      }
      setIsPlaying(false);
    } catch (e) {}
  };

  useEffect(() => {
    // Only attempt siren playback for high severity Level 3 (Warning) and Level 4 (Emergency)
    if (alert && alert.severity_level >= 3 && !isMuted) {
      startSiren();
    }
    return () => {
      stopSiren();
    };
  }, [alert, isMuted]);

  const toggleSound = () => {
    if (isPlaying) {
      stopSiren();
      setIsMuted(true);
    } else {
      setIsMuted(false);
      startSiren();
    }
  };

  const handleAcknowledgeAlert = () => {
    stopSiren();
    if (onAcknowledge) onAcknowledge(alert.alert_id);
  };

  if (!alert) return null;

  const isLevel4 = alert.severity_level === 4;
  const severityBadgeColor = isLevel4 ? 'bg-red-600 text-white animate-pulse' : 'bg-red-500 text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl bg-slate-950 border-2 border-red-600 rounded-3xl shadow-[0_0_50px_rgba(239,68,68,0.5)] overflow-hidden flex flex-col text-slate-100">
        
        {/* Red Flashing Emergency Header */}
        <div className={`p-4 sm:p-5 ${isLevel4 ? 'bg-red-600 animate-pulse-slow' : 'bg-red-700'} text-white flex items-center justify-between gap-3`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-black/25 flex-shrink-0 animate-bounce">
              <ShieldAlert className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[0.7rem] font-black uppercase px-2.5 py-0.5 rounded-md ${severityBadgeColor}`}>
                  {alert.severity_label ? alert.severity_label.toUpperCase() : 'LEVEL 4 CRITICAL EMERGENCY'}
                </span>
                {alert.is_simulation && (
                  <span className="text-[0.65rem] font-black uppercase px-2 py-0.5 rounded-md bg-amber-400 text-black">
                    TEST SIMULATION
                  </span>
                )}
                <span className="text-xs font-bold tracking-wider opacity-90">
                  {alert.category ? alert.category.replace('_', ' ') : 'NATURAL DISASTER'}
                </span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black mt-1 leading-tight tracking-tight">
                {alert.headline || 'URGENT DISASTER WARNING'}
              </h2>
            </div>
          </div>

          {/* Sound Mute/Unmute Toggle */}
          <button
            onClick={toggleSound}
            className="p-3 rounded-2xl bg-black/30 hover:bg-black/50 text-white transition-all flex items-center gap-1.5 text-xs font-bold flex-shrink-0 cursor-pointer"
            title={isPlaying ? "Mute Emergency Siren" : "Play Siren Sound"}
          >
            {isPlaying ? (
              <>
                <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span className="hidden sm:inline">Mute Siren</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-slate-300" />
                <span className="hidden sm:inline">Unmute</span>
              </>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-7 flex flex-col gap-5 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
          
          {/* Affected District & Time Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs p-3.5 rounded-2xl bg-red-950/20 border border-red-900/40">
            <div>
              <div className="text-[0.65rem] font-bold uppercase text-red-300">Affected Area</div>
              <div className="font-extrabold text-sm text-white mt-0.5">
                {alert.affected_districts ? alert.affected_districts.join(', ') : 'Odisha'}
              </div>
            </div>
            <div>
              <div className="text-[0.65rem] font-bold uppercase text-red-300">Issuing Authority</div>
              <div className="font-extrabold text-sm text-white mt-0.5">
                {alert.issuing_authority || 'IMD / OSDMA'}
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
                  Follow instructions from local police, ODRAF, and district emergency authorities immediately.
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

          {/* Device Limitation Notice */}
          <div className="text-[0.65rem] text-slate-400 border-t border-slate-800/80 pt-3 italic">
            ⚠️ <strong>Technical Notice:</strong> Web browser audio alarms cannot override device silent mode, hardware mute switches, or operating-system background sleep. Keep a battery-operated transistor radio tuned to All India Radio (AIR) for continuous official bulletins.
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="p-4 sm:p-5 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                stopSiren();
                if (onOpenShelters) onOpenShelters();
              }}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Find Nearest Shelter</span>
            </button>

            <button
              onClick={() => {
                stopSiren();
                if (onOpenContacts) onOpenContacts();
              }}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Emergency Numbers</span>
            </button>
          </div>

          <button
            onClick={handleAcknowledgeAlert}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-900/30"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>ACKNOWLEDGE ALERT & STOP SIREN</span>
          </button>
        </div>

      </div>
    </div>
  );
}
