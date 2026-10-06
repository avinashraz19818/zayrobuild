/**
 * SFX smoke test — Web Audio ke fake nodes ke saath saare sound recipes chalाता
 * hai, taaki synth code me koi typo / galat API call pakdi jaaye.
 *   node scripts/test-sfx.mjs
 */
const param = () => ({
  value: 0,
  setValueAtTime() { return this; },
  exponentialRampToValueAtTime() { return this; },
  linearRampToValueAtTime() { return this; }
});

let nodesCreated = 0;
class FakeNode {
  constructor(kind) {
    this.kind = kind;
    this.gain = param();
    this.frequency = param();
    this.delayTime = param();
    this.Q = param();
    this.type = '';
    nodesCreated += 1;
  }
  connect() { return this; }
  disconnect() { return this; }
  start() { this.started = true; }
  stop() { this.stopped = true; }
}

class FakeAudioContext {
  constructor() {
    this.currentTime = 0.5;
    this.state = 'running';
    this.sampleRate = 48000;
    this.destination = new FakeNode('destination');
  }
  createGain() { return new FakeNode('gain'); }
  createDelay() { return new FakeNode('delay'); }
  createBiquadFilter() { return new FakeNode('filter'); }
  createOscillator() { return new FakeNode('osc'); }
  createBufferSource() { return new FakeNode('bufferSource'); }
  createBuffer(channels, len) {
    const data = new Float32Array(len);
    return { sampleRate: this.sampleRate, getChannelData: () => data };
  }
  resume() { return Promise.resolve(); }
}

const store = new Map([['zayro_sfx_v1', '1']]);
globalThis.window = {
  AudioContext: FakeAudioContext,
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v))
  },
  navigator: { vibrate: () => true }
};
// Node me navigator read-only hota hai — haptic ke liye defineProperty use karo
Object.defineProperty(globalThis, 'navigator', {
  value: globalThis.window.navigator, configurable: true, writable: true
});

const { playSfx, SOUND_NAMES, setSfxEnabled, sfxEnabled, installGlobalSfx } =
  await import('../frontend/src/lib/sfx.js');

let failed = 0;
const ok = (cond, label) => {
  if (!cond) failed += 1;
  console.log(`${cond ? '✅' : '❌'} ${label}`);
};

// Har sound ko thoda gap dekar bajao (module 28ms ke andar duplicate skip karta hai)
const sounds = [];
for (const name of SOUND_NAMES) {
  const played = playSfx(name);
  sounds.push([name, played]);
  await new Promise((r) => setTimeout(r, 40));
}

ok(SOUND_NAMES.length >= 10, `sound recipes available (${SOUND_NAMES.length}: ${SOUND_NAMES.join(', ')})`);
ok(sounds.every(([, played]) => played), 'saare sounds bina error ke play hue (Web Audio graph sahi bana)');
ok(nodesCreated > SOUND_NAMES.length * 2, `Web Audio nodes create hue (${nodesCreated})`);

// Toggle
setSfxEnabled(false);
ok(sfxEnabled() === false, 'toggle OFF hone par sfxEnabled() false deta hai');
ok(playSfx('tap') === false, 'OFF hone par sound play nahi hota');
ok(store.get('zayro_sfx_v1') === '0', 'preference localStorage me save hoti hai');
setSfxEnabled(true);
ok(playSfx('success') === true, 'ON karne par sound wapas chalta hai');

// Global installer idempotent + DOM ke bina safe
globalThis.document = { addEventListener() {}, removeEventListener() {} };
const off1 = installGlobalSfx();
const off2 = installGlobalSfx();
ok(typeof off1 === 'function' && typeof off2 === 'function', 'installGlobalSfx() do baar call karne par bhi safe hai');

console.log(`\n${failed === 0 ? '✅ sab pass' : '❌ failures: ' + failed} · sounds: ${SOUND_NAMES.length}`);
process.exit(failed ? 1 : 0);
