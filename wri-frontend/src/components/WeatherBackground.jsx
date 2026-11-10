import React, { useEffect, useRef, useMemo } from 'react';

/**
 * Beautiful, Dynamic Weather-Responsive Atmospheric Background Engine
 * 
 * Features:
 * - 7 Distinct Weather Animation Modes:
 *   1. ☀️ Sunny/Clear: Rotating sun rays, warm corona glow, drifting golden motes.
 *   2. 🌧️ Rainy: Realistic falling rain streaks with ground impact splashes.
 *   3. ⛈️ Thunderstorm: High-speed slanted rain, ground ripples, occasional soft ambient lightning.
 *   4. ❄️ Cold/Snow: Fluttering snowflakes with sinusoidal drift & cold frost shimmer.
 *   5. 💨 Windy: Streaming aerodynamic wind streaks & tumbling foliage breeze motes.
 *   6. 🌫️ Foggy: Soft layered drifting mist banks with feather-edged opacity waves.
 *   7. ☁️ Cloudy: Multi-layered soft drifting cumulus cloud decks.
 * - Auto-Detection: Driven directly by live meteorological observations and WMO codes.
 * - Layer Isolation: Strictly background (-z-10, pointer-events-none). Zero interference with UI.
 * - Text Contrast Preservation: Deep atmospheric gradient base + contrast radial vignette (WCAG AAA).
 * - Accessibility & Performance: Respects prefers-reduced-motion, pauses when tab is hidden.
 */
