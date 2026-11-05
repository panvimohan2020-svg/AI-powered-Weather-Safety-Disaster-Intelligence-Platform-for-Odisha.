import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, ShieldAlert, Waves, Wind, Compass, Phone, 
  MapPin, Radio, Activity, CheckSquare, Square, Share2, 
  Copy, Check, Send, ExternalLink, RefreshCw, Volume2, 
  Sliders, Info, HelpCircle, AlertCircle, Building2, Eye, ShieldCheck, Siren
} from 'lucide-react';

export default function EmergencyNetworkView({ 
  district, 
  apiBase, 
  isDay, 
  cardBg, 
  subText, 
  headingText, 
  inputBg,
  onTriggerAlarmTest,
  initialTab = 'warnings'
}) {
  const [activeTab, setActiveTab] = useState(initialTab || 'warnings');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  
  // Data states
  const [alerts, setAlerts] = useState([]);
  const [riverData, setRiverData] = useState(null);
  const [earthquakeData, setEarthquakeData] = useState(null);
  const [shelters, setShelters] = useState([]);
  const [contacts, setContacts] = useState(null);
  const [sourcesInfo, setSourcesInfo] = useState(null);
  const [communityIncidents, setCommunityIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Cyclone Checklist State (saved to localStorage)
  const [cycloneChecklist, setCycloneChecklist] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('odisha_wri_cyclone_checklist');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return {
      water: false,
      dry_food: false,
      torch_batteries: false,
      first_aid_meds: false,
      documents_sealed: false,
      radio_broadcast: false,
      phone_charged: false,
      livestock_untied: false
    };
  });

  // Custom Personal Emergency Contacts (saved to localStorage)
  const [personalContacts, setPersonalContacts] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('odisha_wri_personal_contacts');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return [
      { name: "Family Primary Contact", phone: "" },
      { name: "Local Village / Ward Head", phone: "" }
    ];
  });
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");

  // Citizen Incident Form State
  const [incidentForm, setIncidentForm] = useState({
    incident_type: 'flooding',
    location_details: '',
    description: '',
    severity: 'moderate',
    reporter_name: '',
    reporter_phone: ''
  });
  const [incidentSubmitted, setIncidentSubmitted] = useState(false);

  // SOS Status Generator State
  const [sosStatus, setSosStatus] = useState('safe'); // 'safe' | 'need_help'
  const [sosCopied, setSosCopied] = useState(false);

  // Filter for warnings tab
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Load Data on District or Tab Change
  const fetchEmergencyData = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      // 1. Fetch Alerts
      const alertsResp = await fetch(`${apiBase}/api/emergency/alerts?district=${encodeURIComponent(district)}&include_simulated=true`);
      if (alertsResp.ok) {
        const aData = await alertsResp.json();
        setAlerts(aData.alerts || []);
      }

      // 2. Fetch River & Reservoir Data
      const riversResp = await fetch(`${apiBase}/api/emergency/river-levels`);
      if (riversResp.ok) {
        const rData = await riversResp.json();
        setRiverData(rData);
      }

      // 3. Fetch Shelters
      const sheltersResp = await fetch(`${apiBase}/api/emergency/shelters?district=${encodeURIComponent(district)}`);
      if (sheltersResp.ok) {
        const sData = await sheltersResp.json();
        setShelters(sData.shelters || []);
      }

      // 4. Fetch Emergency Contacts
      const contactsResp = await fetch(`${apiBase}/api/emergency/contacts?district=${encodeURIComponent(district)}`);
      if (contactsResp.ok) {
        const cData = await contactsResp.json();
        setContacts(cData);
      }

      // 5. Fetch Earthquakes
      const eqResp = await fetch(`${apiBase}/api/emergency/earthquakes`);
      if (eqResp.ok) {
        const eqData = await eqResp.json();
        setEarthquakeData(eqData);
      }

      // 6. Fetch Official Sources
      const srcsResp = await fetch(`${apiBase}/api/emergency/sources-info`);
      if (srcsResp.ok) {
        const srcData = await srcsResp.json();
        setSourcesInfo(srcData);
      }

      // 7. Fetch Community Incidents
      const incResp = await fetch(`${apiBase}/api/emergency/incidents?district=${encodeURIComponent(district)}`);
      if (incResp.ok) {
        const incData = await incResp.json();
        setCommunityIncidents(incData.incidents || []);
      }
    } catch (e) {
      setStatusMessage("Could not sync real-time emergency feed. Displaying cached emergency data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmergencyData();
  }, [district]);

  // Save checklist
  const toggleChecklistItem = (key) => {
    const updated = { ...cycloneChecklist, [key]: !cycloneChecklist[key] };
    setCycloneChecklist(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('odisha_wri_cyclone_checklist', JSON.stringify(updated));
    }
  };

  // Add personal contact
  const handleAddPersonalContact = (e) => {
    e.preventDefault();
    if (!newContactName || !newContactPhone) return;
    const updated = [...personalContacts, { name: newContactName, phone: newContactPhone }];
    setPersonalContacts(updated);
    setNewContactName("");
    setNewContactPhone("");
    if (typeof window !== 'undefined') {
      localStorage.setItem('odisha_wri_personal_contacts', JSON.stringify(updated));
    }
  };

  const handleRemovePersonalContact = (idx) => {
    const updated = personalContacts.filter((_, i) => i !== idx);
    setPersonalContacts(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('odisha_wri_personal_contacts', JSON.stringify(updated));
    }
  };

  // Submit Incident Report
  const handleSubmitIncident = async (e) => {
    e.preventDefault();
    if (!incidentForm.description || !incidentForm.location_details) return;
    try {
      const resp = await fetch(`${apiBase}/api/emergency/report-incident`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...incidentForm, district })
      });
      if (resp.ok) {
        setIncidentSubmitted(true);
        fetchEmergencyData();
        setTimeout(() => setIncidentSubmitted(false), 5000);
        setIncidentForm({
          incident_type: 'flooding',
          location_details: '',
          description: '',
          severity: 'moderate',
          reporter_name: '',
          reporter_phone: ''
        });
      }
    } catch (e) {
      alert("Error logging incident report. Please try again.");
    }
  };

  // Trigger Simulation
  const handleTriggerSimulation = async (scenarioType) => {
    try {
      const resp = await fetch(`${apiBase}/api/emergency/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_type: scenarioType, district })
      });
      if (resp.ok) {
        const data = await resp.json();
        fetchEmergencyData();
        if (onTriggerAlarmTest && data.alert) {
          onTriggerAlarmTest(data.alert);
        }
      }
    } catch (e) {
      alert("Error triggering test simulation.");
    }
  };

  const handleClearSimulations = async () => {
    try {
      await fetch(`${apiBase}/api/emergency/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "clear_all", district })
      });
      fetchEmergencyData();
    } catch (e) {}
  };

  // Generate SOS Card Text
  const generateSosText = () => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (sosStatus === 'safe') {
      return `🟢 EMERGENCY UPDATE: I AM SAFE\nLocation: ${district}, Odisha\nTime: ${timeStr}\nStatus: We are currently safe and sheltered. Emergency contacts verified.\nReported via Odisha Disaster Alert Network.`;
    } else {
      return `🚨 URGENT: EMERGENCY ASSISTANCE NEEDED!\nLocation: ${district}, Odisha\nTime: ${timeStr}\nCondition: In immediate need of flood/cyclone assistance or medical transport.\nPlease alert State EOC (1070) or District DEOC (1077) on my behalf!`;
    }
  };

  const handleCopySos = () => {
    const text = generateSosText();
    navigator.clipboard.writeText(text).then(() => {
      setSosCopied(true);
      setTimeout(() => setSosCopied(false), 3000);
    });
  };

  const handleShareWhatsAppSos = () => {
    const text = encodeURIComponent(generateSosText());
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // Filtered alerts
  const filteredAlerts = alerts.filter(a => {
    if (categoryFilter === 'ALL') return true;
    return a.category === categoryFilter;
  });

  const activeLevel3Or4 = alerts.find(a => a.severity_level >= 3);

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in">

      {/* Main Header Banner */}
      <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-red-950 via-slate-950 to-indigo-950 border-2 border-red-600/60 shadow-2xl flex flex-col gap-4 text-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-red-600 text-white shadow-lg shadow-red-600/40 animate-pulse">
              <Siren className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[0.65rem] font-black uppercase px-2 py-0.5 rounded bg-red-600 text-white tracking-widest">
                  LIVE EMERGENCY NETWORK
                </span>
                <span className="text-xs font-mono font-bold text-slate-300">
                  {district} Monitored
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black mt-0.5 tracking-tight text-white">
                ODISHA DISASTER ALERT & EMERGENCY WARNING SYSTEM
              </h2>
            </div>
          </div>

          {/* Quick Refresh & Help Hotline Badge */}
          <div className="flex items-center gap-2">
            <button
              onClick={fetchEmergencyData}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 transition-all cursor-pointer"
              title="Refresh Emergency Feeds"
            >
              <RefreshCw className={`w-4 h-4 text-slate-200 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <div className="px-3.5 py-1.5 rounded-xl bg-black/40 border border-red-500/30 text-xs font-mono font-bold text-red-300 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-red-400" />
              <span>SOS Helpline: <strong>112 / 1070</strong></span>
            </div>
          </div>
        </div>

        {/* Prominent Active Hazard Callout if Level 3 or 4 is active */}
        {activeLevel3Or4 && (
          <div className="p-3.5 rounded-2xl bg-red-600 text-white flex items-center justify-between gap-3 shadow-lg shadow-red-900/40">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 animate-bounce" />
              <div className="text-xs sm:text-sm font-black">
                ACTIVE {activeLevel3Or4.severity_label ? activeLevel3Or4.severity_label.toUpperCase() : 'HIGH HAZARD'} FOR {district.toUpperCase()}: {activeLevel3Or4.headline}
              </div>
            </div>
            <button
              onClick={() => onTriggerAlarmTest && onTriggerAlarmTest(activeLevel3Or4)}
              className="px-3 py-1.5 rounded-xl bg-white text-red-700 font-black text-xs hover:bg-slate-100 flex items-center gap-1 flex-shrink-0 cursor-pointer shadow"
            >
              <Volume2 className="w-3.5 h-3.5" /> View Alarm
            </button>
          </div>
        )}

        {/* Global Safety Disclaimer Principle */}
        <p className="text-[0.68rem] text-slate-300/80 leading-snug border-t border-white/10 pt-2.5 italic">
          "ODISHA WRI is an additional disaster-information and public awareness platform. It does not replace official government warnings, emergency broadcast systems, evacuation instructions, or emergency services. Always follow instructions from IMD, NDMA, OSDMA, district administration, and emergency services."
        </p>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
        {[
          { id: 'warnings', label: `Warnings & Bulletins (${alerts.length})`, icon: ShieldAlert },
          { id: 'floods', label: 'River Floods & Dams', icon: Waves },
          { id: 'cyclone', label: 'Cyclone Tracker & Kit', icon: Wind },
          { id: 'shelters', label: `Shelters (${shelters.length})`, icon: Building2 },
          { id: 'earthquakes', label: 'Seismic Events (NCS)', icon: Activity },
          { id: 'contacts', label: 'Emergency SOS & Helplines', icon: Phone },
          { id: 'report', label: 'Citizen Incident Reports', icon: Send },
          { id: 'simulator', label: 'Test Simulation Engine', icon: Sliders },
          { id: 'sources', label: 'Official Sources Registry', icon: Info }
        ].map(tab => {
          const IconC = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-3.5 py-2.5 rounded-2xl border flex items-center gap-2 font-bold text-xs transition-all cursor-pointer ${
                isActive 
                  ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-950/40 scale-102' 
                  : 'bg-slate-900/40 hover:bg-slate-800/60 border-slate-700/60 text-slate-300'
              }`}
            >
              <IconC className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          TAB 1: ACTIVE WARNINGS (CAP OFFICIAL BULLETINS)
          ===================================================================== */}
      {activeTab === 'warnings' && (
        <div className="flex flex-col gap-4">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className={`font-bold ${subText}`}>Filter Disaster Warning Type:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {['ALL', 'CYCLONE', 'FLOOD', 'HEAVY_RAIN', 'THUNDERSTORM_LIGHTNING', 'EXTREME_HEATWAVE', 'EARTHQUAKE', 'TSUNAMI'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[0.7rem] font-bold transition-all ${
                    categoryFilter === cat
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-black/20 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {filteredAlerts.length === 0 ? (
            <div className={`${cardBg} rounded-3xl p-8 text-center flex flex-col items-center justify-center gap-3`}>
              <ShieldCheck className="w-12 h-12 text-emerald-400 opacity-80" />
              <h3 className="text-base font-bold text-white">No Active Severe Disaster Warnings for {district}</h3>
              <p className={`text-xs ${subText} max-w-md`}>
                Official meteorological conditions are currently within baseline parameters. You can trigger an isolated test exercise in the "Test Simulation Engine" tab to inspect the Level 4 alarm.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredAlerts.map(alert => {
                const isL4 = alert.severity_level === 4;
                const isL3 = alert.severity_level === 3;
                let cardBorder = 'border-amber-500/40 bg-amber-950/20';
                let badgeClass = 'bg-amber-500 text-black';
                if (isL4) {
                  cardBorder = 'border-red-600 bg-red-950/30 ring-1 ring-red-500';
                  badgeClass = 'bg-red-600 text-white animate-pulse';
                } else if (isL3) {
                  cardBorder = 'border-red-500/50 bg-red-950/25';
                  badgeClass = 'bg-red-500 text-white';
                }

                return (
                  <div key={alert.alert_id} className={`p-5 rounded-3xl border ${cardBorder} flex flex-col gap-3 shadow-xl transition-all`}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[0.65rem] font-black uppercase px-2.5 py-0.5 rounded-md ${badgeClass}`}>
                          {alert.severity_label ? alert.severity_label.toUpperCase() : `LEVEL ${alert.severity_level}`}
                        </span>
                        {alert.is_simulation && (
                          <span className="text-[0.65rem] font-black uppercase px-2 py-0.5 rounded-md bg-amber-400 text-black">
                            SIMULATED EXERCISE
                          </span>
                        )}
                        <span className="text-xs font-mono font-bold text-slate-300">
                          {alert.category ? alert.category.replace('_', ' ') : 'DISASTER ALERT'}
                        </span>
                      </div>
                      <span className={`text-[0.65rem] font-mono ${subText}`}>
                        Valid until: {new Date(alert.valid_until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-white">
                      {alert.headline}
                    </h3>

                    {/* Affected Districts */}
                    <div className="text-xs text-slate-300 flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-amber-400">Affected Zones:</span>
                      <span>{alert.affected_districts ? alert.affected_districts.join(', ') : district}</span>
                    </div>

                    {/* Protective Directives */}
                    {alert.action_instructions && (
                      <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex flex-col gap-1.5 text-xs">
                        <div className="font-bold text-amber-300 uppercase text-[0.65rem]">Official Mandatory Safety Instructions:</div>
                        <ul className="list-disc list-inside space-y-1 text-slate-200">
                          {alert.action_instructions.map((instr, i) => (
                            <li key={i}>{instr}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Shelter info & Authority */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-2 border-t border-white/10">
                      <div className="text-slate-400 text-[0.7rem]">
                        Source: <strong className="text-slate-200">{alert.issuing_authority}</strong> • Ref: {alert.official_reference}
                      </div>

                      <div className="flex items-center gap-2">
                        {alert.severity_level >= 3 && (
                          <button
                            onClick={() => onTriggerAlarmTest && onTriggerAlarmTest(alert)}
                            className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <Volume2 className="w-3.5 h-3.5" /> Sound Alarm
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 2: RIVER FLOODS & DAM DISCHARGES (CWC TELEMETRY)
          ===================================================================== */}
      {activeTab === 'floods' && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Waves className="w-5 h-5 text-sky-400" />
              Central Water Commission (CWC) River Flood Gauges & Dam Discharges
            </h3>
            <p className={`text-xs ${subText}`}>
              Real-time monitoring of major river water levels against Warning and Danger marks across Odisha basins.
            </p>
          </div>

          {/* River Gauges Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {riverData?.river_gauges?.map(gauge => {
              const isDanger = gauge.current_level_m >= gauge.danger_level_m;
              const isWarning = gauge.current_level_m >= gauge.warning_level_m;
              const pct = Math.min(100, Math.max(10, (gauge.current_level_m / gauge.danger_level_m) * 100));

              return (
                <div key={gauge.id} className={`${cardBg} rounded-3xl p-5 border flex flex-col justify-between gap-3 ${
                  isDanger ? 'border-red-600 bg-red-950/20' : (isWarning ? 'border-amber-500 bg-amber-950/20' : 'border-slate-800')
                }`}>
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-[0.65rem] font-bold uppercase text-sky-400 tracking-wider">
                          {gauge.river} River ({gauge.basin})
                        </div>
                        <h4 className="text-lg font-black text-white mt-0.5">
                          {gauge.station} Station ({gauge.district})
                        </h4>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[0.65rem] font-black uppercase border ${
                        isDanger ? 'bg-red-600 text-white border-red-500' : (isWarning ? 'bg-amber-500 text-black border-amber-400' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30')
                      }`}>
                        {gauge.status}
                      </span>
                    </div>

                    {/* Level Numbers & Visual Meter */}
                    <div className="flex items-baseline justify-between mt-3 mb-1">
                      <div>
                        <span className="text-3xl font-black font-mono text-white">{gauge.current_level_m.toFixed(2)}</span>
                        <span className="text-sm font-bold text-slate-400 ml-1">meters</span>
                      </div>
                      <div className="text-xs text-right text-slate-300">
                        Trend: <strong className={gauge.trend === 'Rising' ? 'text-red-400' : 'text-emerald-400'}>{gauge.trend}</strong>
                      </div>
                    </div>

                    {/* Visual Progress Bar to Danger Mark */}
                    <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 mt-1 border border-slate-700">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isDanger ? 'bg-red-500' : (isWarning ? 'bg-amber-400' : 'bg-sky-400')
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[0.68rem] font-mono text-slate-400 mt-1.5">
                      <span>Warning: {gauge.warning_level_m.toFixed(2)}m</span>
                      <span>Danger Mark: {gauge.danger_level_m.toFixed(2)}m</span>
                    </div>
                  </div>

                  <div className="text-[0.65rem] text-slate-400 border-t border-slate-800/80 pt-2 flex justify-between">
                    <span>Source: {gauge.reporting_authority}</span>
                    <span>{gauge.last_updated}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Major Dam Reservoirs */}
          <div className="flex flex-col gap-3 mt-3">
            <h4 className="text-sm font-black uppercase text-amber-400 flex items-center gap-1.5">
              <Building2 className="w-4 h-4" />
              Major Reservoirs & Gate Sluice Releases
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {riverData?.dam_reservoirs?.map(dam => (
                <div key={dam.id} className={`${cardBg} rounded-3xl p-5 border border-slate-800 flex flex-col justify-between gap-3`}>
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[0.65rem] font-bold uppercase text-amber-400">{dam.river} River</span>
                        <h5 className="text-base font-black text-white">{dam.name} ({dam.district})</h5>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[0.65rem] font-black bg-blue-500/20 text-blue-300 border border-blue-500/40">
                        {dam.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 my-3 text-xs text-center">
                      <div className="p-2 rounded-xl bg-black/20">
                        <div className="text-[0.62rem] text-slate-400">Current Level</div>
                        <div className="font-mono font-black text-sm text-white">{dam.current_water_level_ft} ft</div>
                        <div className="text-[0.6rem] text-slate-500">Max: {dam.full_reservoir_level_ft} ft</div>
                      </div>
                      <div className="p-2 rounded-xl bg-black/20">
                        <div className="text-[0.62rem] text-slate-400">Gates Open</div>
                        <div className="font-mono font-black text-sm text-amber-400">{dam.sluice_gates_open} Sluices</div>
                        <div className="text-[0.6rem] text-slate-500">Controlled</div>
                      </div>
                      <div className="p-2 rounded-xl bg-black/20">
                        <div className="text-[0.62rem] text-slate-400">Outflow Discharge</div>
                        <div className="font-mono font-black text-sm text-sky-400">{dam.outflow_cusecs.toLocaleString()}</div>
                        <div className="text-[0.6rem] text-slate-500">cusecs</div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[0.72rem] text-slate-200">
                      <strong className="text-amber-400">Downstream Impact:</strong> {dam.downstream_warning}
                    </div>
                  </div>

                  <div className="text-[0.65rem] text-slate-400 border-t border-slate-800 pt-2 flex justify-between">
                    <span>{dam.authority}</span>
                    <span>{dam.last_reported}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: CYCLONE TRACKER & 8-POINT PREPAREDNESS CHECKLIST
          ===================================================================== */}
      {activeTab === 'cyclone' && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Wind className="w-5 h-5 text-amber-400" />
              Tropical Cyclone Tracking & Coastal Readiness Protocol
            </h3>
            <p className={`text-xs ${subText}`}>
              Official tracking intelligence for Bay of Bengal cyclonic systems and interactive family preparedness checklist.
            </p>
          </div>

          {/* Active Cyclone Tracker Status Card */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/60 border border-amber-500/40 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-800">
              <div>
                <span className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-400">
                  Bay of Bengal Tropical Disturbance Watch
                </span>
                <h4 className="text-xl font-black text-white mt-0.5">
                  Deep Depression / Severe Cyclone Corridor Watch
                </h4>
              </div>
              <div className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold">
                Tracking: Coastal Odisha (Ganjam to Balasore)
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-black/20">
                <div className="text-[0.65rem] text-slate-400">Peak Coastal Wind</div>
                <div className="text-lg font-black text-white mt-0.5">65 - 85 km/h</div>
                <div className="text-[0.62rem] text-amber-400">Gale Force Gusts</div>
              </div>
              <div className="p-3 rounded-2xl bg-black/20">
                <div className="text-[0.65rem] text-slate-400">Central Pressure</div>
                <div className="text-lg font-black text-white mt-0.5">994 hPa</div>
                <div className="text-[0.62rem] text-slate-400">Barometric Drop</div>
              </div>
              <div className="p-3 rounded-2xl bg-black/20">
                <div className="text-[0.65rem] text-slate-400">Expected Storm Surge</div>
                <div className="text-lg font-black text-white mt-0.5">0.5 - 1.2 m</div>
                <div className="text-[0.62rem] text-amber-400">High Tide Inundation</div>
              </div>
              <div className="p-3 rounded-2xl bg-black/20">
                <div className="text-[0.65rem] text-slate-400">Marine Advisory</div>
                <div className="text-lg font-black text-red-400 mt-0.5">Strict Fishermen Ban</div>
                <div className="text-[0.62rem] text-slate-400">Deep Sea Recall Active</div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/30 border border-white/5 text-xs text-slate-200">
              <strong className="text-amber-300">Evacuation Priority: </strong>
              Follow official announcements from District Collectors of Puri, Jagatsinghpur, Kendrapara, Bhadrak, and Balasore. People in thatched houses must evacuate to Multipurpose Cyclone Shelters when instructed.
            </div>
          </div>

          {/* Interactive 8-Point Cyclone Preparedness Checklist */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-black uppercase text-emerald-400 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4" />
                8-Point Family Cyclone Emergency Grab-Kit Checklist
              </h4>
              <span className="text-xs font-mono text-slate-400">
                Saved locally on your device
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                { key: 'water', label: 'Drinking Water (at least 3 liters per family member for 3 days in clean jugs)' },
                { key: 'dry_food', label: 'Dry non-perishable rations (Chuda, Gur, biscuits, baby milk powder)' },
                { key: 'torch_batteries', label: 'Battery-operated LED torches & spare fresh dry cells' },
                { key: 'first_aid_meds', label: 'First aid kit with personal prescription medicines & ORS packets' },
                { key: 'documents_sealed', label: 'Aadhaar, land deeds, ration cards stored in waterproof zip plastic bags' },
                { key: 'radio_broadcast', label: 'Battery-operated portable transistor radio for All India Radio news' },
                { key: 'phone_charged', label: 'Mobile phones & power banks charged to 100%' },
                { key: 'livestock_untied', label: 'Cattle & goats untied before storm surge to allow them to reach high ramps' }
              ].map(item => {
                const checked = cycloneChecklist[item.key];
                return (
                  <button
                    key={item.key}
                    onClick={() => toggleChecklistItem(item.key)}
                    className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      checked 
                        ? 'bg-emerald-950/30 border-emerald-500/50 text-slate-100' 
                        : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {checked ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600" />
                      )}
                    </div>
                    <span className={`text-xs leading-snug ${checked ? 'line-through text-slate-400' : 'text-slate-200'}`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: VERIFIED EMERGENCY SHELTERS
          ===================================================================== */}
      {activeTab === 'shelters' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                Verified OSDMA Multipurpose Cyclone & Flood Shelters
              </h3>
              <p className={`text-xs ${subText}`}>
                Geodesically ranked shelters relative to <strong className="text-white">{district}</strong> with capacities and survival amenities.
              </p>
            </div>
            <div className="text-xs font-mono font-bold text-slate-300">
              DEOC Helpline: <strong>1077</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shelters.map(shelter => (
              <div key={shelter.id} className={`${cardBg} rounded-3xl p-5 border border-slate-800 flex flex-col justify-between gap-3 shadow-lg`}>
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-[0.65rem] font-black uppercase text-blue-400 tracking-wider">
                        {shelter.type} • {shelter.district}
                      </span>
                      <h4 className="text-base font-black text-white mt-0.5 leading-tight">
                        {shelter.name}
                      </h4>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                        <span>{shelter.location} (Block: {shelter.block})</span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-xl font-black font-mono text-emerald-400">
                        {shelter.distance_km} km
                      </div>
                      <div className="text-[0.62rem] text-slate-400 uppercase">Proximity</div>
                    </div>
                  </div>

                  {/* Capacity & Amenities */}
                  <div className="my-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-black/20">
                      <span className="text-slate-400 font-semibold">Shelter Capacity:</span>
                      <span className="font-mono font-bold text-white">{shelter.capacity_persons.toLocaleString()} Persons</span>
                    </div>

                    <div className="flex flex-wrap gap-1 text-[0.65rem]">
                      {shelter.amenities.map((am, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                          ✓ {am}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Shelter Actions Footer */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
                  <a
                    href={`tel:${shelter.contact_phone}`}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Shelter</span>
                  </a>

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${shelter.lat},${shelter.lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 font-bold flex items-center gap-1.5 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Directions</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 5: EARTHQUAKE INFORMATION (NCS / USGS TELEMETRY)
          ===================================================================== */}
      {activeTab === 'earthquakes' && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-400" />
              Verified Regional Seismic Activity & Earthquake Safety
            </h3>
            <p className={`text-xs ${subText}`}>
              Live seismic event telemetry from National Center for Seismology (NCS) and USGS Global Seismographic Network.
            </p>
          </div>

          {/* Prominent Scientific Compliance Disclaimer */}
          <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
            <div>
              <strong className="block text-white uppercase text-[0.7rem]">Scientific Transparency Principle:</strong>
              Earthquakes CANNOT be reliably predicted in advance by any modern science or weather model. This module displays verified post-event physical seismic telemetry only. No advance pre-event alarm is ever fabricated.
            </div>
          </div>

          {/* Recent Regional Events List */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-black uppercase text-slate-300">
              Recent Verified Seismic Events in South Asia / Bay of Bengal Basin:
            </h4>

            {earthquakeData?.events?.length === 0 ? (
              <div className="p-6 rounded-2xl bg-black/20 text-center text-xs text-slate-400">
                No significant seismic events recorded in the regional corridor in the past 24 hours.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {earthquakeData?.events?.map((ev, i) => (
                  <div key={ev.event_id || i} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between gap-2 text-xs">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="font-extrabold text-sm text-white">{ev.place}</span>
                        <span className="px-2 py-0.5 rounded font-mono font-black text-sm bg-purple-500/20 text-purple-300 border border-purple-500/40">
                          M {ev.magnitude}
                        </span>
                      </div>
                      <div className="text-[0.7rem] text-slate-400 mt-1">
                        Depth: {ev.depth_km} km • Approx {ev.distance_from_odisha_km} km from Odisha
                      </div>
                    </div>
                    <div className="text-[0.65rem] text-slate-500 border-t border-slate-800 pt-1.5 flex justify-between">
                      <span>Source: {ev.source}</span>
                      <span>{new Date(ev.event_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Standard Earthquake Safety Directives */}
          <div className="p-5 rounded-3xl bg-slate-900/40 border border-slate-800 flex flex-col gap-3 text-xs">
            <h4 className="text-sm font-black text-white uppercase tracking-wider">
              Authoritative Earthquake Safety Guidance (OSDMA / NDMA):
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
              <div className="p-3 rounded-2xl bg-black/20">
                <strong className="text-amber-400 block mb-1">DURING AN EARTHQUAKE:</strong>
                <ul className="list-disc list-inside space-y-1 text-[0.75rem]">
                  <li><strong>Drop, Cover, and Hold On:</strong> Get under a sturdy desk or table.</li>
                  <li>Stay away from glass windows, exterior doors, and tall bookracks.</li>
                  <li>Do NOT use elevators. Protect your head and neck with your arms.</li>
                  <li>If outdoors: Move to an open area away from power lines and brick walls.</li>
                </ul>
              </div>
              <div className="p-3 rounded-2xl bg-black/20">
                <strong className="text-emerald-400 block mb-1">AFTER AN EARTHQUAKE:</strong>
                <ul className="list-disc list-inside space-y-1 text-[0.75rem]">
                  <li>Check for injuries and administer first aid if qualified.</li>
                  <li>Check for gas leaks and turn off the main electrical breaker.</li>
                  <li>Be alert for possible aftershocks which can cause cracked walls to collapse.</li>
                  <li>Follow official instructions broadcast by district authorities.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 6: EMERGENCY SOS HELPLINES & STATUS SHARING
          ===================================================================== */}
      {activeTab === 'contacts' && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Phone className="w-5 h-5 text-emerald-400" />
              Emergency SOS Directory & Family Status Broadcaster
            </h3>
            <p className={`text-xs ${subText}`}>
              One-click state helplines, custom family contacts, and quick WhatsApp/SMS safety status card.
            </p>
          </div>

          {/* One-Click "I AM SAFE" / "NEED ASSISTANCE" Status Broadcaster */}
          <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-black uppercase text-amber-400">
                Disaster Safety Status Broadcaster
              </h4>
              <div className="flex items-center gap-1 text-xs">
                <button
                  onClick={() => setSosStatus('safe')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    sosStatus === 'safe' ? 'bg-emerald-600 text-white shadow' : 'bg-black/20 text-slate-400'
                  }`}
                >
                  🟢 I Am Safe
                </button>
                <button
                  onClick={() => setSosStatus('need_help')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    sosStatus === 'need_help' ? 'bg-red-600 text-white shadow' : 'bg-black/20 text-slate-400'
                  }`}
                >
                  🚨 Need Assistance
                </button>
              </div>
            </div>

            {/* Generated Message Preview */}
            <pre className="p-3.5 rounded-2xl bg-black/40 border border-white/5 text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed">
              {generateSosText()}
            </pre>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopySos}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {sosCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{sosCopied ? 'Copied to Clipboard!' : 'Copy Status'}</span>
              </button>

              <button
                onClick={handleShareWhatsAppSos}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-950"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share via WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Official 24x7 State Emergency Helplines Grid */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-black uppercase text-white">
              Official 24x7 Government Emergency Helplines:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {contacts?.state_toll_free?.map((c, i) => (
                <div key={i} className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between gap-2">
                  <div>
                    <div className="font-extrabold text-white text-sm leading-snug">{c.name}</div>
                    <div className="text-[0.68rem] text-slate-400 mt-0.5">{c.desc}</div>
                  </div>
                  <a
                    href={`tel:${c.number}`}
                    className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white font-mono font-black text-sm text-center border border-emerald-500/30 transition-all flex items-center justify-center gap-1"
                  >
                    <Phone className="w-3.5 h-3.5" /> {c.number}
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* District DEOC Specific Helpline */}
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="text-[0.65rem] font-bold uppercase text-blue-400">Local District Disaster Cell</div>
              <div className="font-extrabold text-white text-base">
                District Emergency Operations Centre ({district})
              </div>
              <div className="text-slate-300 text-[0.7rem]">Collectorate Control Room for direct evacuation & relief</div>
            </div>
            <a
              href={`tel:${contacts?.district_deoc || '1077'}`}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow"
            >
              <Phone className="w-3.5 h-3.5" /> Call DEOC: {contacts?.district_deoc || '1077'}
            </a>
          </div>

          {/* Personal Family Emergency Contacts */}
          <div className="p-5 rounded-3xl bg-slate-900/40 border border-slate-800 flex flex-col gap-3">
            <h4 className="text-xs font-black uppercase text-slate-300">
              Personal Family & Community Contacts (Stored Locally):
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {personalContacts.map((pc, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-black/20 border border-slate-800 flex justify-between items-center gap-2">
                  <div>
                    <div className="font-bold text-white">{pc.name}</div>
                    <div className="font-mono text-emerald-400">{pc.phone || 'No phone set'}</div>
                  </div>
                  <button
                    onClick={() => handleRemovePersonalContact(idx)}
                    className="text-[0.65rem] text-red-400 hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {/* Add Contact Form */}
            <form onSubmit={handleAddPersonalContact} className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
              <input
                type="text"
                placeholder="Contact Name / Relation"
                value={newContactName}
                onChange={e => setNewContactName(e.target.value)}
                className={`rounded-xl px-3 py-2 text-xs border ${inputBg}`}
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={newContactPhone}
                onChange={e => setNewContactPhone(e.target.value)}
                className={`rounded-xl px-3 py-2 text-xs border ${inputBg}`}
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer"
              >
                + Add Contact
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 7: EMERGENCY SIMULATION & SYSTEM TEST ENGINE
          ===================================================================== */}
      {activeTab === 'simulator' && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-400" />
              Isolated Disaster Alarm Simulation & Verification Tool
            </h3>
            <p className={`text-xs ${subText}`}>
              Allows safety researchers, emergency planners, and examiners to trigger realistic simulated test alerts without polluting live official channels.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center justify-between gap-3">
            <div>
              <strong>SAFETY PROTOCOL NOTICE:</strong> All simulated alerts are strictly tagged with <span className="bg-amber-400 text-black px-1.5 py-0.5 rounded font-black text-[0.65rem]">TEST SIMULATION</span> and are segregated from verified government notices.
            </div>
            <button
              onClick={handleClearSimulations}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex-shrink-0 cursor-pointer"
            >
              Clear All Simulations
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { id: 'cyclone_warning', title: 'Level 4 Cyclone Emergency', desc: 'Very Severe Storm approaching coast with 90 km/h gusts and storm surge', badge: 'LEVEL 4 CRITICAL' },
              { id: 'river_flood', title: 'Level 3 Mahanadi River Flood', desc: 'Hirakud 12-sluice gate release alert & river embankment flood warnings', badge: 'LEVEL 3 WARNING' },
              { id: 'lightning_emergency', title: 'Level 3 Severe Lightning Squall', desc: 'Cloud-to-ground lightning storm warning for outdoor agricultural fields', badge: 'LEVEL 3 WARNING' },
              { id: 'earthquake_event', title: 'Level 2 Regional Seismic Tremor', desc: 'Magnitude 5.4 earthquake event notification in Bay of Bengal', badge: 'LEVEL 2 WATCH' },
              { id: 'tsunami_watch', title: 'Level 4 Tsunami Coastal Inundation', desc: 'Coastal high wave evacuation watch along coastal sand dunes', badge: 'LEVEL 4 CRITICAL' }
            ].map(sc => (
              <div key={sc.id} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between gap-3 text-xs">
                <div>
                  <span className="text-[0.62rem] font-black uppercase px-2 py-0.5 rounded bg-red-600/30 text-red-300 border border-red-500/30">
                    {sc.badge}
                  </span>
                  <h4 className="text-sm font-black text-white mt-1">{sc.title}</h4>
                  <p className="text-[0.7rem] text-slate-400 mt-0.5">{sc.desc}</p>
                </div>
                <button
                  onClick={() => handleTriggerSimulation(sc.id)}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs transition-all cursor-pointer shadow"
                >
                  Trigger Simulation
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 8: CITIZEN INCIDENT REPORTING
          ===================================================================== */}
      {activeTab === 'report' && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-400" />
              Citizen Incident Reporting & Community Observation Log
            </h3>
            <p className={`text-xs ${subText}`}>
              Report localized hazards (flooded culvert, fallen tree, broken wire). All citizen reports are strictly audited and marked unverified.
            </p>
          </div>

          {/* Citizen Incident Form */}
          <form onSubmit={handleSubmitIncident} className={`${cardBg} rounded-3xl p-5 sm:p-6 border border-slate-800 flex flex-col gap-4 text-xs`}>
            <h4 className="text-sm font-black text-white uppercase">Submit Ground Incident Observation:</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[0.65rem] font-bold uppercase text-slate-400 block mb-1">Disaster Hazard Type</label>
                <select
                  value={incidentForm.incident_type}
                  onChange={e => setIncidentForm({ ...incidentForm, incident_type: e.target.value })}
                  className={`w-full rounded-xl p-2.5 font-bold border ${inputBg}`}
                >
                  <option value="flooding">Waterlogging / Flooded Road</option>
                  <option value="fallen_tree">Fallen Tree / Road Blocked</option>
                  <option value="power_outage">Snapping Power Cable / Transformer Fire</option>
                  <option value="structural_damage">Roof Collapse / Damaged Embankment</option>
                  <option value="landslide">Hill Slope Landslide / Boulder Fall</option>
                  <option value="other">Other Emergency Situation</option>
                </select>
              </div>

              <div>
                <label className="text-[0.65rem] font-bold uppercase text-slate-400 block mb-1">Severity Assessment</label>
                <select
                  value={incidentForm.severity}
                  onChange={e => setIncidentForm({ ...incidentForm, severity: e.target.value })}
                  className={`w-full rounded-xl p-2.5 font-bold border ${inputBg}`}
                >
                  <option value="minor">Minor (Traffic inconvenience)</option>
                  <option value="moderate">Moderate (Road partially cut off)</option>
                  <option value="severe">Severe (Imminent threat to life/property)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[0.65rem] font-bold uppercase text-slate-400 block mb-1">Location Details (Block, Village, Landmark)</label>
              <input
                type="text"
                required
                placeholder="e.g., Near Gop High School on Konark-Puri bypass road"
                value={incidentForm.location_details}
                onChange={e => setIncidentForm({ ...incidentForm, location_details: e.target.value })}
                className={`w-full rounded-xl p-2.5 border ${inputBg}`}
              />
            </div>

            <div>
              <label className="text-[0.65rem] font-bold uppercase text-slate-400 block mb-1">Observation Description</label>
              <textarea
                required
                rows={3}
                placeholder="Describe current situation, water depth, whether people are stranded, etc."
                value={incidentForm.description}
                onChange={e => setIncidentForm({ ...incidentForm, description: e.target.value })}
                className={`w-full rounded-xl p-2.5 border ${inputBg}`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[0.65rem] font-bold uppercase text-slate-400 block mb-1">Your Name (Optional)</label>
                <input
                  type="text"
                  placeholder="Anonymous or Full Name"
                  value={incidentForm.reporter_name}
                  onChange={e => setIncidentForm({ ...incidentForm, reporter_name: e.target.value })}
                  className={`w-full rounded-xl p-2.5 border ${inputBg}`}
                />
              </div>

              <div>
                <label className="text-[0.65rem] font-bold uppercase text-slate-400 block mb-1">Contact Phone (For verification)</label>
                <input
                  type="tel"
                  placeholder="+91-XXXXXXXXXX"
                  value={incidentForm.reporter_phone}
                  onChange={e => setIncidentForm({ ...incidentForm, reporter_phone: e.target.value })}
                  className={`w-full rounded-xl p-2.5 border ${inputBg}`}
                />
              </div>
            </div>

            <button
              type="submit"
              className="py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs transition-all cursor-pointer shadow"
            >
              Submit Community Incident Report
            </button>

            {incidentSubmitted && (
              <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-center">
                ✓ Report logged successfully! Stored for emergency administration review.
              </div>
            )}
          </form>

          {/* Recent Community Incident Reports */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-black uppercase text-slate-300">
              Recent Logged Community Incident Observations ({communityIncidents.length}):
            </h4>
            {communityIncidents.length === 0 ? (
              <div className="p-6 rounded-2xl bg-black/20 text-center text-xs text-slate-400">
                No active community incident reports for {district}.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {communityIncidents.map(inc => (
                  <div key={inc.id} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between gap-2">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="font-extrabold text-sm text-white">{inc.location_details}</span>
                        <span className="px-2 py-0.5 rounded text-[0.62rem] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {inc.status}
                        </span>
                      </div>
                      <p className="text-[0.72rem] text-slate-300 mt-1">{inc.description}</p>
                    </div>

                    <div className="text-[0.62rem] text-amber-400/80 italic border-t border-slate-800 pt-1.5">
                      ⚠️ {inc.disclaimer}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 9: OFFICIAL SOURCES DOCUMENTATION REGISTRY
          ===================================================================== */}
      {activeTab === 'sources' && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-400" />
              Official Emergency Warning Integrations & Source Transparency
            </h3>
            <p className={`text-xs ${subText}`}>
              Detailed technical specification of all official government alerting authorities integrated into ODISHA WRI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sourcesInfo?.official_sources?.map(src => (
              <div key={src.source_code} className={`${cardBg} rounded-3xl p-5 border border-slate-800 flex flex-col justify-between gap-3 text-xs`}>
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[0.65rem] font-black uppercase text-blue-400">{src.source_code}</span>
                    <span className="px-2 py-0.5 rounded-full text-[0.62rem] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {src.verification_status}
                    </span>
                  </div>
                  <h4 className="text-base font-black text-white mt-1 leading-tight">{src.authority_name}</h4>
                  <div className="text-[0.72rem] text-slate-300 mt-1">{src.domain}</div>

                  <div className="my-3 space-y-1.5 text-[0.7rem] text-slate-400">
                    <div><strong className="text-slate-300">Format:</strong> {src.data_format}</div>
                    <div><strong className="text-slate-300">Update Frequency:</strong> {src.update_frequency}</div>
                    <div><strong className="text-slate-300">Geographic Coverage:</strong> {src.geographic_coverage}</div>
                    <div><strong className="text-slate-300">Freshness:</strong> {src.data_freshness}</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/30 border border-slate-800 text-[0.68rem] text-slate-300">
                    <strong className="text-amber-400">Known Limitations: </strong>
                    {src.known_limitations}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
