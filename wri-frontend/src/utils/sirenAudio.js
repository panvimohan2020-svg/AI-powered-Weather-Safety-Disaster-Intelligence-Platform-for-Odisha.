/**
 * SirenAudioManager - Centralized Web Audio API Siren Controller
 * 
 * Guarantees:
 * 1. Zero duplicate oscillators or audio context leaks.
 * 2. Instant silence on stop/mute/close/acknowledge.
 * 3. Graceful handling of browser autoplay policies.
 * 4. React re-render idempotency (will not restart on state updates).
 */

class SirenAudioManager {
  constructor() {
    this.ctx = null;
    this.osc = null;
    this.gain = null;
    this.modulateInterval = null;
    this.currentAlertId = null;
    this._isPlaying = false;
    this._isMuted = false;

    // Check if user previously muted globally
    if (typeof window !== 'undefined') {
      this._isMuted = localStorage.getItem('odisha_wri_siren_muted') === 'true';
    }
  }

  isMuted() {
    return this._isMuted;
  }

  setMuted(muted) {
    this._isMuted = !!muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('odisha_wri_siren_muted', String(this._isMuted));
    }
    if (this._isMuted) {
      this.stop();
    }
  }

  isPlaying() {
    return this._isPlaying;
  }

  start(alertId = 'default') {
    // If muted, do not start audio
    if (this._isMuted) return;

    // If already playing for the exact same alert, don't recreate oscillator
    if (this._isPlaying && this.currentAlertId === alertId) {
      return;
    }

    // Stop any currently running sound before starting a new one
    this.stop();

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.ctx || this.ctx.state === 'closed') {
        this.ctx = new AudioCtx();
      }

      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(780, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.28, this.ctx.currentTime);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();

      this.osc = osc;
      this.gain = gain;
      this.currentAlertId = alertId;
      this._isPlaying = true;

      // Dual-tone modulation warble (720 Hz <-> 960 Hz)
      let high = false;
      this.modulateInterval = setInterval(() => {
        if (this.osc && this.ctx && this.ctx.state === 'running') {
          high = !high;
          const target = high ? 960 : 720;
          this.osc.frequency.exponentialRampToValueAtTime(target, this.ctx.currentTime + 0.28);
        }
      }, 380);

      // Mobile haptic vibration where supported
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([400, 250, 400, 250, 400]);
        } catch (e) {}
      }
    } catch (err) {
      console.warn('AudioContext playback error (handled):', err);
      this.stop();
    }
  }

  stop() {
    if (this.modulateInterval) {
      clearInterval(this.modulateInterval);
      this.modulateInterval = null;
    }

    if (this.osc) {
      try {
        this.osc.stop();
        this.osc.disconnect();
      } catch (e) {}
      this.osc = null;
    }

    if (this.gain) {
      try {
        this.gain.disconnect();
      } catch (e) {}
      this.gain = null;
    }

    this._isPlaying = false;
    this.currentAlertId = null;
  }
}

// Export singleton instance
export const sirenAudio = new SirenAudioManager();
export default sirenAudio;