export default function WeatherBackground({ 
  weatherCode = 0, 
  isDaytime = true, 
  temperature = 30,
  windSpeed = 10,
  condition = '',
  conditionGroup = '',
  humidity = 60,
  sunriseIso = null,
  sunsetIso = null
}) {
  const canvasRef = useRef(null);

  // Automatically resolve the atmospheric mode from live weather telemetry
  const weatherMode = useMemo(() => {
    const code = Number(weatherCode);
    const cond = (condition || '').toLowerCase();
    const group = (conditionGroup || '').toLowerCase();
    const temp = Number(temperature);
    const wind = Number(windSpeed);

    // 1. Thunderstorm: WMO 95, 96, 99 or heavy storm codes or condition keyword
    if (
      [95, 96, 99].includes(code) || 
      cond.includes('thunder') || 
      cond.includes('lightning') || 
      cond.includes('storm') || 
      group === 'thunderstorm'
    ) {
      return 'thunderstorm';
    }

    // 2. Cold / Snow: WMO 71, 73, 75, 77, 85, 86 or temp < 14°C or snow/frost keyword
    // (Models Odisha's highland winter mornings in Koraput / Daringbadi where temp drops to 7-12°C)
    if (
      [71, 73, 75, 77, 85, 86].includes(code) || 
      cond.includes('snow') || 
      cond.includes('frost') || 
      cond.includes('ice') || 
      cond.includes('blizzard') ||
      temp < 14.0
    ) {
      return 'snow';
    }

    // 3. Rain / Showers: WMO 51, 53, 55, 61, 63, 65, 80, 81, 82 or rain keyword
    if (
      [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code) || 
      cond.includes('rain') || 
      cond.includes('drizzle') || 
      cond.includes('shower') || 
      group === 'rain'
    ) {
      return [65, 82].includes(code) ? 'heavy_rain' : 'rain';
    }

    // 4. Foggy / Mist / Haze: WMO 45, 48 or mist/fog keyword
    if (
      [45, 48].includes(code) || 
      cond.includes('fog') || 
      cond.includes('mist') || 
      cond.includes('haze') || 
      cond.includes('smok') || 
      group === 'fog'
    ) {
      return 'fog';
    }

    // 5. Windy / Gale: Wind speed >= 24 km/h or wind keyword
    if (
      wind >= 24.0 || 
      cond.includes('wind') || 
      cond.includes('squall') || 
      cond.includes('gale') || 
      group === 'windy'
    ) {
      return 'windy';
    }

    // 6. Cloudy / Overcast: WMO 2, 3 or cloud/overcast keyword
    if (
      [2, 3].includes(code) || 
      cond.includes('cloud') || 
      cond.includes('overcast') || 
      group === 'cloudy'
    ) {
      return isDaytime ? 'cloudy' : 'cloudy_night';
    }

    // 7. Twilight Window (within 40 minutes of sunrise or sunset during clear sky)
    if (sunriseIso && sunsetIso) {
      try {
        const now = new Date().getTime();
        const srTime = new Date(sunriseIso).getTime();
        const ssTime = new Date(sunsetIso).getTime();
        const srDiff = Math.abs(now - srTime) / 60000;
        const ssDiff = Math.abs(now - ssTime) / 60000;
        if (srDiff <= 40 || ssDiff <= 40) {
          return 'twilight';
        }
      } catch (e) {}
    }

    // 8. Default Sunny Day or Celestial Night
    return isDaytime ? 'sunny' : 'night';
  }, [weatherCode, isDaytime, temperature, windSpeed, condition, conditionGroup, sunriseIso, sunsetIso]);

  // High-Performance Multi-Particle Canvas Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Respect user's reduced-motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Track tab visibility to pause animation loops when not visible
    let isTabVisible = !document.hidden;
    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible && !animationFrameId) {
        animationFrameId = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initialize particle arrays
    let particles = [];
    let splashes = [];
    let lightningTimer = 0;
    let lightningFlash = 0;

    // 1. Rain / Storm particle configuration
    if (['rain', 'heavy_rain', 'thunderstorm'].includes(weatherMode)) {
      const isHeavy = weatherMode === 'heavy_rain' || weatherMode === 'thunderstorm';
      const rainCount = isHeavy ? 110 : 70;
      for (let i = 0; i < rainCount; i++) {
        particles.push({
          x: Math.random() * (width + 100),
          y: Math.random() * height,
          length: isHeavy ? 16 + Math.random() * 12 : 10 + Math.random() * 8,
          speed: isHeavy ? 14 + Math.random() * 8 : 9 + Math.random() * 5,
          slant: isHeavy ? -2.2 : -1.2,
          opacity: 0.18 + Math.random() * 0.35,
          isForeground: Math.random() > 0.6
        });
      }
    }

    // 2. Snow / Cold Frost particles
    else if (weatherMode === 'snow') {
      const snowCount = 65;
      for (let i = 0; i < snowCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: 1.2 + Math.random() * 3.0,
          speed: 0.8 + Math.random() * 1.6,
          wobble: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.015 + Math.random() * 0.025,
          opacity: 0.25 + Math.random() * 0.55
        });
      }
      // Add crystalline frost glitter
      for (let i = 0; i < 20; i++) {
        particles.push({
          type: 'frost',
          x: Math.random() * width,
          y: Math.random() * height,
          radius: 0.8 + Math.random() * 1.2,
          alpha: Math.random(),
          speed: 0.02 + Math.random() * 0.03
        });
      }
    }

    // 3. Windy particles (speed streaks & tumbling leaves)
    else if (weatherMode === 'windy') {
      const windStreakCount = 40;
      for (let i = 0; i < windStreakCount; i++) {
        particles.push({
          type: 'streak',
          x: Math.random() * width,
          y: Math.random() * height,
          length: 40 + Math.random() * 65,
          speed: 14 + Math.random() * 10,
          opacity: 0.12 + Math.random() * 0.22,
          wave: Math.random() * Math.PI * 2
        });
      }
      const leafCount = 18;
      for (let i = 0; i < leafCount; i++) {
        particles.push({
          type: 'leaf',
          x: Math.random() * width,
          y: Math.random() * height,
          speedX: 6 + Math.random() * 6,
          speedY: (Math.random() - 0.5) * 1.5,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.08,
          size: 2.5 + Math.random() * 2.5,
          opacity: 0.25 + Math.random() * 0.35
        });
      }
    }

    // 4. Foggy diffuse mist puffs
    else if (weatherMode === 'fog') {
      const fogCount = 28;
      for (let i = 0; i < fogCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: 60 + Math.random() * 80,
          speedX: 0.2 + Math.random() * 0.35,
          pulse: Math.random() * Math.PI * 2,
          alpha: 0.035 + Math.random() * 0.045
        });
      }
    }

    // 5. Sunny & Twilight golden motes
    else if (weatherMode === 'sunny' || weatherMode === 'twilight') {
      const moteCount = 30;
      for (let i = 0; i < moteCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: 1.2 + Math.random() * 2.0,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -Math.random() * 0.45 - 0.15,
          alpha: 0.18 + Math.random() * 0.32
        });
      }
    }

    // 6. Cloudy atmospheric vapor
    else if (weatherMode === 'cloudy' || weatherMode === 'cloudy_night') {
      const vaporCount = 22;
      for (let i = 0; i < vaporCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * (height * 0.65),
          radius: 35 + Math.random() * 45,
          speedX: 0.15 + Math.random() * 0.3,
          alpha: 0.03 + Math.random() * 0.04
        });
      }
    }

    // 7. Night celestial stars
    else if (weatherMode === 'night') {
      const starCount = 65;
      for (let i = 0; i < starCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * (height * 0.85),
          radius: 0.6 + Math.random() * 1.4,
          alpha: Math.random(),
          speed: 0.015 + Math.random() * 0.03
        });
      }
    }

    // Animation Render Loop
    const render = () => {
      if (!isTabVisible) {
        animationFrameId = null;
        return;
      }

      ctx.clearRect(0, 0, width, height);

      // --- Thunderstorm Lightning Flash (WCAG 2.3.1 Safe spaced) ---
      if (weatherMode === 'thunderstorm') {
        lightningTimer++;
        if (lightningTimer > 320 && Math.random() < 0.012) {
          lightningFlash = 0.20; // Gentle ambient flash, non-strobing
          lightningTimer = 0;
        }
        if (lightningFlash > 0) {
          ctx.fillStyle = `rgba(215, 230, 255, ${lightningFlash})`;
          ctx.fillRect(0, 0, width, height);
          lightningFlash -= 0.012;
        }
      }

      // --- Render Rain & Splashes ---
      if (['rain', 'heavy_rain', 'thunderstorm'].includes(weatherMode)) {
        ctx.strokeStyle = weatherMode === 'thunderstorm' 
          ? 'rgba(190, 218, 255, 0.45)' 
          : 'rgba(210, 230, 255, 0.35)';
        ctx.lineWidth = weatherMode === 'heavy_rain' || weatherMode === 'thunderstorm' ? 1.6 : 1.2;
        ctx.beginPath();
        
        for (let p of particles) {
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.slant, p.y + p.length);
          p.y += p.speed;
          p.x += p.slant;

          if (p.y > height) {
            // Spawn subtle ground impact splash
            if (splashes.length < 25 && Math.random() < 0.35) {
              splashes.push({
                x: p.x,
                y: height - 2,
                vx: (Math.random() - 0.5) * 2.5,
                vy: -Math.random() * 2.0 - 0.8,
                alpha: 0.4,
                radius: 1.0
              });
            }
            p.y = -p.length;
            p.x = Math.random() * (width + 100);
          }
        }
        ctx.stroke();

        // Update and draw splashes
        for (let i = splashes.length - 1; i >= 0; i--) {
          const s = splashes[i];
          s.x += s.vx;
          s.y += s.vy;
          s.vy += 0.15; // gravity
          s.alpha -= 0.035;

          if (s.alpha <= 0) {
            splashes.splice(i, 1);
            continue;
          }

          ctx.fillStyle = `rgba(215, 235, 255, ${s.alpha})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // --- Render Snow & Frost ---
      else if (weatherMode === 'snow') {
        for (let p of particles) {
          if (p.type === 'frost') {
            p.alpha += p.speed;
            const currentAlpha = Math.abs(Math.sin(p.alpha)) * 0.45 + 0.15;
            ctx.fillStyle = `rgba(200, 245, 255, ${currentAlpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
          } else {
            p.wobble += p.wobbleSpeed;
            p.x += Math.sin(p.wobble) * 0.75;
            p.y += p.speed;

            if (p.y > height) {
              p.y = -p.radius * 2;
              p.x = Math.random() * width;
            }

            ctx.fillStyle = `rgba(245, 250, 255, ${p.opacity})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // --- Render Windy Streaks & Leaves ---
      else if (weatherMode === 'windy') {
        // Draw wind aerodynamic streaks
        ctx.strokeStyle = 'rgba(210, 235, 255, 0.22)';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        for (let p of particles) {
          if (p.type === 'streak') {
            p.wave += 0.03;
            const waveOffset = Math.sin(p.wave) * 2;
            ctx.moveTo(p.x, p.y + waveOffset);
            ctx.lineTo(p.x + p.length, p.y + waveOffset * 1.5);
            p.x += p.speed;
            if (p.x > width) {
              p.x = -p.length;
              p.y = Math.random() * height;
            }
          }
        }
        ctx.stroke();

        // Draw tumbling breeze leaves
        for (let p of particles) {
          if (p.type === 'leaf') {
            p.x += p.speedX;
            p.y += Math.sin(p.rotation) * 1.2;
            p.rotation += p.rotSpeed;

            if (p.x > width) {
              p.x = -20;
              p.y = Math.random() * height;
            }

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.fillStyle = `rgba(200, 220, 160, ${p.opacity})`;
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size * 1.8, p.size * 0.8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }

      // --- Render Fog Mist Puffs ---
      else if (weatherMode === 'fog') {
        for (let p of particles) {
          p.x += p.speedX;
          p.pulse += 0.015;
          const currentAlpha = p.alpha + Math.sin(p.pulse) * 0.015;

          if (p.x - p.radius > width) {
            p.x = -p.radius;
            p.y = Math.random() * height;
          }

          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
          grad.addColorStop(0, `rgba(220, 235, 245, ${currentAlpha})`);
          grad.addColorStop(1, 'rgba(220, 235, 245, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // --- Render Sunny Sun Motes ---
      else if (weatherMode === 'sunny' || weatherMode === 'twilight') {
        for (let p of particles) {
          p.x += p.vx;
          p.y += p.vy;

          if (p.y < 0) {
            p.y = height;
            p.x = Math.random() * width;
          }

          ctx.fillStyle = weatherMode === 'twilight' 
            ? `rgba(255, 205, 150, ${p.alpha})` 
            : `rgba(255, 235, 170, ${p.alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // --- Render Cloudy Vapor ---
      else if (weatherMode === 'cloudy' || weatherMode === 'cloudy_night') {
        for (let p of particles) {
          p.x += p.speedX;
          if (p.x - p.radius > width) {
            p.x = -p.radius;
            p.y = Math.random() * (height * 0.65);
          }

          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
          grad.addColorStop(0, `rgba(210, 225, 240, ${p.alpha})`);
          grad.addColorStop(1, 'rgba(210, 225, 240, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // --- Render Night Twinkling Stars ---
      else if (weatherMode === 'night') {
        for (let p of particles) {
          p.alpha += p.speed;
          const currentAlpha = Math.abs(Math.sin(p.alpha)) * 0.65 + 0.15;
          ctx.fillStyle = `rgba(240, 248, 255, ${currentAlpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimationFrame(animationFrameId);
    };
  }, [weatherMode]);

  // High-Fidelity Atmospheric Base Gradients
  const getAtmosphericGradient = () => {
    switch (weatherMode) {
      case 'sunny':
        return 'from-sky-900/40 via-blue-950/60 to-slate-950';
      case 'twilight':
        return 'from-amber-950/45 via-rose-950/35 to-slate-950';
      case 'rain':
        return 'from-slate-900/70 via-blue-950/60 to-slate-950';
      case 'heavy_rain':
        return 'from-slate-950 via-blue-950/75 to-black';
      case 'thunderstorm':
        return 'from-purple-950/70 via-slate-950/80 to-black';
      case 'snow':
        return 'from-cyan-950/45 via-blue-950/40 to-slate-950';
      case 'windy':
        return 'from-teal-950/40 via-slate-900/50 to-slate-950';
      case 'fog':
        return 'from-slate-800/45 via-slate-900/60 to-slate-950';
      case 'cloudy':
        return 'from-slate-800/50 via-slate-900/60 to-slate-950';
      case 'cloudy_night':
        return 'from-slate-900/70 via-black to-slate-950';
      case 'night':
      default:
        return 'from-indigo-950/45 via-slate-900/60 to-slate-950';
    }
  };

  return (
    <div 
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden transition-colors duration-1000"
      aria-hidden="true"
    >
      {/* Sky Atmospheric Gradient Base */}
      <div className={`absolute inset-0 bg-gradient-to-b ${getAtmosphericGradient()} transition-all duration-1000`} />

      {/* Decorative Atmospheric Layers */}
      {/* ☀️ SUNNY: Rotating Sun Rays & Warm Radial Corona */}
      {(weatherMode === 'sunny' || weatherMode === 'twilight') && (
        <div className="absolute -top-24 -right-24 w-[32rem] h-[32rem] pointer-events-none select-none">
          {/* Outer Glow Corona */}
          <div 
            className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400/25 via-yellow-400/15 to-transparent blur-3xl"
            style={{ animation: 'sunCoronaPulse 8s ease-in-out infinite' }}
          />
          
          {/* SVG Rotating Light Rays */}
          <svg 
            className="w-full h-full opacity-35"
            style={{ animation: 'sunRaySpin 120s linear infinite' }}
            viewBox="0 0 200 200"
          >
            <circle cx="100" cy="100" r="30" fill="rgba(253, 224, 71, 0.4)" />
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => (
              <line 
                key={deg} 
                x1="100" y1="100" 
                x2={100 + 95 * Math.cos(deg * Math.PI / 180)} 
                y2={100 + 95 * Math.sin(deg * Math.PI / 180)} 
                stroke="rgba(253, 230, 138, 0.25)" 
                strokeWidth="2.5" 
                strokeDasharray="12,12" 
              />
            ))}
          </svg>
        </div>
      )}

      {/* 🌙 NIGHT: Crescent Lunar Glow Aura */}
      {weatherMode === 'night' && (
        <div className="absolute top-10 right-14 w-28 h-28 rounded-full bg-indigo-300/15 blur-2xl pointer-events-none select-none">
          <div className="w-16 h-16 rounded-full border-t-[3px] border-l-[3px] border-slate-100/70 shadow-[0_0_30px_rgba(255,255,255,0.45)] ml-4 mt-4" />
        </div>
      )}

      {/* ☁️ CLOUDY: Multi-layered soft drifting cumulus clouds */}
      {['cloudy', 'cloudy_night', 'rain', 'heavy_rain', 'thunderstorm'].includes(weatherMode) && (
        <>
          <div 
            className="absolute top-6 -left-36 w-[34rem] h-48 bg-slate-400/10 rounded-full blur-3xl pointer-events-none"
            style={{ animation: 'cloudDriftSlow 65s linear infinite' }}
          />
          <div 
            className="absolute top-20 -right-44 w-[38rem] h-56 bg-slate-500/12 rounded-full blur-3xl pointer-events-none"
            style={{ animation: 'cloudDriftMedium 80s linear infinite' }}
          />
        </>
      )}

      {/* 🌫️ FOGGY: Layered rolling mist sheets */}
      {weatherMode === 'fog' && (
        <>
          <div 
            className="absolute top-1/4 left-0 right-0 h-72 bg-gradient-to-r from-slate-400/10 via-slate-300/18 to-slate-400/10 blur-3xl pointer-events-none"
            style={{ animation: 'fogBankDrift1 30s ease-in-out infinite alternate' }}
          />
          <div 
            className="absolute bottom-1/4 left-0 right-0 h-80 bg-gradient-to-r from-slate-300/15 via-slate-400/22 to-slate-300/15 blur-3xl pointer-events-none"
            style={{ animation: 'fogBankDrift2 38s ease-in-out infinite alternate' }}
          />
        </>
      )}

      {/* 💨 WINDY: Sweeping atmospheric air currents */}
      {weatherMode === 'windy' && (
        <div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/5 to-transparent blur-2xl pointer-events-none"
          style={{ animation: 'windSwoosh 18s ease-in-out infinite' }}
        />
      )}

      {/* ❄️ SNOW / COLD: Frost atmospheric glimmer */}
      {weatherMode === 'snow' && (
        <div 
          className="absolute inset-0 bg-radial-gradient from-cyan-400/5 to-transparent pointer-events-none"
          style={{ animation: 'frostShimmer 6s ease-in-out infinite' }}
        />
      )}

      {/* Dynamic Multi-Particle Canvas Engine */}
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full pointer-events-none" />

      {/* Contrast Preservation Vignette (ensures text readability across light & dark themes) */}
      <div className="absolute inset-0 bg-radial-vignette opacity-50 pointer-events-none" />
    </div>
  );
}
