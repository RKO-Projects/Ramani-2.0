export function speakRoute(text: string): boolean {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.92;
  utterance.lang = "en-KE";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeaking(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}
