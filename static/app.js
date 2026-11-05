document.addEventListener('DOMContentLoaded', () => {
    // 1. Element References
    const appBody = document.getElementById('app-body');
    const dynamicBg = document.getElementById('dynamic-bg');
    const ambientGlow = document.getElementById('ambient-glow');
    const dayNightBadge = document.getElementById('day-night-badge');
    const dayNightIcon = document.getElementById('day-night-icon');
    const dayNightText = document.getElementById('day-night-text');

    const themeAutoBtn = document.getElementById('theme-auto');
    const themeDayBtn = document.getElementById('theme-day');
    const themeNightBtn = document.getElementById('theme-night');

    const analyzeBtn = document.getElementById('analyze-btn');
    const districtSelect = document.getElementById('district-select');
    const gpsBtn = document.getElementById('gps-btn');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorBanner = document.getElementById('error-banner');
    const errorMessage = document.getElementById('error-message');
    const resultsSection = document.getElementById('results-section');

    const wriCard = document.getElementById('wri-card');
    const districtDisplay = document.getElementById('district-display');
    const riskBadge = document.getElementById('risk-badge');
    const wriScore = document.getElementById('wri-score');
    const wriAdvice = document.getElementById('wri-advice');
    const scoreDirectionLabel = document.getElementById('score-direction-label');

    const metricSunrise = document.getElementById('metric-sunrise');
    const metricSunset = document.getElementById('metric-sunset');
    const metricRain = document.getElementById('metric-rain');
    const metricCondition = document.getElementById('metric-condition');
    const metricTemp = document.getElementById('metric-temp');
    const metricTempRange = document.getElementById('metric-temp-range');
    const metricWind = document.getElementById('metric-wind');
    const metricPressure = document.getElementById('metric-pressure');
    const metricThi = document.getElementById('metric-thi');
    const metricSpatial = document.getElementById('metric-spatial');

    const totalPenalties = document.getElementById('total-penalties');
    const barRain = document.getElementById('bar-rain');
    const barHeat = document.getElementById('bar-heat');
    const barWind = document.getElementById('bar-wind');
    const valRain = document.getElementById('val-rain');
    const valHeat = document.getElementById('val-heat');
    const valWind = document.getElementById('val-wind');

    const preliminaryNotice = document.getElementById('preliminary-notice');
    const timestampNotice = document.getElementById('timestamp-notice');

    // State Variables
    let currentThemeMode = 'auto'; // 'auto' | 'day' | 'night'
    let lastApiIsDaytime = false;
    let currentData = null;

    // 2. Initialize Lucide Icons
    if (window.lucide) {
        lucide.createIcons();
    }

    // 3. Populate 30 Districts from Backend API
    async function loadDistricts() {
        try {
            const resp = await fetch('/api/districts');
            if (!resp.ok) throw new Error('Districts API unavailable');
            const data = await resp.json();
            
            districtSelect.innerHTML = '';
            data.districts.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.name;
                opt.textContent = `${d.name} (${d.coast_km} km coast)`;
                districtSelect.appendChild(opt);
            });

            // Default to Khurda (Bhubaneswar)
            districtSelect.value = 'Khurda (Bhubaneswar)';
            fetchPrediction({ district: 'Khurda (Bhubaneswar)' });
        } catch (err) {
            console.warn('Fallback to default districts:', err);
            districtSelect.innerHTML = `
                <option value="Khurda (Bhubaneswar)">Khurda (Bhubaneswar)</option>
                <option value="Cuttack">Cuttack</option>
                <option value="Puri">Puri</option>
                <option value="Balasore">Balasore</option>
                <option value="Sundargarh">Sundargarh</option>
                <option value="Sambalpur">Sambalpur</option>
                <option value="Koraput">Koraput</option>
            `;
            fetchPrediction({ district: 'Khurda (Bhubaneswar)' });
        }
    }
    loadDistricts();

    // 4. Day / Night Theme Application
    function applyTheme() {
        const isDay = (currentThemeMode === 'auto') ? lastApiIsDaytime : (currentThemeMode === 'day');

        // Update Theme Button Active States
        [themeAutoBtn, themeDayBtn, themeNightBtn].forEach(b => {
            b.className = 'px-2 py-1 rounded-lg text-slate-400 hover:text-white transition-all flex items-center gap-0.5';
        });

        if (currentThemeMode === 'auto') {
            themeAutoBtn.className = 'px-2 py-1 rounded-lg bg-blue-600 text-white font-bold shadow-sm';
        } else if (currentThemeMode === 'day') {
            themeDayBtn.className = 'px-2 py-1 rounded-lg bg-amber-500 text-white font-bold shadow-sm flex items-center gap-0.5';
        } else {
            themeNightBtn.className = 'px-2 py-1 rounded-lg bg-indigo-600 text-white font-bold shadow-sm flex items-center gap-0.5';
        }

        if (isDay) {
            appBody.classList.remove('theme-night');
            appBody.classList.add('theme-day');

            dynamicBg.className = 'fixed inset-0 z-0 transition-all duration-1000 ease-in-out bg-gradient-to-br from-sky-100 via-blue-50 to-amber-50/50';
            ambientGlow.className = 'fixed inset-0 z-0 opacity-40 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-300 via-blue-100 to-transparent pointer-events-none transition-all duration-1000';

            dayNightBadge.className = 'text-[0.65rem] font-bold px-2 py-0.5 rounded-full border border-amber-300 bg-amber-100 text-amber-800 flex items-center gap-1';
            dayNightIcon.setAttribute('data-lucide', 'sun');
            dayNightIcon.className = 'w-3 h-3 text-amber-600';
            dayNightText.textContent = 'DAYTIME';
        } else {
            appBody.classList.remove('theme-day');
            appBody.classList.add('theme-night');

            dynamicBg.className = 'fixed inset-0 z-0 transition-all duration-1000 ease-in-out bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950';
            ambientGlow.className = 'fixed inset-0 z-0 opacity-25 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-700 via-transparent to-transparent pointer-events-none transition-all duration-1000';

            dayNightBadge.className = 'text-[0.65rem] font-bold px-2 py-0.5 rounded-full border border-indigo-500/40 bg-indigo-950/60 text-indigo-300 flex items-center gap-1';
            dayNightIcon.setAttribute('data-lucide', 'moon');
            dayNightIcon.className = 'w-3 h-3 text-indigo-400';
            dayNightText.textContent = 'NIGHTTIME';
        }

        if (window.lucide) {
            lucide.createIcons();
        }
    }

    // Theme Switcher Handlers
    themeAutoBtn.addEventListener('click', () => { currentThemeMode = 'auto'; applyTheme(); });
    themeDayBtn.addEventListener('click', () => { currentThemeMode = 'day'; applyTheme(); });
    themeNightBtn.addEventListener('click', () => { currentThemeMode = 'night'; applyTheme(); });

    // 5. Predict API Invocation
    async function fetchPrediction(payload) {
        errorBanner.classList.add('hidden');
        loadingIndicator.classList.remove('hidden');
        loadingIndicator.classList.add('flex');
        analyzeBtn.disabled = true;

        try {
            const resp = await fetch('/api/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!resp.ok) {
                const errJson = await resp.json().catch(() => ({}));
                throw new Error(errJson.detail || `Server returned error (${resp.status})`);
            }

            const data = await resp.json();
            currentData = data;
            lastApiIsDaytime = Boolean(data.weather?.is_daytime);

            applyTheme();
            updateUI(data);

        } catch (err) {
            errorMessage.textContent = err.message || 'Error communicating with weather server.';
            errorBanner.classList.remove('hidden');
        } finally {
            loadingIndicator.classList.add('hidden');
            loadingIndicator.classList.remove('flex');
            analyzeBtn.disabled = false;
        }
    }

    // 6. UI Update Renderer
    function updateUI(data) {
        const w = data.weather;
        const p = data.prediction || {};
        const score = p.safety_score !== undefined ? p.safety_score : (data.wri?.wri_score || 0.0);
        const zone = p.risk_zone || data.wri?.zone || 'GREEN';

        // District & Zone
        districtDisplay.textContent = data.district || 'Selected Location';
        if (data.district && districtSelect.value !== data.district) {
            for (let opt of districtSelect.options) {
                if (opt.value === data.district) {
                    districtSelect.value = data.district;
                    break;
                }
            }
        }

        // Zone Styling Mapping
        const zoneClasses = {
            GREEN: {
                badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
                border: 'border-emerald-500',
                text: 'text-emerald-400'
            },
            YELLOW: {
                badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                border: 'border-amber-500',
                text: 'text-amber-400'
            },
            ORANGE: {
                badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
                border: 'border-orange-500',
                text: 'text-orange-400'
            },
            RED: {
                badge: 'bg-red-500/20 text-red-400 border-red-500/30',
                border: 'border-red-500',
                text: 'text-red-400'
            }
        };
        const activeZ = zoneClasses[zone] || zoneClasses.GREEN;

        riskBadge.className = `px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${activeZ.badge}`;
        riskBadge.textContent = p.predicted_risk_level || zone;

        wriCard.className = `glass-panel rounded-3xl p-6 text-center relative overflow-hidden transition-all duration-700 border-t-4 ${activeZ.border}`;
        wriScore.className = `text-[5rem] sm:text-[5.5rem] leading-none font-black tracking-tight drop-shadow-md ${activeZ.text}`;
        wriAdvice.textContent = p.advice || data.wri?.advice || 'Standard caution advised.';
        scoreDirectionLabel.textContent = p.score_direction || 'Higher means safer';

        // Animate Score Count
        animateValue(wriScore, 0, score, 1000);

        // Sun & Atmosphere
        metricSunrise.textContent = w.sunrise || '--';
        metricSunset.textContent = w.sunset || '--';

        // Telemetry Grid
        metricRain.textContent = w.rainfall_percentage || `${Math.round((w.rainfall_probability || 0) * 100)}%`;
        metricCondition.textContent = w.condition || 'Atmosphere Steady';
        metricTemp.textContent = `${w.temperature_c}°C`;
        metricTempRange.textContent = `High ${w.temperature_max_c}°C • Low ${w.temperature_min_c}°C`;
        metricWind.textContent = `${w.wind_speed_kmh} km/h`;
        metricPressure.textContent = `${w.surface_pressure_hpa} hPa (${w.pressure_delta_24h_hpa >= 0 ? '+' : ''}${w.pressure_delta_24h_hpa} 24h)`;
        
        const thiVal = p.meteorological_indices?.thi ?? data.meteorological_features?.engineered?.thi;
        metricThi.textContent = `THI ${thiVal}`;
        const elev = data.spatial_features?.elevation_m ?? data.meteorological_features?.elevation_m;
        const coast = data.spatial_features?.dist_to_coast_km ?? data.meteorological_features?.dist_to_coast_km;
        metricSpatial.textContent = `${elev}m elev • ${coast}km coast`;

        // Penalties Breakdown
        const penalties = p.penalties || data.wri?.penalties || { rain: 0, heat: 0, wind: 0, total: 0 };
        const rainPen = penalties.rain !== undefined ? Number(penalties.rain) : 0;
        const heatPen = penalties.heat !== undefined ? Number(penalties.heat) : 0;
        const windPen = penalties.wind !== undefined ? Number(penalties.wind) : 0;
        const totalPen = (penalties.total !== undefined ? Number(penalties.total) : (rainPen + heatPen + windPen)).toFixed(2);

        totalPenalties.textContent = `Total Deductions: -${totalPen} pts`;
        valRain.textContent = `-${rainPen.toFixed(2)} pts`;
        valHeat.textContent = `-${heatPen.toFixed(2)} pts`;
        valWind.textContent = `-${windPen.toFixed(2)} pts`;

        // Progressive Bar Widths (max values: rain 4.5, heat 4.0, wind 3.0)
        barRain.style.width = `${Math.min(100, (rainPen / 4.5) * 100)}%`;
        barHeat.style.width = `${Math.min(100, (heatPen / 4.0) * 100)}%`;
        barWind.style.width = `${Math.min(100, (windPen / 3.0) * 100)}%`;

        // Notice and Timestamps
        preliminaryNotice.textContent = p.preliminary_indicator_notice || 'Estimated preliminary risk indicator based on current meteorological factors and trained ML weather model.';
        const obsTime = w.observation_time ? new Date(w.observation_time).toLocaleTimeString() : new Date().toLocaleTimeString();
        timestampNotice.textContent = `Observed at ${obsTime} (${w.timezone || 'Asia/Kolkata'})${data.cache_hit ? ' • (Cached)' : ''}`;

        // Reveal Results Section with Slide Up Transition
        resultsSection.classList.remove('hidden');
        resultsSection.classList.add('flex');
        void resultsSection.offsetWidth; // Force Reflow
        resultsSection.classList.remove('opacity-0', 'translate-y-6');
        resultsSection.classList.add('opacity-100', 'translate-y-0');

        if (window.lucide) {
            lucide.createIcons();
        }
    }

    // Number Ticker Animation
    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = start + easeOut * (end - start);
            obj.textContent = current.toFixed(1);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                obj.textContent = end.toFixed(1);
            }
        };
        window.requestAnimationFrame(step);
    }

    // User Event Listeners
    analyzeBtn.addEventListener('click', () => {
        const dist = districtSelect.value;
        if (!dist) {
            alert('Please select a district.');
            return;
        }
        fetchPrediction({ district: dist });
    });

    districtSelect.addEventListener('change', () => {
        const dist = districtSelect.value;
        if (dist) {
            fetchPrediction({ district: dist });
        }
    });

    gpsBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
            alert('Geolocation not supported on this device.');
            return;
        }
        loadingIndicator.classList.remove('hidden');
        loadingIndicator.classList.add('flex');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                fetchPrediction({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude
                });
            },
            (err) => {
                loadingIndicator.classList.add('hidden');
                loadingIndicator.classList.remove('flex');
                alert('Unable to acquire GPS location. Please select a district from the dropdown.');
            },
            { timeout: 10000 }
        );
    });
});
