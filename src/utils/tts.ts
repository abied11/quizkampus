/**
 * Text-to-Speech utility using Web Speech API
 * Provides natural-sounding voice for reading quiz questions
 */

const TTS_STORAGE_KEY = 'quizkampus_tts_enabled';

export let isTTSEnabled: boolean = (() => {
  try {
    return localStorage.getItem(TTS_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
})();

export function setTTSEnabled(enabled: boolean): void {
  isTTSEnabled = enabled;
  try {
    localStorage.setItem(TTS_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch { /* ignore */ }
  if (!enabled) stopSpeaking();
}

/**
 * Speak a question text with a natural-sounding voice
 */
export function speakQuestion(text: string): void {
  if (!isTTSEnabled) return;
  if (!window.speechSynthesis) return;

  stopSpeaking();

  // Clean text: remove markdown-like symbols
  const cleanText = text
    .replace(/[*_#`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const utter = new SpeechSynthesisUtterance(cleanText);

  // Find best Indonesian or English voice
  const voices = window.speechSynthesis.getVoices();
  const idVoice = voices.find(v => v.lang.startsWith('id'));
  const enNatural = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('natural'));
  const enUS = voices.find(v => v.lang === 'en-US');

  utter.voice = idVoice || enNatural || enUS || voices[0] || null;
  utter.rate = 0.92;    // slightly slower = clearer
  utter.pitch = 1.05;   // slightly higher = sounds less robotic
  utter.volume = 0.85;

  window.speechSynthesis.speak(utter);
}

/**
 * Stop any ongoing speech
 */
export function stopSpeaking(): void {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Check if speech synthesis is supported in this browser
 */
export function isTTSSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Pre-load voices (needed for some browsers)
 */
export function initTTS(): void {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.getVoices();
  // Chrome loads voices asynchronously
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}
