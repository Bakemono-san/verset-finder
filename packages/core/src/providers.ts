/** Provider contracts — WebSpeech-first, headless-importable (no DOM at import). */

export type TranscriptHandler = (text: string, isFinal: boolean) => void;
export type ErrorHandler = (error: string) => void;

export interface SpeechProvider {
  readonly name: string;
  isSupported(): boolean;
  start(opts?: { lang?: string; onResult?: TranscriptHandler; onError?: ErrorHandler }): void | Promise<void>;
  stop(): void | Promise<void>;
  abort?(): void;
}

export interface TranscribeOptions {
  /** Server base URL for REST/WS providers */
  baseUrl?: string;
  lang?: string;
  fetchFn?: typeof fetch;
  /** WebSocket URL override for WS provider */
  wsUrl?: string;
}

/** Lazily create the WebSpeech provider (avoids SSR crashes). */
export async function createWebSpeechProvider(): Promise<SpeechProvider> {
  const mod = await import("./providers/webspeech.js");
  return new mod.WebSpeechProvider();
}
