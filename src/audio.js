// ============================================
// audio.js — Web Audio API engine, mute toggle, SFX
// ============================================

(function() {
  let ctx = null;
  let masterGain = null;

  function ensureCtx() {
    if (ctx) return ctx;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    return ctx;
  }

  TD.audio = {
    muted: false,

    ensureCtx: ensureCtx,

    toggle: function() {
      ensureCtx();
      TD.audio.muted = !TD.audio.muted;
      masterGain.gain.setValueAtTime(TD.audio.muted ? 0 : 1, ctx.currentTime);
    },

    getMaster: function() {
      ensureCtx();
      return masterGain;
    }
  };

  // ---- SFX helpers ----

  function playOsc(type, freq, duration, volume, freqEnd) {
    if (TD.audio.muted) return;
    const c = ensureCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    if (freqEnd !== undefined) {
      osc.frequency.linearRampToValueAtTime(freqEnd, c.currentTime + duration);
    }
    gain.gain.setValueAtTime(volume, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + duration);
  }

  // Coin: bright two-tone ascending ding
  TD.sfxCoin = function() {
    if (TD.audio.muted) return;
    const c = ensureCtx();
    const t = c.currentTime;

    [1047, 1319].forEach((freq, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.18, t + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.12);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t + i * 0.07);
      osc.stop(t + i * 0.07 + 0.12);
    });
  };

  // Jump: rising sine sweep
  TD.sfxJump = function() {
    playOsc('sine', 200, 0.15, 0.12, 600);
  };

  // Death: low impact rumble + noise burst
  TD.sfxDeath = function() {
    if (TD.audio.muted) return;
    const c = ensureCtx();
    const t = c.currentTime;

    // Low rumble
    const osc = c.createOscillator();
    const g1 = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.linearRampToValueAtTime(40, t + 0.3);
    g1.gain.setValueAtTime(0.2, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(g1);
    g1.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.35);

    // Noise burst
    const bufLen = c.sampleRate * 0.15;
    const buf = c.createBuffer(1, bufLen, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    const noise = c.createBufferSource();
    noise.buffer = buf;
    const g2 = c.createGain();
    g2.gain.setValueAtTime(0.15, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    noise.connect(g2);
    g2.connect(masterGain);
    noise.start(t);
    noise.stop(t + 0.2);
  };

  // Lane switch: subtle tick
  TD.sfxSwipe = function() {
    playOsc('triangle', 400, 0.05, 0.08);
  };
})();
