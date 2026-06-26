const SOUND_ENABLED_KEY = 'wqk_sound_enabled';

export const isSoundEnabled = (): boolean =>
  localStorage.getItem(SOUND_ENABLED_KEY) !== 'false';

export const setSoundEnabled = (enabled: boolean): void => {
  localStorage.setItem(SOUND_ENABLED_KEY, enabled ? 'true' : 'false');
};

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
