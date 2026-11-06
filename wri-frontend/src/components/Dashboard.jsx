import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Loader2, CloudRain, ThermometerSun, Wind, 
  Sun, Moon, Cloud, CloudDrizzle, CloudLightning, Compass, 
  Sunrise, Sunset, RefreshCw, AlertTriangle, ShieldCheck, Info,
  Share2, Bell, Check, Sparkles, Layers, Eye, Calendar,
  Droplets, Gauge, Sprout, HardHat, Briefcase, Users, Navigation,
  Siren, ShieldAlert, Radio, Building2, Waves, ExternalLink, ArrowRight,
  Shield, CheckCircle2, ChevronRight
} from 'lucide-react';

import OdishaMap from './OdishaMap';
import WorkPlanner from './WorkPlanner';
import HourlyForecastChart from './HourlyForecastChart';
import AlertsBanner from './AlertsBanner';
import ModelResearchSection from './ModelResearchSection';
import EmergencyAlarmModal from './EmergencyAlarmModal';
import EmergencyNetworkView from './EmergencyNetworkView';

// Newly engineered modern components
import WeatherBackground from './WeatherBackground';
import SimplifiedWeatherHero from './SimplifiedWeatherHero';
import WorkabilityGauge from './WorkabilityGauge';
import WhatShouldYouDoCard from './WhatShouldYouDoCard';
import TopNavigation from './TopNavigation';
import EmergencySosModal from './EmergencySosModal';

const FALLBACK_DISTRICTS = [
  { name: 'Angul', lat: 20.838, lon: 85.101, coast_km: 145 },
  { name: 'Balangir', lat: 20.718, lon: 83.488, coast_km: 315 },
  { name: 'Balasore', lat: 21.493, lon: 86.925, coast_km: 15 },
  { name: 'Bargarh', lat: 21.333, lon: 83.616, coast_km: 345 },
  { name: 'Bhadrak', lat: 21.054, lon: 86.495, coast_km: 30 },
  { name: 'Boudh', lat: 20.835, lon: 84.326, coast_km: 210 },
  { name: 'Cuttack', lat: 20.462, lon: 85.882, coast_km: 70 },
  { name: 'Deogarh', lat: 21.532, lon: 84.733, coast_km: 255 },
  { name: 'Dhenkanal', lat: 20.665, lon: 85.594, coast_km: 110 },
  { name: 'Gajapati', lat: 18.815, lon: 84.156, coast_km: 65 },
  { name: 'Ganjam (Brahmapur)', lat: 19.314, lon: 84.794, coast_km: 10 },
  { name: 'Jagatsinghpur', lat: 20.267, lon: 86.168, coast_km: 35 },
  { name: 'Jajpur', lat: 20.849, lon: 86.332, coast_km: 60 },
  { name: 'Jharsuguda', lat: 21.854, lon: 84.004, coast_km: 330 },
  { name: 'Kalahandi', lat: 19.907, lon: 83.164, coast_km: 250 },
  { name: 'Kandhamal', lat: 20.472, lon: 84.234, coast_km: 170 },
  { name: 'Kendrapara', lat: 20.498, lon: 86.422, coast_km: 25 },
  { name: 'Kendujhar (Keonjhar)', lat: 21.628, lon: 85.582, coast_km: 160 },
  { name: 'Khurda (Bhubaneswar)', lat: 20.296, lon: 85.824, coast_km: 50 },
  { name: 'Koraput', lat: 18.813, lon: 82.711, coast_km: 150 },
  { name: 'Malkangiri', lat: 18.343, lon: 81.882, coast_km: 220 },
  { name: 'Mayurbhanj (Baripada)', lat: 21.933, lon: 86.732, coast_km: 85 },
  { name: 'Nabarangpur', lat: 19.229, lon: 82.548, coast_km: 180 },
  { name: 'Nayagarh', lat: 20.131, lon: 85.104, coast_km: 80 },
  { name: 'Nuapada', lat: 20.833, lon: 82.528, coast_km: 350 },
  { name: 'Puri', lat: 19.813, lon: 85.831, coast_km: 0 },
  { name: 'Rayagada', lat: 19.167, lon: 83.416, coast_km: 130 },
  { name: 'Sambalpur', lat: 21.466, lon: 83.981, coast_km: 300 },
  { name: 'Subarnapur (Sonepur)', lat: 20.840, lon: 83.916, coast_km: 270 },
  { name: 'Sundargarh', lat: 22.119, lon: 84.031, coast_km: 350 }
];

