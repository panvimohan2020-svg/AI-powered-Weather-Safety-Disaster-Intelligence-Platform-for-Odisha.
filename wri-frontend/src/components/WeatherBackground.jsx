import React, { useEffect, useRef, useMemo } from 'react';

/**
 * Dynamic Weather Background Animations
 * Renders subtle, realistic, high-performance weather atmospheres
 * strictly driven by actual weather observations and astronomical times.
 * Supports: Sunny, Cloudy, Rainy, Thunderstorm, Heavy Rain, Nighttime, Sunrise/Sunset.
 * Accessible: respects user motion preferences and manual disable toggle.
 */
export default function WeatherBackground({ 
  weatherCode = 0, 
  isDaytime = true, 
  temperature = 30,
  sunriseIso = null,
  sunsetIso = null,
  animationsEnabled = true 
}) {
  const canvasRef = useRef(null);

  // Determine current atmospheric mode based on actual telemetry
  const weatherMode = useMemo(() => {
    const code = Number(weatherCode);

    // 1. Check for Sunrise/Sunset window (within 45 min of sunrise or sunset)
    const now = new Date();
    if (sunriseIso && sunsetIso) {
      try {
        const srTime = new Date(sunriseIso).getTime();
        const ssTime = new Date(sunsetIso).getTime();
        const nowTime = now.getTime();
        const srDiff = Math.abs(nowTime - srTime) / (60 * 1000);
        const ssDiff = Math.abs(nowTime - ssTime) / (60 * 1000);
        if (srDiff <= 45 || ssDiff <= 45) {
          return 'twilight'; // Sunrise/Sunset golden hour
        }
      } catch (e) {}
    }

    // 2. Thunderstorm WMO codes: 95, 96, 99
    if ([95, 96, 99].includes(code)) return 'thunderstorm';

    // 3. Heavy Rain WMO codes: 65, 82
    if ([65, 82].includes(code)) return 'heavy_rain';

    // 4. Rainy / Drizzle WMO codes: 51, 53, 55, 61, 63, 80, 81
    if ([51, 53, 55, 61, 63, 80, 81].includes(code)) return 'rain';

    // 5. Cloudy / Overcast WMO codes: 2, 3, 45, 48
    if ([2, 3, 45, 48].includes(code)) return isDaytime ? 'cloudy' : 'cloudy_night';

    // 6. Clear / Sunny
    if (isDaytime) return 'sunny';
    return 'night';
  }, [weatherCode, isDaytime, sunriseIso, sunsetIso]);

  // Canvas Rain & Particle Engine
  useEffect(() => {
    if (!animationsEnabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check prefers-reduced-motion
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

    // Particle types setup
    let particles = [];
    const isRain = ['rain', 'heavy_rain', 'thunderstorm'].includes(weatherMode);
    const isSunny = weatherMode === 'sunny' || weatherMode === 'twilight';
    const isNight = weatherMode === 'night';

    const count = weatherMode === 'heavy_rain' ? 120 : (isRain ? 70 : (isNight ? 55 : (isSunny ? 25 : 0)));

    for (let i = 0; i < count; i++) {
      if (isRain) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          length: weatherMode === 'heavy_rain' ? 18 + Math.random() * 12 : 10 + Math.random() * 8,
          speed: weatherMode === 'heavy_rain' ? 14 + Math.random() * 6 : 9 + Math.random() * 4,
          opacity: 0.2 + Math.random() * 0.4
        });
      } else if (isNight) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height * 0.8,
          radius: Math.random() * 1.5 + 0.4,
          alpha: Math.random(),
          speed: 0.01 + Math.random() * 0.02
        });
      } else if (isSunny) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 2 + 0.8,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -Math.random() * 0.5 - 0.2,
          alpha: 0.15 + Math.random() * 0.3
        });
      }
    }

    let lightningTimer = 0;
    let lightningFlash = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Thunderstorm lightning logic
      if (weatherMode === 'thunderstorm') {
        lightningTimer++;
        if (lightningTimer > 280 && Math.random() < 0.015) {
          lightningFlash = 0.22;
          lightningTimer = 0;
        }
        if (lightningFlash > 0) {
          ctx.fillStyle = `rgba(220, 235, 255, ${lightningFlash})`;
          ctx.fillRect(0, 0, width, height);
          lightningFlash -= 0.015;
        }
      }

      // Render rain
      if (isRain) {
        ctx.strokeStyle = weatherMode === 'thunderstorm' ? 'rgba(186, 215, 255, 0.45)' : 'rgba(200, 225, 255, 0.35)';
        ctx.lineWidth = weatherMode === 'heavy_rain' ? 1.8 : 1.2;
        ctx.beginPath();
        for (let p of particles) {
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - 2, p.y + p.length);
          p.y += p.speed;
          p.x -= 0.8;
          if (p.y > height) {
            p.y = -p.length;
            p.x = Math.random() * width;
          }
        }
        ctx.stroke();
      }

      // Render starry night
      else if (isNight) {
        for (let p of particles) {
          p.alpha += p.speed;
          const currentAlpha = Math.abs(Math.sin(p.alpha)) * 0.7 + 0.15;
          ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Render sun dust motes
      else if (isSunny) {
        for (let p of particles) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.y < 0) {
            p.y = height;
            p.x = Math.random() * width;
          }
          ctx.fillStyle = `rgba(255, 235, 170, ${p.alpha})`;
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
      cancelAnimationFrame(animationFrameId);
    };
  }, [weatherMode, animationsEnabled]);

  // Background gradient map according to exact meteorology
  const getAtmosphericGradient = () => {
    switch (weatherMode) {
      case 'sunny':
        return 'from-sky-500/25 via-amber-400/10 to-slate-900';
      case 'twilight':
        return 'from-amber-600/30 via-rose-500/20 to-slate-950';
      case 'cloudy':
        return 'from-slate-600/30 via-slate-700/20 to-slate-950';
      case 'cloudy_night':
        return 'from-slate-800/40 via-slate-900/40 to-black';
      case 'rain':
        return 'from-sky-900/40 via-slate-800/40 to-slate-950';
      case 'heavy_rain':
        return 'from-slate-900/60 via-blue-950/50 to-black';
      case 'thunderstorm':
        return 'from-purple-950/50 via-slate-900/60 to-black';
      case 'night':
      default:
        return 'from-indigo-950/35 via-slate-900/50 to-slate-950';
    }
  };

  return (
    <div 
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden transition-colors duration-1000"
      aria-hidden="true"
    >
      {/* Sky Gradient Base */}
      <div className={`absolute inset-0 bg-gradient-to-b ${getAtmosphericGradient()}`} />

      {/* Decorative Atmospheric Elements */}
      {animationsEnabled && (
        <>
          {/* Sunny: Radiant Sun & Ambient Glow */}
          {weatherMode === 'sunny' && (
            <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-amber-400/20 blur-3xl animate-pulse duration-[8000ms]" />
          )}

          {/* Twilight: Horizon glow */}
          {weatherMode === 'twilight' && (
            <div className="absolute -bottom-24 left-0 right-0 h-96 bg-gradient-to-t from-orange-500/25 via-pink-500/10 to-transparent blur-2xl" />
          )}

          {/* Night: Crescent Moon Glow */}
          {weatherMode === 'night' && (
            <div className="absolute top-12 right-16 w-20 h-20 rounded-full bg-slate-200/25 blur-xl pointer-events-none">
              <div className="w-12 h-12 rounded-full border-t-2 border-l-2 border-slate-100/60 shadow-[0_0_25px_rgba(255,255,255,0.4)] ml-3 mt-3" />
            </div>
          )}

          {/* Cloudy: Soft Floating Cloud Layers */}
          {['cloudy', 'cloudy_night', 'rain', 'thunderstorm'].includes(weatherMode) && (
            <>
              <div className="absolute top-8 -left-32 w-96 h-36 bg-slate-400/10 rounded-full blur-2xl animate-[float_45s_infinite_linear]" />
              <div className="absolute top-24 -right-40 w-[30rem] h-48 bg-slate-500/10 rounded-full blur-3xl animate-[float_60s_infinite_linear_reverse]" />
            </>
          )}

          {/* Canvas for Rain, Dust, Stars */}
          <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />
        </>
      )}

      {/* Subtle Noise / Vignette Texture to ensure readable contrast */}
      <div className="absolute inset-0 bg-radial-vignette opacity-40" />
    </div>
  );
}

