/**
 * @bakemono_san/verset-finder — core entry (headless, no DOM at import).
 * Tree-shakeable: import only what you need.
 */
export type {
  AyahRef,
  QuranAyah,
  DetectionResult,
  DetectionStatus,
  DetectOptions,
  SerializedIndex,
  ServerVerifyOptions,
  ServerVerifyResult,
} from "./types.js";

export {
  normalizeArabic,
  removeDiacritics,
  sanitizeVoiceTranscript,
  normalizeTranscript,
  containsArabic,
} from "./normalize.js";

export { calculateSimilarity } from "./similarity.js";
export { QuranIndex, buildIndex, trigramsOf, stripBasmalaPrefix } from "./trigramIndex.js";
export type { TrigramPostings } from "./trigramIndex.js";
export { detectAyah } from "./matcher.js";
export { loadQuranIndex } from "./data.js";
export type { LoadDataOptions } from "./data.js";
export { loadCachedIndex, saveCachedIndex, clearCachedIndex } from "./cache.js";
export type { SpeechProvider, TranscriptHandler, ErrorHandler, TranscribeOptions } from "./providers.js";
export { createWebSpeechProvider } from "./providers.js";
export { WebSpeechProvider } from "./providers/webspeech.js";
export { captureAudio, startCapture } from "./capture.js";
export type { CaptureHandle } from "./capture.js";
export { transcribeRest, verifyWithServer } from "./whisperRest.js";
export type { RestTranscribeOptions } from "./whisperRest.js";
export { transcribeLive } from "./whisperWs.js";
export type { WsTranscribeOptions, WsSession } from "./whisperWs.js";
export { createCustomProvider } from "./custom.js";
export type { CustomProviderHooks } from "./custom.js";
