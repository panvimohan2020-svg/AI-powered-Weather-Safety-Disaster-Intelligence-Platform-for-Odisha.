import React, { useState } from 'react';
import { 
  CloudRain, ShieldAlert, MapPin, Navigation, Loader2, 
  Menu, X, Sparkles, Globe, Bell, PhoneCall, Home, 
  Calendar, Layers, Radio, Waves, Building2, Eye, Shield
} from 'lucide-react';

/**
 * Modern Clean Navigation Bar & Mobile Drawer
 * Provides responsive navigation, district selector with GPS scan,
 * quick emergency SOS beacon access, and smooth bottom bar on mobile.
 */
export default function TopNavigation({
  districts = [],
  selectedDistrict = 'Rayagada',
  locality = null,
  onSelectDistrict = () => {},
  onGpsClick = () => {},
  isGpsLoading = false,
  activeTab = 'home', // 'home' | 'weather' | 'planner' | 'alerts' | 'floods' | 'shelters' | 'map'
  onTabChange = () => {},
  alertCount = 0,
  onOpenSos = () => {},
  animationsEnabled = true,
  onToggleAnimations = () => {},
  currentLang = 'en',
  onLangChange = () => {}
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'weather', label: 'Weather & Hourly', icon: CloudRain },
    { id: 'planner', label: 'Work Safety', icon: Calendar },
    { id: 'alerts', label: 'Disaster Alerts', icon: ShieldAlert, badge: alertCount },
    { id: 'floods', label: 'Flood & Dams', icon: Waves },
    { id: 'shelters', label: 'Shelters', icon: Building2 },
    { id: 'map', label: 'District Map', icon: Layers }
  ];

  return (
    <>
      {/* Main Top Header */}
      <header className="sticky top-0 z-40 w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-3">
          
          {/* Left: Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onTabChange('home')}
              className="flex items-center gap-2.5 group cursor-pointer focus:outline-none"
            >
              <img 
                src="/logo-mark.svg" 
                alt="Odisha WRI Emblem" 
                className="w-10 h-10 rounded-xl shadow-lg shadow-emerald-500/10 group-hover:scale-105 transition-transform object-contain"
              />
              <div className="text-left">
                <div className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                  <span>ODISHA</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">WRI</span>
                </div>
                <div className="text-[0.62rem] font-medium text-slate-400 truncate max-w-[150px] sm:max-w-none">
                  Workability Risk Index • 30 Districts
                </div>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center gap-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer relative ${
                  activeTab === item.id
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <item.icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {item.badge > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[0.6rem] font-black bg-red-600 text-white animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Right Action Bar (District Selector + SOS Button) */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* District Selector & GPS Button */}
            <div className="flex items-center rounded-xl bg-slate-800/80 border border-slate-700/80 p-1">
              <select
                value={selectedDistrict}
                onChange={(e) => onSelectDistrict(e.target.value)}
                className="bg-transparent text-white text-xs sm:text-sm font-bold py-1.5 pl-2 pr-6 appearance-none cursor-pointer focus:outline-none"
                aria-label="Select Odisha District"
              >
                {districts.map(d => (
                  <option key={d.name} value={d.name} className="bg-slate-900 text-white font-medium">
                    {d.name}
                  </option>
                ))}
              </select>

              <button
                onClick={onGpsClick}
                disabled={isGpsLoading}
                className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all active:scale-95 cursor-pointer shadow-sm disabled:opacity-50"
                title="Detect live location via GPS"
                aria-label="Detect live location via GPS"
              >
                {isGpsLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <MapPin className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* Detected Locality / Town Badge (e.g., Gunupur) */}
            {locality && locality !== selectedDistrict && (
              <div 
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-950/70 border border-blue-500/40 text-blue-300 text-xs font-bold animate-fade-in"
                title={`Exact sub-division / locality: ${locality} (${selectedDistrict} District)`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                <span>{locality}</span>
              </div>
            )}

            {/* Animation Toggle Pill (Desktop) */}
            <button
              onClick={onToggleAnimations}
              className={`hidden md:flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                animationsEnabled 
                  ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' 
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
              title={animationsEnabled ? 'Atmospheric animations active (Click to disable)' : 'Animations paused'}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{animationsEnabled ? 'FX: ON' : 'FX: OFF'}</span>
            </button>

            {/* Red Emergency SOS Button */}
            <button
              onClick={onOpenSos}
              className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-red-600/30 transition-all cursor-pointer"
              title="Open Emergency SOS Beacon"
            >
              <ShieldAlert className="w-4 h-4 animate-pulse" />
              <span className="hidden sm:inline">EMERGENCY SOS</span>
              <span className="sm:hidden">SOS</span>
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

          </div>

        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 flex flex-col gap-1.5 animate-fade-in">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`p-3 rounded-xl text-sm font-bold flex items-center justify-between transition-all cursor-pointer ${
                  activeTab === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-black bg-red-600 text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}

            <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <button
                onClick={onToggleAnimations}
                className="flex items-center gap-1 text-slate-300 py-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Weather Animations: <strong>{animationsEnabled ? 'Enabled' : 'Disabled'}</strong></span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Bottom Navigation Bar (Thumb Friendly) */}
      <nav 
        aria-label="Mobile Navigation" 
        className="xl:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 py-2 px-3 flex items-center justify-around shadow-2xl"
      >
        <button
          onClick={() => onTabChange('home')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'home' ? 'text-blue-400' : 'text-slate-400'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[0.65rem] font-bold">Home</span>
        </button>

        <button
          onClick={() => onTabChange('weather')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'weather' ? 'text-blue-400' : 'text-slate-400'
          }`}
        >
          <CloudRain className="w-5 h-5" />
          <span className="text-[0.65rem] font-bold">Weather</span>
        </button>

        <button
          onClick={() => onTabChange('planner')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'planner' ? 'text-blue-400' : 'text-slate-400'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[0.65rem] font-bold">Planner</span>
        </button>

        <button
          onClick={() => onTabChange('alerts')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all cursor-pointer relative ${
            activeTab === 'alerts' ? 'text-red-400' : 'text-slate-400'
          }`}
        >
          <ShieldAlert className="w-5 h-5" />
          <span className="text-[0.65rem] font-bold">Alerts</span>
          {alertCount > 0 && (
            <span className="absolute top-0 right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => onOpenSos()}
          className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-red-500 cursor-pointer active:scale-95"
        >
          <PhoneCall className="w-5 h-5 animate-bounce" />
          <span className="text-[0.65rem] font-black uppercase">SOS</span>
        </button>
      </nav>
    </>
  );
}

