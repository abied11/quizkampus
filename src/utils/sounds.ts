const SOUND_ENABLED_KEY = 'wqk_sound_enabled';
const MUSIC_ENABLED_KEY = 'wqk_music_enabled';

export const isSoundEnabled = (): boolean =>
  localStorage.getItem(SOUND_ENABLED_KEY) !== 'false';

export const setSoundEnabled = (enabled: boolean): void => {
  localStorage.setItem(SOUND_ENABLED_KEY, enabled ? 'true' : 'false');
};

export const isQuizMusicEnabled = (): boolean =>
  localStorage.getItem(MUSIC_ENABLED_KEY) === 'true';

export const setQuizMusicEnabled = (enabled: boolean): void => {
  localStorage.setItem(MUSIC_ENABLED_KEY, enabled ? 'true' : 'false');
  if (!enabled) stopQuizMusic();
};

// ─── Sound Effects ──────────────────────────────────────────────────────────
const playTone = (frequency: number, durationMs: number, type: OscillatorType = 'sine', volume = 0.08) => {
  if (!isSoundEnabled()) return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
    setTimeout(() => ctx.close(), durationMs + 100);
  } catch {
    /* ignore audio errors */
  }
};

export const playCorrectSound = () => {
  playTone(523, 120);
  setTimeout(() => playTone(659, 120), 100);
  setTimeout(() => playTone(784, 180), 200);
};

export const playWrongSound = () => playTone(220, 250, 'sawtooth', 0.06);

export const playTickSound = () => playTone(880, 60, 'square', 0.04);

export const playFinishSound = () => {
  playTone(392, 150);
  setTimeout(() => playTone(523, 150), 120);
  setTimeout(() => playTone(659, 200), 240);
  setTimeout(() => playTone(784, 300), 360);
};

export const playJoinSound = () => playTone(440, 100);

// ─── Quiz Background Music ───────────────────────────────────────────────────
// Upbeat pentatonic melody loop
let musicCtx: AudioContext | null = null;
let musicInterval: ReturnType<typeof setInterval> | null = null;
let musicActive = false;

// C major pentatonic pattern [freq, durMs, delayMs]
const MELODY: [number, number, number][] = [
  [523, 140, 0],    // C5
  [587, 140, 160],  // D5
  [659, 140, 320],  // E5
  [784, 200, 480],  // G5
  [880, 140, 700],  // A5
  [784, 140, 860],  // G5
  [659, 140, 1020], // E5
  [523, 180, 1180], // C5
  [587, 140, 1380], // D5
  [659, 140, 1540], // E5
  [784, 180, 1700], // G5
  [880, 280, 1900], // A5
];

const BASS: [number, number, number][] = [
  [130, 200, 0],
  [130, 200, 500],
  [146, 200, 1000],
  [130, 200, 1500],
  [146, 200, 2000],
];

function scheduleNote(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  durSec: number,
  vol: number,
  type: OscillatorType = 'triangle'
) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durSec * 0.85);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + durSec);
  } catch { /* ignore */ }
}

const LOOP_DUR_SEC = 2.5;

function scheduleLoop(ctx: AudioContext, loopStart: number) {
  for (const [freq, durMs, delayMs] of MELODY) {
    scheduleNote(ctx, freq, loopStart + delayMs / 1000, durMs / 1000, 0.035);
  }
  for (const [freq, durMs, delayMs] of BASS) {
    scheduleNote(ctx, freq, loopStart + delayMs / 1000, durMs / 1000, 0.025, 'sine');
  }
}

export function playQuizMusic(): void {
  if (!isQuizMusicEnabled() || musicActive) return;
  try {
    musicCtx = new AudioContext();
    musicActive = true;
    let loopTime = musicCtx.currentTime + 0.05;
    scheduleLoop(musicCtx, loopTime);
    loopTime += LOOP_DUR_SEC;

    musicInterval = setInterval(() => {
      if (!musicCtx || !musicActive) return;
      scheduleLoop(musicCtx, loopTime);
      loopTime += LOOP_DUR_SEC;
    }, (LOOP_DUR_SEC - 0.15) * 1000);
  } catch { /* ignore */ }
}

export function stopQuizMusic(): void {
  musicActive = false;
  if (musicInterval) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
  if (musicCtx) {
    musicCtx.close().catch(() => {});
    musicCtx = null;
  }
}
