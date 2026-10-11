import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  QuranIndex,
  detectAyah,
  loadQuranIndex,
  WebSpeechProvider,
  type DetectionResult,
  type DetectOptions,
  type LoadDataOptions,
} from "@bakemono_san/verset-finder";

export type MicState = "idle" | "listening" | "processing" | "done" | "error";

export interface UseVersetDetectionOptions extends DetectOptions, LoadDataOptions {
  lang?: string;
  /** Auto-detect on every final transcript. Default true. */
  autoDetect?: boolean;
  /** Debounce ms after final transcript before detection. Default 300. */
  debounceMs?: number;
  onDetect?: (result: DetectionResult) => void;
  onError?: (error: string) => void;
}

export interface UseVersetDetection {
  state: MicState;
  transcript: string;
  interim: string;
  result: DetectionResult | null;
  error: string | null;
  supported: boolean;
  ayahCount: number;
  indexReady: boolean;
  start(): void;
  stop(): void;
  reset(): void;
  detect(text: string): DetectionResult | null;
}

/**
 * Headless hook: mic (WebSpeech) -> transcript -> local trigram detect.
 * Works without the <VersetFinderMic/> UI for custom designs.
 */
export function useVersetDetection(opts: UseVersetDetectionOptions = {}): UseVersetDetection {
  const {
    lang = "ar-SA",
    autoDetect = true,
    debounceMs = 300,
    onDetect,
    onError,
    ...detectAndLoad
  } = opts;
  const { surah, topK, rejectBelow, acceptAbove, maxSpan, indexUrl, edition, fetchFn, useCache } =
    detectAndLoad;

  const [state, setState] = useState<MicState>("idle");
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [indexReady, setIndexReady] = useState(false);
  const [ayahCount, setAyahCount] = useState(0);

  const indexRef = useRef<QuranIndex | null>(null);
  const providerRef = useRef<WebSpeechProvider | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDetectRef = useRef(onDetect);
  const onErrorRef = useRef(onError);
  onDetectRef.current = onDetect;
  onErrorRef.current = onError;

  const detectOpts = useMemo<DetectOptions>(
    () => ({ surah, topK, rejectBelow, acceptAbove, maxSpan }),
    [surah, topK, rejectBelow, acceptAbove, maxSpan],
  );

  // Load index once (IndexedDB -> bundled -> network).
  useEffect(() => {
    let cancelled = false;
    loadQuranIndex({ indexUrl, edition, fetchFn, useCache })
      .then((idx) => {
        if (cancelled) return;
        indexRef.current = idx;
        setAyahCount(idx.size);
        setIndexReady(true);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "index-load-failed";
        setError(msg);
        setState("error");
        onErrorRef.current?.(msg);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const detect = useCallback(
    (text: string): DetectionResult | null => {
      const idx = indexRef.current;
      if (!idx || !text.trim()) return null;
      const r = detectAyah(text, idx, detectOpts);
      setResult(r);
      setState("done");
      onDetectRef.current?.(r);
      return r;
    },
    [detectOpts],
  );

  // Debounced auto-detect on final transcript.
  useEffect(() => {
    if (!autoDetect || !transcript) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setState("processing");
    timerRef.current = setTimeout(() => detect(transcript), debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [transcript, autoDetect, debounceMs, detect]);

  const start = useCallback(() => {
    if (!providerRef.current) providerRef.current = new WebSpeechProvider();
    const p = providerRef.current;
    if (!p.isSupported()) {
      const msg = "not-supported";
      setError(msg);
      setState("error");
      onErrorRef.current?.(msg);
      return;
    }
    setError(null);
    setResult(null);
    setTranscript("");
    setInterim("");
    setState("listening");
    p.start({
      lang,
      onResult: (text, isFinal) => {
        if (isFinal) {
          setTranscript((prev) => (prev ? prev + " " + text : text).trim());
          setInterim("");
        } else {
          setInterim(text);
        }
      },
      onError: (msg) => {
        setError(msg);
        setState("error");
        onErrorRef.current?.(msg);
      },
    });
  }, [lang]);

  const stop = useCallback(() => {
    providerRef.current?.stop();
    setInterim("");
    setState((s) => (s === "listening" ? "processing" : s));
  }, []);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    providerRef.current?.stop();
    setTranscript("");
    setInterim("");
    setResult(null);
    setError(null);
    setState("idle");
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      providerRef.current?.stop();
    },
    [],
  );

  const supported =
    typeof window !== "undefined" &&
    Boolean(
      (window as unknown as Record<string, unknown>).SpeechRecognition ??
        (window as unknown as Record<string, unknown>).webkitSpeechRecognition,
    );

  return {
    state,
    transcript: interim ? `${transcript} ${interim}`.trim() : transcript,
    interim,
    result,
    error,
    supported,
    ayahCount,
    indexReady,
    start,
    stop,
    reset,
    detect,
  };
}
