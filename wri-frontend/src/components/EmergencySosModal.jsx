import React, { useState } from 'react';
import { 
  PhoneCall, ShieldAlert, Share2, MapPin, Copy, 
  Check, X, AlertTriangle, ExternalLink, Battery, Clock
} from 'lucide-react';

/**
 * Emergency SOS Modal
 * Instant life-safety emergency action modal.
 * Generates pre-formatted GPS coordinates dispatch message for WhatsApp/SMS,
 * provides 1-tap toll-free calling to 112, 1070, and 1077, and directs to nearest shelters.
 */
export default function EmergencySosModal({ 
  isOpen = false, 
  onClose = () => {}, 
  district = 'Rayagada', 
  locality = null,
  coords = { latitude: 19.08, longitude: 83.81 },
  onFindShelters = () => {}
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const lat = coords?.latitude ?? 19.08;
  const lon = coords?.longitude ?? 83.81;
  const locText = locality ? `${locality}, ${district}` : `${district} District`;
  const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  // Emergency dispatch text
  const emergencyMessage = `🚨 EMERGENCY DISASTER ASSISTANCE REQUEST
Location: ${locText}, Odisha
Coordinates: ${lat}, ${lon}
Maps Link: https://maps.google.com/?q=${lat},${lon}
Time: ${timeStr} IST
Please send immediate rescue / disaster assistance.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(emergencyMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleWhatsAppShare = () => {
    const encoded = encodeURIComponent(emergencyMessage);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleSmsShare = () => {
    const encoded = encodeURIComponent(emergencyMessage);
    window.open(`sms:?body=${encoded}`, '_self');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="sos-modal-title"
        className="w-full max-w-lg rounded-3xl bg-slate-900 border-2 border-red-500/80 p-6 sm:p-8 shadow-2xl shadow-red-950/60 relative overflow-hidden"
      >
        {/* Top Accent Strip */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 animate-pulse" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
          aria-label="Close Emergency SOS Dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3.5 rounded-2xl bg-red-600 text-white shadow-lg shadow-red-600/40 animate-bounce duration-[2000ms]">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h2 id="sos-modal-title" className="text-2xl font-black text-white tracking-tight">
              Emergency SOS Beacon
            </h2>
            <p className="text-xs text-red-400 font-bold uppercase tracking-wider">
              Immediate Life-Safety Dispatch
            </p>
          </div>
        </div>

        {/* Location Broadcast Box */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 mb-5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 text-white">
              <MapPin className="w-4 h-4 text-red-400" />
              {locText}
            </span>
            <span className="font-mono text-slate-400">{lat}°N, {lon}°E</span>
          </div>

          <p className="text-xs text-slate-300 font-mono bg-slate-900/90 p-3 rounded-xl border border-slate-800 break-words select-all">
            {emergencyMessage}
          </p>

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleCopy}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy SOS Text'}</span>
            </button>

            <button
              onClick={handleWhatsAppShare}
              className="flex-1 py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Send via WhatsApp</span>
            </button>

            <button
              onClick={handleSmsShare}
              className="sm:flex hidden py-2 px-3 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <span>SMS</span>
            </button>
          </div>
        </div>

        {/* Instant Dialing Grid */}
        <div className="mb-5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
            Toll-Free Emergency Hotlines (Tap to Call)
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* 112 All-in-One */}
            <a
              href="tel:112"
              className="p-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white flex flex-col items-center justify-center text-center transition-all shadow-md active:scale-95 group"
            >
              <PhoneCall className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xl font-black">112</span>
              <span className="text-[0.65rem] opacity-90">All Emergencies</span>
            </a>

            {/* 1070 State Disaster */}
            <a
              href="tel:1070"
              className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 flex flex-col items-center justify-center text-center transition-all shadow-md active:scale-95 group"
            >
              <PhoneCall className="w-5 h-5 mb-1 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="text-xl font-black text-amber-300">1070</span>
              <span className="text-[0.65rem] text-slate-300">OSDMA State Desk</span>
            </a>

            {/* 1077 District DEOC */}
            <a
              href="tel:1077"
              className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 flex flex-col items-center justify-center text-center transition-all shadow-md active:scale-95 group"
            >
              <PhoneCall className="w-5 h-5 mb-1 text-blue-400 group-hover:scale-110 transition-transform" />
              <span className="text-xl font-black text-blue-300">1077</span>
              <span className="text-[0.65rem] text-slate-300">District Collectorate</span>
            </a>
          </div>
        </div>

        {/* Shelter Shortcut */}
        <button
          onClick={() => {
            onClose();
            onFindShelters();
          }}
          className="w-full py-3 px-4 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <ExternalLink className="w-4 h-4 text-blue-400" />
          <span>Locate Nearest Verified Cyclone & Flood Shelter</span>
        </button>

      </div>
    </div>
  );
}