// Base64URL to Uint8Array converter for VAPID subscription
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function Dashboard() {
  const [districts, setDistricts] = useState(FALLBACK_DISTRICTS);
  const [selectedDistrict, setSelectedDistrict] = useState('Rayagada');
  const [wriData, setWriData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  
  // Navigation & View Mode
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'weather' | 'planner' | 'alerts' | 'floods' | 'shelters' | 'map' | 'research'
  const [selectedLang, setSelectedLang] = useState('en');
  
  // Atmospheric animations toggle (persisted)
  const [animationsEnabled, setAnimationsEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('odisha_wri_animations');
      return saved !== 'false';
    }
    return true;
  });

  // Emergency modals & state
  const [showSosModal, setShowSosModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [activeEmergencyAlert, setActiveEmergencyAlert] = useState(null);
  const [acknowledgedAlertIds, setAcknowledgedAlertIds] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('odisha_wri_ack_alerts');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return [];
  });

  // Push Notifications state
  const [pushStatus, setPushStatus] = useState('checking'); // 'supported' | 'subscribed' | 'unsupported' | 'denied'
  const [lastUpdatedTime, setLastUpdatedTime] = useState('Just now');

  // Backend API Base Resolver (Supports Vercel production environment variable)
  const API_BASE = import.meta.env.VITE_API_BASE_URL || (
    (typeof window !== 'undefined' && (window.location.port === '5173' || window.location.port === '3000')) 
      ? 'http://127.0.0.1:8000' 
      : ''
  );

  // Initial Data Load
  useEffect(() => {
    fetch(`${API_BASE}/api/districts`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.districts && data.districts.length > 0) {
          setDistricts(data.districts);
        }
      })
      .catch(() => {});
    
    // Check Web Push support & registration
    checkPushSupport();

    // Load initial district weather
    fetchData({ district: selectedDistrict });
  }, []);

  const checkPushSupport = async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushStatus('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setPushStatus('denied');
      return;
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          setPushStatus('subscribed');
          return;
        }
      }
      setPushStatus('supported');
    } catch (e) {
      setPushStatus('supported');
    }
  };

  const handleToggleAnimations = () => {
    const nextVal = !animationsEnabled;
    setAnimationsEnabled(nextVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('odisha_wri_animations', String(nextVal));
    }
  };

  const fetchData = async (payload) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch(`${API_BASE}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Server error (${response.status})`);
      }

      const data = await response.json();
      setWriData(data);
      if (data.district) {
        setSelectedDistrict(data.district);
      }
      setLastUpdatedTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' IST');

      // Check for qualifying Level 3 or Level 4 emergency alerts
      const alertsList = data.official_alerts || [];
      const criticalAlert = alertsList.find(a => (a.severity_level >= 3 || a.severity === 'RED') && !acknowledgedAlertIds.includes(a.alert_id));

      if (criticalAlert) {
        setActiveEmergencyAlert(criticalAlert);
        setShowEmergencyModal(true);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch meteorological safety prediction.');
    } finally {
      setIsLoading(false);
      setIsGpsLoading(false);
    }
  };

  const handleDistrictChange = (distName) => {
    setSelectedDistrict(distName);
    fetchData({ district: distName });
  };

  const handleGpsClick = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }
    setIsGpsLoading(true);
    setErrorMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        let nearestDist = null;
        let minDist = Infinity;
        if (districts && districts.length > 0) {
          for (const d of districts) {
            const dist = Math.hypot((d.lat - lat) * 111, (d.lon - lon) * 111 * Math.cos(lat * Math.PI / 180));
            if (dist < minDist) {
              minDist = dist;
              nearestDist = d.name;
            }
          }
        }
        fetchData({ 
          latitude: lat, 
          longitude: lon, 
          district: nearestDist || selectedDistrict || 'Khurda (Bhubaneswar)'
        });
      },
      (err) => {
        setIsGpsLoading(false);
        setErrorMsg('Location permission denied or timed out. Please choose a district from the dropdown.');
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  const handleAcknowledgeAlert = (alertId) => {
    const updated = [...acknowledgedAlertIds, alertId];
    setAcknowledgedAlertIds(updated);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('odisha_wri_ack_alerts', JSON.stringify(updated));
    }
    setShowEmergencyModal(false);
  };

  // Background Web Push Activation Handler
  const handleEnableBackgroundAlerts = async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Web Push is not supported in this browser.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushStatus('denied');
        alert('Notification permission was denied. You can enable it in your browser settings.');
        return;
      }

      // 1. Fetch VAPID Public Key from Backend
      const vapidRes = await fetch(`${API_BASE}/api/emergency/push-vapid-key`);
      if (!vapidRes.ok) throw new Error('Failed to retrieve VAPID public key');
      const vapidData = await vapidRes.json();
      const applicationServerKey = urlBase64ToUint8Array(vapidData.public_key);

      // 2. Register / Get Service Worker
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await navigator.serviceWorker.register('/sw.js');
      }

      // 3. Subscribe with PushManager
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      // 4. Send subscription to Backend
      const subJson = subscription.toJSON();
      const saveRes = await fetch(`${API_BASE}/api/emergency/push-subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subJson.keys?.p256dh || '',
            auth: subJson.keys?.auth || ''
          },
          district: selectedDistrict
        })
      });

      if (!saveRes.ok) throw new Error('Failed to store subscription on server');
      
      setPushStatus('subscribed');
      alert(`✅ Background Emergency Warnings Activated!\nYou will receive system push alerts for ${selectedDistrict} even when this page is closed.`);
    } catch (e) {
      console.error('Push subscription failed:', e);
      alert(`Could not complete push setup: ${e.message}`);
    }
  };

  const activeAlerts = wriData?.official_alerts || [];
  const primaryAlert = activeAlerts[0] || null;

  return (
    <div className="min-h-screen text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white pb-20 xl:pb-8">
      
      {/* 1. Dynamic Atmospheric Weather Background (Part 3) */}
      <WeatherBackground
        weatherCode={wriData?.weather?.weather_code ?? 0}
        isDaytime={wriData?.weather?.is_daytime ?? true}
        temperature={wriData?.weather?.temperature_c ?? 30}
        sunriseIso={wriData?.daily?.sunrise?.[0] ?? null}
        sunsetIso={wriData?.daily?.sunset?.[0] ?? null}
        animationsEnabled={animationsEnabled}
      />

      {/* 2. Top Navigation Bar (Part 2.A & Part 7) */}
      <TopNavigation
        districts={districts}
        selectedDistrict={selectedDistrict}
        onSelectDistrict={handleDistrictChange}
        onGpsClick={handleGpsClick}
        isGpsLoading={isGpsLoading}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        alertCount={activeAlerts.length}
        onOpenSos={() => setShowSosModal(true)}
        animationsEnabled={animationsEnabled}
        onToggleAnimations={handleToggleAnimations}
        currentLang={selectedLang}
        onLangChange={setSelectedLang}
      />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-4 sm:pt-6 flex-1 flex flex-col gap-6">
        
        {/* 3. Disaster Warnings Banner (Prominent on top - Part 4) */}
        {activeAlerts.length > 0 && (
          <AlertsBanner
            alerts={activeAlerts}
            onOpenEmergencyView={() => setActiveTab('alerts')}
            onSoundAlarm={() => {
              setActiveEmergencyAlert(primaryAlert);
              setShowEmergencyModal(true);
            }}
          />
        )}

        {/* 4. Sub-division Locality Notification (e.g. Gunupur in Rayagada) */}
        {wriData?.locality && wriData.locality !== wriData.district && !wriData.is_outside_odisha && (
          <div className="p-3.5 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-md backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span>
                Live GPS Locality: <strong>{wriData.locality}</strong> (Administered under <strong>{wriData.district} District</strong>).
              </span>
            </div>
            <span className="hidden sm:inline-block text-[0.68rem] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-200 border border-blue-500/30">
              Sub-division Verified
            </span>
          </div>
        )}

        {/* Outside Odisha Notification */}
        {wriData?.is_outside_odisha && (
          <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-semibold flex items-center gap-2.5 shadow-md backdrop-blur-md">
            <Navigation className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              Detected GPS position is outside Odisha boundary (~{wriData.distance_to_odisha_km} km away). Displaying nearest Odisha district (<strong>{wriData.district}</strong>) for reference.
            </span>
          </div>
        )}

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-300 text-sm font-semibold flex items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => fetchData({ district: selectedDistrict })}
              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 1: HOME TAB (Simplified Modern Dashboard - Part 2)        */}
        {/* ============================================================== */}
        {activeTab === 'home' && (
          <main className="flex flex-col gap-6">
            
            {/* Loading Indicator */}
            {isLoading && !wriData ? (
              <div className="rounded-3xl border border-slate-700/60 bg-slate-900/80 backdrop-blur-md p-12 flex flex-col items-center justify-center gap-4 text-center min-h-[360px]">
                <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
                <h3 className="text-xl font-bold text-white">Analyzing Meteorological Telemetry...</h3>
                <p className="text-sm text-slate-400 max-w-md">Fetching Open-Meteo observations and computing calibrated machine learning precipitation indices.</p>
              </div>
            ) : wriData ? (
              <>
                {/* 2-Column Responsive Hero Grid */}
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left Column (7 cols): Main Weather Section (Part 2.B) */}
                  <div className="lg:col-span-7">
                    <SimplifiedWeatherHero
                      district={wriData.district}
                      locality={wriData.locality}
                      weather={{
                        temperature_c: wriData.weather?.temperature_c,
                        apparent_temperature_c: wriData.weather?.apparent_temperature_c,
                        weather_condition: wriData.weather?.condition,
                        icon: wriData.weather?.icon,
                        humidity_percent: wriData.weather?.humidity_percent,
                        wind_speed_kmh: wriData.weather?.wind_speed_kmh,
                        wind_gusts_kmh: wriData.weather?.wind_gusts_kmh,
                        rain_probability: wriData.prediction?.rain_probability,
                        uv_index: wriData.daily?.uv_index_max?.[1] ?? 5.0
                      }}
                      lastUpdated={lastUpdatedTime}
                      onRefresh={() => fetchData({ district: selectedDistrict })}
                      isLoading={isLoading}
                    />
                  </div>

                  {/* Right Column (5 cols): Workability Score Circular Gauge (Part 2.C) */}
                  <div className="lg:col-span-5">
                    <WorkabilityGauge
                      score={wriData.prediction?.safety_score}
                      riskLevel={wriData.prediction?.predicted_risk_level}
                      district={wriData.district}
                      locality={wriData.locality}
                      summaryAdvice={wriData.prediction?.advice || wriData.prediction?.safety_recommendation}
                      penalties={wriData.prediction?.penalties || {}}
                      contributions={wriData.prediction?.contributions || {}}
                      occupationalGuidelines={wriData.prediction?.occupational_guidelines || wriData.occupational_guidelines}
                      primaryLimitingFactor={wriData.prediction?.primary_limiting_factor || wriData.primary_limiting_factor}
                      weather={{
                        temperature_c: wriData.weather?.temperature_c,
                        humidity_percent: wriData.weather?.humidity_percent,
                        precipitation_today_mm: wriData.weather?.precipitation_forecast_today_mm,
                        wind_speed_kmh: wriData.weather?.wind_speed_kmh,
                        uv_index: wriData.weather?.uv_index ?? 5.0
                      }}
                    />
                  </div>

                </section>

                {/* Practical Daily Directives Card (Part 2.D: "What should you do today?") */}
                <section>
                  <WhatShouldYouDoCard
                    wriData={wriData}
                    hasDisasterAlert={activeAlerts.length > 0}
                    primaryAlert={primaryAlert}
                  />
                </section>

                {/* Quick Feature Navigation Hub (Part 5: 6 Organized, Clean Cards) */}
                <section className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-white tracking-tight">
                      Intelligence & Safety Modules
                    </h3>
                    <span className="text-xs text-slate-400">Select any module to inspect</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    
                    {/* Module 1: Hourly Forecast */}
                    <button
                      onClick={() => setActiveTab('weather')}
                      className="p-5 rounded-3xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/60 backdrop-blur-md flex flex-col justify-between text-left transition-all group shadow-lg cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 group-hover:scale-110 transition-transform">
                          <CloudRain className="w-5 h-5" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                      </div>
                      <h4 className="text-base font-bold text-white mb-1">24-Hour Hourly Timeline</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Continuous hourly curve of temperature, rain probability, and safe working hours.
                      </p>
                    </button>

                    {/* Module 2: Shift Planner */}
                    <button
                      onClick={() => setActiveTab('planner')}
                      className="p-5 rounded-3xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/60 backdrop-blur-md flex flex-col justify-between text-left transition-all group shadow-lg cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 group-hover:scale-110 transition-transform">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
                      </div>
                      <h4 className="text-base font-bold text-white mb-1">Outdoor Shift Planner</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Feasibility analysis for Morning, Midday, Afternoon, and Night shifts with rest intervals.
                      </p>
                    </button>

                    {/* Module 3: Disaster Warnings */}
                    <button
                      onClick={() => setActiveTab('alerts')}
                      className="p-5 rounded-3xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/60 backdrop-blur-md flex flex-col justify-between text-left transition-all group shadow-lg cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-3 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30 group-hover:scale-110 transition-transform">
                          <ShieldAlert className="w-5 h-5" />
                        </div>
                        {activeAlerts.length > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-black bg-red-600 text-white">
                            {activeAlerts.length} Active
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-white mb-1">Disaster Warning Network</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        5-tier CAP bulletins, audible siren drills, and official IMD/OSDMA bulletins.
                      </p>
                    </button>

                    {/* Module 4: Floods & Dams */}
                    <button
                      onClick={() => setActiveTab('floods')}
                      className="p-5 rounded-3xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/60 backdrop-blur-md flex flex-col justify-between text-left transition-all group shadow-lg cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-3 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 group-hover:scale-110 transition-transform">
                          <Waves className="w-5 h-5" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                      </div>
                      <h4 className="text-base font-bold text-white mb-1">River Floods & Dams</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        CWC gauges on Mahanadi, Brahmani, Baitarani, and Hirakud/Rengali dam discharges.
                      </p>
                    </button>

                    {/* Module 5: Verified Shelters */}
                    <button
                      onClick={() => setActiveTab('shelters')}
                      className="p-5 rounded-3xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/60 backdrop-blur-md flex flex-col justify-between text-left transition-all group shadow-lg cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 group-hover:scale-110 transition-transform">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                      </div>
                      <h4 className="text-base font-bold text-white mb-1">Safe Shelter Locator</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Multipurpose cyclone & flood shelters with geodesic distances, capacities, and phone contacts.
                      </p>
                    </button>

                    {/* Module 6: 30-District Risk Map */}
                    <button
                      onClick={() => setActiveTab('map')}
                      className="p-5 rounded-3xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/60 backdrop-blur-md flex flex-col justify-between text-left transition-all group shadow-lg cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 group-hover:scale-110 transition-transform">
                          <Layers className="w-5 h-5" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
                      </div>
                      <h4 className="text-base font-bold text-white mb-1">30-District Risk Map</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Interactive Odisha geographical map visualizer with district risk zones.
                      </p>
                    </button>

                  </div>
                </section>

                {/* Background Emergency Push Banner Card (Part 6) */}
                <section className="rounded-3xl border border-blue-500/30 bg-blue-950/40 backdrop-blur-md p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 rounded-2xl bg-blue-600/30 text-blue-300 border border-blue-500/40">
                      <Bell className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-white">
                        Background Disaster Warnings (Web Push)
                      </h4>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {pushStatus === 'subscribed' 
                          ? `✅ Active on this device. You will receive system notifications for ${selectedDistrict}.` 
                          : 'Get critical Level 3 & Level 4 emergency warnings even when this website is closed.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {pushStatus === 'subscribed' ? (
                      <span className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        Active & Verified
                      </span>
                    ) : (
                      <button
                        onClick={handleEnableBackgroundAlerts}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all active:scale-95"
                      >
                        <Bell className="w-4 h-4" />
                        <span>Enable Background Alerts</span>
                      </button>
                    )}
                  </div>
                </section>
              </>
            ) : null}

          </main>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: WEATHER & HOURLY FORECAST TAB                          */}
        {/* ============================================================== */}
        {activeTab === 'weather' && wriData && (
          <main className="flex flex-col gap-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">24-Hour Hourly Weather & Workability Curve</h2>
                <p className="text-xs text-slate-400 mt-0.5">Granular hourly predictions of temperature, precipitation, and workability safety scores for {wriData.district}.</p>
              </div>
              <button
                onClick={() => setActiveTab('home')}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 cursor-pointer"
              >
                ← Back to Overview
              </button>
            </div>

            {/* Hourly Forecast Component */}
            <HourlyForecastChart 
              hourlyData={wriData.hourly_timeline || []}
              favorableWindow={wriData.hourly_forecast_insight}
            />

            {/* 7-Day Regional Meteorological Outlook */}
            <div className="rounded-3xl border border-slate-700/60 bg-slate-900/80 backdrop-blur-md p-6 sm:p-8 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4">Daily Meteorological Extremes</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                  <span className="text-xs font-bold text-slate-400 block mb-1">Max Temperature</span>
                  <span className="text-2xl font-black text-rose-400">{wriData.weather?.temperature_max_c ?? '--'}°C</span>
                  <span className="text-[0.68rem] text-slate-400 block mt-1">Expected peak midday</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                  <span className="text-xs font-bold text-slate-400 block mb-1">Min Temperature</span>
                  <span className="text-2xl font-black text-cyan-400">{wriData.weather?.temperature_min_c ?? '--'}°C</span>
                  <span className="text-[0.68rem] text-slate-400 block mt-1">Nighttime low</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                  <span className="text-xs font-bold text-slate-400 block mb-1">Rain Forecast Sum</span>
                  <span className="text-2xl font-black text-blue-400">{wriData.weather?.precipitation_forecast_today_mm ?? '0.0'} mm</span>
                  <span className="text-[0.68rem] text-slate-400 block mt-1">24-hour total</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                  <span className="text-xs font-bold text-slate-400 block mb-1">Barometric Trend</span>
                  <span className="text-2xl font-black text-emerald-400">{wriData.weather?.surface_pressure_hpa ?? '1012'} hPa</span>
                  <span className="text-[0.68rem] text-slate-400 block mt-1">Δ24h: {wriData.weather?.pressure_delta_24h_hpa ?? '+0.0'} hPa</span>
                </div>
              </div>
            </div>
          </main>
        )}

        {/* ============================================================== */}
        {/* VIEW 3: OUTDOOR WORK SAFETY PLANNER TAB                        */}
        {/* ============================================================== */}
        {activeTab === 'planner' && wriData && (
          <main className="flex flex-col gap-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">Work Safety Planner & Shift Feasibility</h2>
                <p className="text-xs text-slate-400 mt-0.5">Targeted occupational guidance for agriculture, civil construction, transport, and coastal fishing.</p>
              </div>
              <button
                onClick={() => setActiveTab('home')}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 cursor-pointer"
              >
                ← Back to Overview
              </button>
            </div>

            <WorkPlanner
              district={wriData.district}
              apiBase={API_BASE}
              isDay={false}
              cardBg="bg-slate-900/80 border border-slate-700/60 backdrop-blur-md"
              subText="text-slate-400"
              headingText="text-white"
              inputBg="bg-slate-800 border-slate-700 text-white"
            />
          </main>
        )}

        {/* ============================================================== */}
        {/* VIEW 4: DISASTER ALERTS NETWORK TAB                            */}
        {/* ============================================================== */}
        {activeTab === 'alerts' && (
          <main className="flex flex-col gap-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">Disaster Warning Network & CAP Bulletins</h2>
                <p className="text-xs text-slate-400 mt-0.5">Standardized 5-tier alert bulletins from IMD, OSDMA, and Central Water Commission.</p>
              </div>
              <button
                onClick={() => setActiveTab('home')}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 cursor-pointer"
              >
                ← Back to Overview
              </button>
            </div>

            <EmergencyNetworkView
              district={selectedDistrict}
              apiBase={API_BASE}
              isDay={false}
              cardBg="bg-slate-900/80 border border-slate-700/60 backdrop-blur-md"
              subText="text-slate-400"
              headingText="text-white"
              inputBg="bg-slate-800 border-slate-700 text-white"
              initialTab="warnings"
              onTriggerAlarmTest={(alert) => {
                setActiveEmergencyAlert(alert);
                setShowEmergencyModal(true);
              }}
            />
          </main>
        )}

        {/* ============================================================== */}
        {/* VIEW 5: FLOOD & DAMS MONITORING TAB                            */}
        {/* ============================================================== */}
        {activeTab === 'floods' && (
          <main className="flex flex-col gap-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">River Floods & Dam Telemetry</h2>
                <p className="text-xs text-slate-400 mt-0.5">Real-time CWC river gauges and reservoir levels across major Odisha drainage basins.</p>
              </div>
              <button
                onClick={() => setActiveTab('home')}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 cursor-pointer"
              >
                ← Back to Overview
              </button>
            </div>

            <EmergencyNetworkView
              district={selectedDistrict}
              apiBase={API_BASE}
              isDay={false}
              cardBg="bg-slate-900/80 border border-slate-700/60 backdrop-blur-md"
              subText="text-slate-400"
              headingText="text-white"
              inputBg="bg-slate-800 border-slate-700 text-white"
              initialTab="floods"
            />
          </main>
        )}

        {/* ============================================================== */}
        {/* VIEW 6: SAFE SHELTER LOCATOR TAB                               */}
        {/* ============================================================== */}
        {activeTab === 'shelters' && (
          <main className="flex flex-col gap-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">Verified Cyclone & Flood Shelters</h2>
                <p className="text-xs text-slate-400 mt-0.5">OSDMA and NCRMP multipurpose shelters sorted by distance from your current location.</p>
              </div>
              <button
                onClick={() => setActiveTab('home')}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 cursor-pointer"
              >
                ← Back to Overview
              </button>
            </div>

            <EmergencyNetworkView
              district={selectedDistrict}
              apiBase={API_BASE}
              isDay={false}
              cardBg="bg-slate-900/80 border border-slate-700/60 backdrop-blur-md"
              subText="text-slate-400"
              headingText="text-white"
              inputBg="bg-slate-800 border-slate-700 text-white"
              initialTab="shelters"
            />
          </main>
        )}

        {/* ============================================================== */}
        {/* VIEW 7: 30-DISTRICT INTERACTIVE MAP TAB                        */}
        {/* ============================================================== */}
        {activeTab === 'map' && (
          <main className="flex flex-col gap-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">Odisha 30-District Risk Map</h2>
                <p className="text-xs text-slate-400 mt-0.5">Click any district to inspect microclimatic conditions and workability safety scores.</p>
              </div>
              <button
                onClick={() => setActiveTab('home')}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 cursor-pointer"
              >
                ← Back to Overview
              </button>
            </div>

            <div className="rounded-3xl border border-slate-700/60 bg-slate-900/80 backdrop-blur-md p-6 shadow-xl">
              <OdishaMap
                selectedDistrict={selectedDistrict}
                onSelectDistrict={(dist) => {
                  handleDistrictChange(dist);
                  setActiveTab('home');
                }}
                isDay={false}
                cardBg="bg-slate-900"
                subText="text-slate-400"
              />
            </div>
          </main>
        )}

        {/* ============================================================== */}
        {/* VIEW 8: ML MODEL RESEARCH TAB                                  */}
        {/* ============================================================== */}
        {activeTab === 'research' && (
          <main className="flex flex-col gap-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">Machine Learning & Meteorological Methodology</h2>
                <p className="text-xs text-slate-400 mt-0.5">Empirical validation on multi-year NASA POWER and ERA5 reanalysis datasets.</p>
              </div>
              <button
                onClick={() => setActiveTab('home')}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 cursor-pointer"
              >
                ← Back to Overview
              </button>
            </div>

            <ModelResearchSection
              cardBg="bg-slate-900/80 border border-slate-700/60 backdrop-blur-md"
              subText="text-slate-400"
            />
          </main>
        )}

      </div>

      {/* 5. Emergency SOS Beacon Modal */}
      <EmergencySosModal
        isOpen={showSosModal}
        onClose={() => setShowSosModal(false)}
        district={selectedDistrict}
        locality={wriData?.locality}
        coords={wriData?.coordinates}
        onFindShelters={() => setActiveTab('shelters')}
      />

      {/* 6. Emergency Siren Alarm Overlay Modal (Level 3 & 4 Warnings) */}
      <EmergencyAlarmModal
        isOpen={showEmergencyModal}
        alert={activeEmergencyAlert}
        onClose={() => setShowEmergencyModal(false)}
        onAcknowledge={handleAcknowledgeAlert}
        soundEnabled={true}
        onNavigateShelters={() => {
          setShowEmergencyModal(false);
          setActiveTab('shelters');
        }}
      />

    </div>
  );
}
