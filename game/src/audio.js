// Prism Leap — sound: tiny WebAudio bleeps, synthesised, no audio files.
// Every effect is one short oscillator note; the game stays silent until
// the first key press creates the AudioContext (browsers require a gesture).
let ctx = null;
let muted = false;

function ensureCtx() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  } catch (err) {
    ctx = null;
  }
  return ctx;
}

function blip(freq, dur, type, vol, slideTo) {
  if (muted) return;
  const audio = ensureCtx();
  if (!audio) return;
  try {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audio.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, audio.currentTime + dur);
    gain.gain.setValueAtTime(vol, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + dur);
  } catch (err) {
    // Sound is garnish: never let it break the game.
  }
}

export const sfx = {
  jump() { blip(320, 0.12, 'square', 0.05, 620); },
  flip() { blip(520, 0.16, 'sine', 0.07, 180); },
  recolor() { blip(740, 0.08, 'triangle', 0.06, 980); },
  shard() { blip(880, 0.1, 'sine', 0.07, 1320); },
  spring() { blip(240, 0.2, 'square', 0.06, 960); },
  death() { blip(220, 0.35, 'sawtooth', 0.07, 60); },
  levelClear() { blip(523, 0.12, 'triangle', 0.08, 784); setTimeout(() => blip(784, 0.18, 'triangle', 0.08, 1046), 110); },
  win() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.22, 'triangle', 0.08), i * 130));
  },
  toggleMute() { muted = !muted; return muted; },
  isMuted() { return muted; },
  unlock() { ensureCtx(); },
};
