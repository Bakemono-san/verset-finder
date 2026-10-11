import React, { useState } from "react";
import { useVersetDetection, type MicState } from "./useVersetDetection.js";
import type { DetectionResult } from "@bakemono-san/verset-finder";

export interface VersetFinderMicProps {
  /** Called with every accepted/low detection. Wire to your router. */
  onDetect?: (result: DetectionResult) => void;
  onError?: (error: string) => void;
  lang?: string;
  surah?: number;
  indexUrl?: string;
  /** "ar" | "fr" | "en" label language. Default "ar". */
  locale?: "ar" | "fr" | "en";
  /** Right-to-left layout. Default true for Arabic. */
  rtl?: boolean;
  /** Extra className for the wrapper (no Tailwind required). */
  className?: string;
  /** Compact (icon-only) vs full button. Default false. */
  compact?: boolean;
}

const LABELS: Record<string, Record<MicState, string>> = {
  ar: { idle: "تلاوة للبحث", listening: "استمع… اضغط للإيقاف", processing: "جارٍ التعرّف…", done: "إعادة المحاولة", error: "حاول مجددًا" },
  fr: { idle: "Réciter pour chercher", listening: "Écoute… arrêter", processing: "Analyse…", done: "Réessayer", error: "Réessayer" },
  en: { idle: "Recite to find", listening: "Listening… stop", processing: "Matching…", done: "Try again", error: "Try again" },
};

const STATUS_LABEL: Record<string, Record<string, string>> = {
  ar: { accept: "مطابق", low: "مطابق جزئيًا", reject: "غير مؤكد" },
  fr: { accept: "Correspondance", low: "Partielle", reject: "Incertain" },
  en: { accept: "Match", low: "Partial", reject: "Uncertain" },
};

/**
 * Optional drop-in mic button. Unstyled by default (inline styles, no Tailwind
 * dependency) — bring your own className. Headless alternative: useVersetDetection.
 */
export function VersetFinderMic({
  onDetect,
  onError,
  lang = "ar-SA",
  surah,
  indexUrl,
  locale = "ar",
  rtl = true,
  className,
  compact = false,
}: VersetFinderMicProps): React.JSX.Element {
  const { state, result, error, supported, start, stop, reset } = useVersetDetection({
    lang,
    surah,
    indexUrl,
    onDetect,
    onError,
  });
  const [open, setOpen] = useState(true);
  const t = LABELS[locale] ?? LABELS.ar;
  const s = STATUS_LABEL[locale] ?? STATUS_LABEL.ar;

  const listening = state === "listening";
  const toggle = () => {
    if (listening) stop();
    else if (state === "done" || state === "error") {
      reset();
      start();
    } else start();
  };

  if (!supported) {
    return (
      <div dir={rtl ? "rtl" : "ltr"} className={className} style={styles.warn} role="alert">
        {locale === "fr"
          ? "⚠️ Reconnaissance vocale non supportée. Utilisez Chrome ou Edge."
          : locale === "en"
            ? "⚠️ Speech recognition not supported. Use Chrome or Edge."
            : "⚠️ التعرّف الصوتي غير مدعوم. استعمل Chrome أو Edge."}
      </div>
    );
  }

  return (
    <div dir={rtl ? "rtl" : "ltr"} className={className} style={styles.wrap}>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={listening}
        aria-label={t[state]}
        style={{ ...styles.button, ...(listening ? styles.listening : null) }}
      >
        <span style={dotStyle(listening)} aria-hidden />
        {compact ? null : <span>{t[state]}</span>}
      </button>
      {state === "processing" ? <span style={styles.hint}>…</span> : null}
      {error && state === "error" ? (
        <div style={styles.error} role="alert">
          {error}
        </div>
      ) : null}
      {result && (result.status === "accept" || result.status === "low") ? (
        <div style={styles.card}>
          <button type="button" onClick={() => setOpen((v) => !v)} style={styles.cardToggle}>
            {s[result.status]} — {result.surah}:{result.ayah}
            {result.spanLength > 1 ? `–${result.endAyah}` : ""} ({Math.round(result.confidence * 100)}%)
          </button>
          {open ? (
            <div style={styles.matched}>{result.matchedText}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function dotStyle(on: boolean): React.CSSProperties {
  return {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: on ? "#dc2626" : "#16a34a",
    flexShrink: 0,
  };
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: "inline-flex", flexDirection: "column", gap: 8, alignItems: "stretch" },
  button: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid #d1d5db",
    borderRadius: 999,
    padding: "8px 16px",
    background: "#fff",
    cursor: "pointer",
    fontSize: 14,
  },
  listening: { borderColor: "#dc2626", background: "#fef2f2" },

  hint: { fontSize: 12, opacity: 0.7 },
  warn: {
    border: "1px solid #f59e0b",
    background: "#fffbeb",
    borderRadius: 8,
    padding: 8,
    fontSize: 13,
  },
  error: { color: "#b91c1c", fontSize: 12 },
  card: { border: "1px solid #e5e7eb", borderRadius: 8, padding: 8, background: "#f9fafb", maxWidth: 360 },
  cardToggle: { background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, padding: 0 },
  matched: { marginTop: 4, fontSize: 15, lineHeight: 2 },
};

export default VersetFinderMic;
