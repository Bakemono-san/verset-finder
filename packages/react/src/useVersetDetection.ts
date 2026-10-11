import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  QuranIndex,
  detectAyah,
  loadQuranIndex,
  WebSpeechProvider,
  type DetectionResult,
  type DetectOptions,
  type LoadDataOptions,
} from "@bakemono-san/verset-finder";

export type MicState = "idle" | "listening" | "processing" | "done" | "error";

export type MicPermission = "granted" | "prompt" | "denied" | "unknown";

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
  /** Transient non-fatal notice (e.g. "no-speech"). Null when none. */
  hint: string | null;
  /** Microphone permission status. */
  permission: MicPermission;
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
  const [hint, setHint] = useState<string | null>(null);
  const [permission, setPermission] = useState<MicPermission>("unknown");
  const [indexReady, setIndexReady] = useState(false);
  const [ayahCount, setAyahCount] = useState(0);

  const indexRef = useRef<QuranIndex | null>(null);
  const providerRef = useRef<WebSpeechProvider | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptRef = useRef("");
  const startStampRef = useRef(0);
  const launchRef = useRef<() => void>(() => {});
  const langRef = useRef(lang);
  langRef.current = lang;
  const onDetectRef = useRef(onDetect);
  const onErrorRef = useRef(onError);
  onDetectRef.current = onDetect;
  onErrorRef.current = onError;

  const refreshPermission = useCallback(() => {
    try {
      const nav = navigator as unknown as {
        permissions?: { query(o: { name: string }): Promise<{ state: string }> };
      };
      nav.permissions
        ?.query({ name: "microphone" })
        .then((r) => setPermission((r.state as MicPermission) ?? "unknown"))
        .catch(() => setPermission("unknown"));
    } catch {
      setPermission("unknown");
    }
  }, []);

  useEffect(() => {
    refreshPermission();
  }, [refreshPermission]);

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
      // Index not ready yet (still downloading): stay in "processing" — the
      // index-ready effect below retries as soon as it arrives. Never leave
      // the UI stuck silently.
      if (!idx || !text.trim()) return null;
      const r = detectAyah(text, idx, detectOpts);
      resultRef.current = r;
      setResult(r);
      setState("done");
      onDetectRef.current?.(r);
      return r;
    },
    [detectOpts],
  );

  // Retry path for the index-loading race: transcript arrived before the
  // Quran index finished downloading → detect once it is ready.
  // Guards: only while still "processing" with no result yet, so this fires
  // at most once (detect flips state to "done").
  const stateRef = useRef(state);
  stateRef.current = state;
  const resultRef = useRef(result);
  resultRef.current = result;
  useEffect(() => {
    if (!indexReady || !autoDetect || !transcriptRef.current) return;
    if (resultRef.current || stateRef.current !== "processing") return;
    detect(transcriptRef.current);
  }, [indexReady, autoDetect, detect]);

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

  // Transient provider errors → hint (keep listening). Fatal ones → error.
  const onProviderError = useCallback((msg: string) => {
    if (msg === "no-speech") {
      setHint("no-speech");
      return;
    }
    setHint(null);
    setError(msg);
    setState("error");
    onErrorRef.current?.(msg);
  }, []);

  // Chrome ends recognition on silence / ~60s cap: seamlessly resume while
  // the user is still in "listening". An instant end means the mic is blocked.
  const onProviderEnd = useCallback(() => {
    if (stateRef.current !== "listening") return;
    if (Date.now() - startStampRef.current < 1500) {
      const msg = "mic-blocked";
      setError(msg);
      setState("error");
      onErrorRef.current?.(msg);
      return;
    }
    launchRef.current();
  }, []);

  // (Re)launch recognition without touching transcript/result state.
  const launch = useCallback(() => {
    let p = providerRef.current;
    if (!p) {
      p = new WebSpeechProvider();
      providerRef.current = p;
    }
    startStampRef.current = Date.now();
    p.start({
      lang: langRef.current,
      onResult: (text, isFinal) => {
        if (isFinal) {
          const next = (transcriptRef.current ? transcriptRef.current + " " + text : text).trim();
          transcriptRef.current = next;
          setTranscript(next);
          setInterim("");
          setHint(null);
        } else {
          setInterim(text);
        }
      },
      onError: onProviderError,
      onEnd: onProviderEnd,
    });
  }, [onProviderError, onProviderEnd]);

  useEffect(() => {
    launchRef.current = launch;
  }, [launch]);

  const start = useCallback(() => {
    const p = providerRef.current ?? new WebSpeechProvider();
    providerRef.current = p;
    if (!p.isSupported()) {
      const msg = "not-supported";
      setError(msg);
      setState("error");
      onErrorRef.current?.(msg);
      return;
    }
    refreshPermission();
    setError(null);
    setHint(null);
    setResult(null);
    resultRef.current = null;
    transcriptRef.current = "";
    setTranscript("");
    setInterim("");
    setState("listening");
    launchRef.current();
  }, [launch, refreshPermission]);

  const stop = useCallback(() => {
    providerRef.current?.stop();
    setInterim("");
    // Nothing heard → back to idle instead of a "processing" dead-end.
    setState((s) => (s === "listening" ? (transcriptRef.current ? "processing" : "idle") : s));
  }, []);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    providerRef.current?.stop();
    transcriptRef.current = "";
    setTranscript("");
    setInterim("");
    setResult(null);
    setError(null);
    setHint(null);
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
    hint,
    permission,
    supported,
    ayahCount,
    indexReady,
    start,
    stop,
    reset,
    detect,
  };
}
