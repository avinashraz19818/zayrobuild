// ─────────────────────────────────────────────────────────────────────────────
// SFX — chhote UI sound effects (Web Audio se live synthesize hote hain)
//
// Kyun synth: koi audio file nahi chahiye (bundle halka, offline bhi chalta
// hai) aur har sound ko bilkul waisa tune kar sakte hain jaisa chahiye.
//
// Sab kuch guard ke saath hai — jin browsers/devices me AudioContext nahi hai
// (ya JSDOM tests me) wahan ye module chup-chaap kuch nahi karta.
// ─────────────────────────────────────────────────────────────────────────────

const STORE_KEY = 'zayro_sfx_v1';

let ctx = null;
let master = null;
let spaceSend = null;
let noiseBuf = null;
let lastPlay = -Infinity; // pehla tap kabhi block na ho
const listeners = new Set();

// Sounds are enabled by default, including users with a legacy OFF preference.
let enabled = true;

/* ── Audio graph (pehli user gesture par banta hai — autoplay policy) ── */
function audio() {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.7;
      master.connect(ctx.destination);

      // Halka "space" — chimes ko depth deta hai (echo bus)
      spaceSend = ctx.createGain();
      spaceSend.gain.value = 0.5;
      const delay = ctx.createDelay(0.4);
      delay.delayTime.value = 0.12;
      const fb = ctx.createGain();
      fb.gain.value = 0.2;
      const damp = ctx.createBiquadFilter();
      damp.type = 'lowpass';
      damp.frequency.value = 2600;
      spaceSend.connect(delay);
      delay.connect(damp);
      damp.connect(fb);
      fb.connect(delay);
      damp.connect(master);
    } catch (err) {
      ctx = null;
      return null;
    }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function noiseBuffer(c) {
  if (noiseBuf && noiseBuf.sampleRate === c.sampleRate) return noiseBuf;
  const len = Math.floor(c.sampleRate * 0.5);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
  noiseBuf = buf;
  return buf;
}

/* ── Chhote building blocks ── */
function tone(t0, freq, dur, { type = 'sine', gain = 0.05, to = 0, bus = 'master' } = {}) {
  const c = ctx;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(bus === 'space' && spaceSend ? spaceSend : master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

function noise(t0, dur, f0, f1, { gain = 0.04, q = 1.1 } = {}) {
  const c = ctx;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const band = c.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = q;
  band.frequency.setValueAtTime(f0, t0);
  band.frequency.exponentialRampToValueAtTime(Math.max(80, f1), t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.04, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(band);
  band.connect(g);
  g.connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.03);
}

/* ── Recipes (t0 = ab) ── */
const RECIPES = {
  // Chhota sa UI tick — har button tap par
  tap: (t) => {
    tone(t, 720, 0.055, { type: 'triangle', gain: 0.045, to: 560 });
    noise(t, 0.03, 1800, 900, { gain: 0.012 });
  },
  // Nav / tab switch — halka sa upar jaata blip
  nav: (t) => {
    tone(t, 470, 0.09, { type: 'sine', gain: 0.05, to: 660 });
  },
  // Chhoti cheez add/open hui (chip select, icon upload)
  pop: (t) => {
    tone(t, 880, 0.07, { type: 'sine', gain: 0.045, to: 1250 });
  },
  // Card / mode / style choose
  select: (t) => {
    tone(t, 660, 0.06, { type: 'triangle', gain: 0.042, to: 880 });
    tone(t + 0.055, 1046, 0.09, { type: 'sine', gain: 0.03, bus: 'space' });
  },
  // Wizard step aage/peeche
  step: (t) => {
    tone(t, 523.25, 0.1, { type: 'sine', gain: 0.05 });
    tone(t + 0.075, 783.99, 0.16, { type: 'sine', gain: 0.045, bus: 'space' });
  },
  // Sheet khuli — whoosh up
  open: (t) => {
    noise(t, 0.22, 320, 1500, { gain: 0.035, q: 0.9 });
    tone(t, 300, 0.2, { type: 'sine', gain: 0.03, to: 620 });
  },
  // Sheet band — whoosh down
  close: (t) => {
    noise(t, 0.18, 1500, 320, { gain: 0.03, q: 0.9 });
    tone(t, 620, 0.16, { type: 'sine', gain: 0.025, to: 280 });
  },
  // Kaam ho gaya — chaar note ka chhota arpeggio
  success: (t) => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      tone(t + i * 0.075, f, 0.24, { type: 'sine', gain: 0.048, bus: 'space' });
    });
  },
  // Kuch galat hua — do low notes
  error: (t) => {
    tone(t, 311, 0.14, { type: 'sawtooth', gain: 0.032, to: 240 });
    tone(t + 0.13, 208, 0.22, { type: 'triangle', gain: 0.04 });
  },
  // Coins / wallet
  coin: (t) => {
    tone(t, 988, 0.07, { type: 'square', gain: 0.026, to: 1319 });
    tone(t + 0.06, 1318.5, 0.2, { type: 'sine', gain: 0.04, bus: 'space' });
  },
  // Build start — rocket sweep
  build: (t) => {
    noise(t, 0.36, 260, 1800, { gain: 0.035, q: 0.8 });
    tone(t, 300, 0.3, { type: 'sawtooth', gain: 0.026, to: 780 });
    tone(t + 0.22, 880, 0.26, { type: 'sine', gain: 0.045, to: 1320, bus: 'space' });
  },
  // Toggle switch
  toggle: (t) => {
    tone(t, 430, 0.05, { type: 'sine', gain: 0.04, to: 320 });
  }
};

