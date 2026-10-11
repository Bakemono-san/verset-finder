/**
 * Web Speech API provider — logic ported from
 * Tarteel frontend/components/SpeechToText.tsx (continuous + interimResults + ar-SA).
 * Safe to import in Node (class only touches window inside methods).
 */
import type { ErrorHandler, SpeechProvider, TranscriptHandler } from "../providers.js";

type Rec = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((e: unknown) => void) | null;
  onresult: ((e: never) => void) | null;
  onerror: ((e: never) => void) | null;
  onend: ((e: unknown) => void) | null;
  start(): void;
  stop(): void;
  abort?(): void;
};

function getCtor(): (new () => Rec) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => Rec) | null;
}

export class WebSpeechProvider implements SpeechProvider {
  readonly name = "webspeech";
  private rec: Rec | null = null;
  private lang = "ar-SA";

  isSupported(): boolean {
    return getCtor() !== null;
  }

  start(opts?: { lang?: string; onResult?: TranscriptHandler; onError?: ErrorHandler; onEnd?: () => void }): void {
    const Ctor = getCtor();
    if (!Ctor) {
      opts?.onError?.("not-supported");
      return;
    }
    this.stop();
    this.lang = opts?.lang ?? "ar-SA";
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = this.lang;
    r.onresult = (e: unknown) => {
      const ev = e as { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> };
      let final = "";
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) final += t + " ";
        else interim += t;
      }
      opts?.onResult?.(final + interim, final.length > 0);
    };
    r.onerror = (e: unknown) => {
      // Forward everything (incl. "no-speech"): the hook decides between
      // transient hint vs fatal error. Swallowing it leaves UIs stuck.
      const err = (e as { error?: string }).error ?? "unknown";
      if (err === "aborted") return;
      opts?.onError?.(err);
    };
    r.onend = () => {
      opts?.onEnd?.();
    };
    this.rec = r;
    try {
      r.start();
    } catch (err) {
      opts?.onError?.(err instanceof Error ? err.message : "start-failed");
    }
  }

  stop(): void {
    try {
      this.rec?.stop();
    } catch {
      /* noop */
    }
    this.rec = null;
  }

  abort(): void {
    try {
      this.rec?.abort?.() ?? this.rec?.stop();
    } catch {
      /* noop */
    }
    this.rec = null;
  }
}
