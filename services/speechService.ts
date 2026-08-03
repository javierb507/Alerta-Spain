
// Lectura en voz alta con la Web Speech API (nativa del navegador, sin claves).
// Permite consultar el estado de la zona sin mirar la pantalla: conduciendo,
// con las manos ocupadas o para personas con baja visión.

export const speechSupported = (): boolean =>
  typeof window !== 'undefined' && 'speechSynthesis' in window;

export const speak = (text: string, onEnd?: () => void) => {
  if (!speechSupported()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-ES';
  utterance.rate = 0.95;
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
};

export const stopSpeaking = () => {
  if (speechSupported()) window.speechSynthesis.cancel();
};