export const SOUND_NAMES = Object.keys(RECIPES);

/* ── Public API ── */
export function playSfx(name = 'tap') {
  if (!enabled) return false;
  const recipe = RECIPES[name] || RECIPES.tap;
  const c = audio();
  if (!c) return false;
  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  if (now - lastPlay < 28) return false; // machine-gun clicks na hon
  lastPlay = now;
  try {
    recipe(c.currentTime + 0.001);
  } catch (err) {
    return false;
  }
  return true;
}

export function sfxEnabled() {
  return enabled;
}

export function setSfxEnabled(next) {
  enabled = Boolean(next);
  try {
    window.localStorage.setItem(STORE_KEY, enabled ? '1' : '0');
  } catch (err) { /* private mode — koi baat nahi */ }
  listeners.forEach((fn) => { try { fn(enabled); } catch (e) { /* ignore */ } });
  return enabled;
}

export function subscribeSfx(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function haptic(ms = 8) {
  if (!enabled) return;
  try {
    navigator?.vibrate?.(ms);
  } catch (err) { /* unsupported */ }
}

/* Global click delegation — poore app me har button/pill par halka tick.
   `data-sfx="nav"` jaisa attribute laga kar koi bhi control apna sound chun
   sakta hai; `data-sfx="off"` us element (aur uske andar) ko chup kara deta hai. */
export function installGlobalSfx() {
  if (typeof document === 'undefined') return () => {};
  if (globalThis.__zayroSfxInstalled) return () => {};
  globalThis.__zayroSfxInstalled = true;

  const onPointer = (e) => {
    const el = e.target instanceof Element
      ? e.target.closest('[data-sfx],button,a,[role="button"],.pill,.chip,label.icon-drop,label.switch')
      : null;
    if (!el) return;
    if (el.closest('[data-sfx="off"]')) return;
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    const kind = el.getAttribute('data-sfx') || 'tap';
    if (kind === 'off') return;
    playSfx(kind);
    if (kind === 'tap' || kind === 'nav' || kind === 'select' || kind === 'pop') haptic(7);
  };

  document.addEventListener('click', onPointer, { capture: true, passive: true });
  return () => document.removeEventListener('click', onPointer, { capture: true });
}

export const sfx = {
  play: playSfx,
  tap: () => playSfx('tap'),
  nav: () => playSfx('nav'),
  pop: () => playSfx('pop'),
  select: () => playSfx('select'),
  step: () => playSfx('step'),
  open: () => playSfx('open'),
  close: () => playSfx('close'),
  success: () => playSfx('success'),
  error: () => playSfx('error'),
  coin: () => playSfx('coin'),
  build: () => playSfx('build'),
  toggle: () => playSfx('toggle'),
  enabled: sfxEnabled,
  setEnabled: setSfxEnabled
};

export default sfx;
