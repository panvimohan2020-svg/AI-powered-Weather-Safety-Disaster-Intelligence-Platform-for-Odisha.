import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Layers, ShieldCheck, CheckCircle2, TrendingUp, 
  AlertTriangle, Radio, Cpu, BatteryCharging, Wind, Thermometer, Droplets 
} from 'lucide-react';

export default function ModelResearchSection({ apiBase, subText }) {
  const [modelInfo, setModelInfo] = useState(null);
  const [iotStations, setIotStations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${apiBase}/api/model-info`).then(res => res.ok ? res.json() : null),
      fetch(`${apiBase}/api/iot/stations`).then(res => res.ok ? res.json() : null)
    ])
      .then(([mInfo, iotData]) => {
        if (mInfo && mInfo.selected_champion) {
          setModelInfo(mInfo);
        }
        if (iotData && iotData.stations) {
          setIotStations(iotData.stations);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [apiBase]);

  if (loading || !modelInfo) {
    return (
      <div className="p-6 rounded-2xl bg-black/10 text-center text-xs text-slate-400">
        Loading ML research benchmarks & cross-validation metrics...
      </div>
    );
  }

  const benchmarks = modelInfo.benchmark_results || [];
  const regimes = modelInfo.regime_breakdown || {};
  const crossVal = modelInfo.cross_validation || {};
  const trainingData = modelInfo.training_data || {};

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Title & Methodology Overview */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-black uppercase tracking-wider">
            CSE-AIML Research & Model Validation Benchmarks
          </h3>
          <span className="text-[0.65rem] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">
            {modelInfo.model_version}
          </span>
        </div>
        <p className={`text-xs ${subText}`}>
          Empirical evaluation on a chronological holdout year (2023) across 30 Odisha districts with spatial cross-validation.
        </p>
      </div>

      {/* Model Benchmark Comparison Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-700/60 bg-slate-900/40">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-800/80 text-[0.68rem] uppercase font-bold text-slate-400 border-b border-slate-700">
            <tr>
              <th className="py-2.5 px-3">Model Architecture</th>
              <th className="py-2.5 px-3">F1 Score</th>
              <th className="py-2.5 px-3">Recall (Rain)</th>
              <th className="py-2.5 px-3">Precision</th>
              <th className="py-2.5 px-3">ROC-AUC</th>
              <th className="py-2.5 px-3">Brier Score Loss</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-[0.75rem]">
            {benchmarks.map((m, idx) => {
              const isChampion = m.model.includes('Champion');
              return (
                <tr key={idx} className={isChampion ? 'bg-blue-500/10 font-bold text-white' : ''}>
                  <td className="py-2 px-3 font-sans flex items-center gap-1.5">
                    {isChampion && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                    <span>{m.model}</span>
                  </td>
                  <td className="py-2 px-3">{m.f1_score.toFixed(4)}</td>
                  <td className="py-2 px-3">{m.recall.toFixed(4)}</td>
                  <td className="py-2 px-3">{m.precision.toFixed(4)}</td>
                  <td className="py-2 px-3">{m.roc_auc.toFixed(4)}</td>
                  <td className="py-2 px-3 text-emerald-400">{m.brier_score_loss.toFixed(4)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 3-Way Grid: Cross Validation, Regimes, Training Specs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {/* Spatial Cross-Validation */}
        <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-700/60 flex flex-col justify-between">
          <div>
            <div className={`text-[0.65rem] font-bold uppercase ${subText}`}>Spatial Cross-Validation</div>
            <div className="text-base font-black text-white mt-1">
              GroupKFold (5 Splits)
            </div>
            <p className={`text-[0.7rem] ${subText} mt-1`}>
              Validates generalization to unseen districts, preventing spatial data leakage.
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between font-mono text-sm">
            <span>Mean ROC-AUC:</span>
            <span className="font-bold text-emerald-400">{crossVal.mean_roc_auc} (±{crossVal.std_roc_auc})</span>
          </div>
        </div>

        {/* Meteorological Regimes Breakdown */}
        <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-700/60 flex flex-col justify-between">
          <div>
            <div className={`text-[0.65rem] font-bold uppercase ${subText}`}>Regime Error Analysis</div>
            <div className="text-base font-black text-white mt-1">
              Hazard Slices
            </div>
            <p className={`text-[0.7rem] ${subText} mt-1`}>
              Model performance segmented across rainy, heatwave, and ordinary days.
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 space-y-1 font-mono text-[0.72rem]">
            <div className="flex justify-between">
              <span>Rainy Days Recall:</span>
              <span className="font-bold text-blue-400">{regimes.rainy_conditions?.recall ? (regimes.rainy_conditions.recall * 100).toFixed(1) : 0}%</span>
            </div>
            <div className="flex justify-between">
              <span>Heatwave Accuracy:</span>
              <span className="font-bold text-amber-400">{regimes.heatwave_conditions?.accuracy ? (regimes.heatwave_conditions.accuracy * 100).toFixed(1) : 0}%</span>
            </div>
            <div className="flex justify-between">
              <span>Mild Days Accuracy:</span>
              <span className="font-bold text-emerald-400">{regimes.ordinary_conditions?.accuracy ? (regimes.ordinary_conditions.accuracy * 100).toFixed(1) : 0}%</span>
            </div>
          </div>
        </div>

        {/* Feature Engineering & Data Integrity */}
        <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-700/60 flex flex-col justify-between">
          <div>
            <div className={`text-[0.65rem] font-bold uppercase ${subText}`}>Dataset & Features</div>
            <div className="text-base font-black text-white mt-1">
              {trainingData.total_records ? trainingData.total_records.toLocaleString() : '54,750'} Records
            </div>
            <p className={`text-[0.7rem] ${subText} mt-1`}>
              30 districts • 18 engineered features including VPD, DTR, THI, Moisture Flux, and Cyclical Day of Year.
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 text-[0.7rem] flex justify-between font-mono">
            <span>Holdout Test Period:</span>
            <span className="font-bold text-slate-300">{trainingData.test_range}</span>
          </div>
        </div>
      </div>

      {/* IoT-Based Hyperlocal Weather Monitoring Network & Ground-Truth Validation */}
      {iotStations && iotStations.length > 0 && (
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-black uppercase tracking-wider text-white">
                  IoT-Based Hyperlocal Weather Monitoring Network (OHMWN)
                </h4>
                <span className="text-[0.62rem] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  {iotStations.length} Active AWS Nodes
                </span>
              </div>
              <p className={`text-xs ${subText} mt-0.5`}>
                Ground-truth micro-climate telemetry validating regional ML predictions and calibrating continuous Workability Risk scores.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {iotStations.map(st => {
              const tel = st.latest_telemetry || {};
              return (
                <div 
                  key={st.station_id} 
                  className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-700/60 flex flex-col justify-between hover:border-emerald-500/40 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="font-mono text-[0.68rem] text-slate-400 font-bold">
                        {st.station_id}
                      </span>
                      <span className="text-[0.62rem] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {st.status}
                      </span>
                    </div>

                    <h5 className="text-xs font-black text-white leading-snug">
                      {st.station_name}
                    </h5>
                    <div className="text-[0.68rem] text-slate-400 mt-0.5">
                      📍 {st.subdivision}, {st.district} ({st.elevation_m}m MSL)
                    </div>

                    {/* Sensor Telemetry Pill Matrix */}
                    <div className="grid grid-cols-3 gap-1.5 mt-3 text-center">
                      <div className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700">
                        <div className="text-[0.6rem] text-slate-400">Temp</div>
                        <div className="font-mono font-bold text-xs text-amber-300">{tel.temperature_c ?? '--'}°C</div>
                      </div>
                      <div className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700">
                        <div className="text-[0.6rem] text-slate-400">Humidity</div>
                        <div className="font-mono font-bold text-xs text-cyan-300">{tel.humidity_rh ?? '--'}%</div>
                      </div>
                      <div className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700">
                        <div className="text-[0.6rem] text-slate-400">Wind</div>
                        <div className="font-mono font-bold text-xs text-slate-200">{tel.wind_speed_kmh ?? '--'} km/h</div>
                      </div>
                    </div>
                  </div>

                  {/* Hardware Specs & Telemetry Health */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800 text-[0.65rem] text-slate-400 flex items-center justify-between">
                    <span className="truncate max-w-[170px]" title={st.hardware_spec?.mcu}>
                      ⚡ {st.hardware_spec?.mcu?.split('(')[0] || 'ESP32 AWS Node'}
                    </span>
                    <span className="font-mono text-emerald-400 font-bold flex items-center gap-1">
                      <BatteryCharging className="w-3 h-3" />
                      {tel.battery_volts ?? 4.1}V
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Scientific Limitation Disclaimer */}
      <div className="p-3.5 rounded-xl bg-black/30 border border-slate-800 text-[0.7rem] text-slate-400 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-300">Academic & Practical Disclaimer: </strong>
          {modelInfo.scientific_disclaimer}
        </div>
      </div>
    </div>
  );
}
