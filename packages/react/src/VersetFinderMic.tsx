import React, { useId, useState } from "react";
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
  /** Accent color for the mic button. Default emerald "#059669". */
  accent?: string;
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

const INDEX_LABEL: Record<string, string> = {
  ar: "جارٍ تحميل المصحف…",
  fr: "Chargement du Coran…",
  en: "Loading Quran index…",
};

const READY_LABEL: Record<string, (n: string) => string> = {
  ar: (n) => `${n} آية جاهزة للبحث`,
  fr: (n) => `${n} versets prêts`,
  en: (n) => `${n} ayahs ready`,
};

const MIC_GLYPH = "🎙️";
const STOP_GLYPH = "⏹";

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
  accent = "#059669",
}: VersetFinderMicProps): React.JSX.Element {
  const {
    state, result, error, supported, transcript, interim,
    indexReady, ayahCount, start, stop, reset,
  } = useVersetDetection({ lang, surah, indexUrl, onDetect, onError });
  const [open, setOpen] = useState(true);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const t = LABELS[locale] ?? LABELS.ar;
  const s = STATUS_LABEL[locale] ?? STATUS_LABEL.ar;

  const listening = state === "listening";
  const busy = listening || state === "processing";
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

  const statusColor = !result ? accent : result.status === "accept" ? "#059669" : result.status === "low" ? "#d97706" : "#6b7280";
  const pct = result ? Math.round(result.confidence * 100) : 0;

  return (
    <div dir={rtl ? "rtl" : "ltr"} className={className} style={styles.wrap}>
      {/* Scoped keyframes: pulse ring while listening, shimmer while processing */}
      <style>{`
        @keyframes vf-pulse-${uid} {
          0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.45); }
          70% { box-shadow: 0 0 0 12px rgba(220, 38, 38, 0); }
          100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
        }
        @keyframes vf-blink-${uid} { 0%, 100% { opacity: 0.25; } 50% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .vf-live-${uid} { animation: none !important; }
        }
      `}</style>

      <div style={styles.row}>
        <button
          type="button"
          onClick={toggle}
          aria-pressed={listening}
          aria-label={t[state]}
          className={busy ? `vf-live-${uid}` : undefined}
          style={{
            ...styles.button,
            ...(listening
              ? { ...styles.listening, animation: `vf-pulse-${uid} 1.6s ease-out infinite` }
              : { borderColor: "#d1d5db", background: "#ffffff" }),
          }}
        >
          <span style={styles.glyph} aria-hidden>{listening ? STOP_GLYPH : MIC_GLYPH}</span>
          {compact ? null : <span style={styles.btnLabel}>{t[state]}</span>}
          <span
            aria-hidden
            style={{
              ...styles.dot,
              background: listening ? "#dc2626" : state === "done" ? statusColor : accent,
            }}
          />
        </button>
        {state === "processing" ? (
          <span style={styles.hint} className={`vf-live-${uid}`} aria-hidden>
            <span style={{ ...styles.dots, animation: `vf-blink-${uid} 1.2s infinite` }}>•••</span>
          </span>
        ) : null}
      </div>

      {!indexReady && state !== "error" ? (
        <span style={styles.hint}>{INDEX_LABEL[locale] ?? INDEX_LABEL.ar}</span>
      ) : null}
      {indexReady && ayahCount > 0 && state === "idle" && !transcript ? (
        <span style={styles.hint}>
          {(READY_LABEL[locale] ?? READY_LABEL.ar)(ayahCount.toLocaleString(locale === "fr" ? "fr-FR" : locale === "en" ? "en-US" : "ar-EG"))}
        </span>
      ) : null}

      {transcript ? (
        <div style={styles.transcript} dir="rtl" aria-live="polite">
          <span>{transcript.replace(interim, "").trim()}</span>
          {interim ? <span style={styles.interim}> {interim}</span> : null}
        </div>
      ) : null}

      {error && state === "error" ? (
        <div style={styles.error} role="alert">
          ⚠️ {error}
        </div>
      ) : null}

      {result && (result.status === "accept" || result.status === "low") ? (
        <div style={{ ...styles.card, borderColor: `${statusColor}55` }}>
          <div style={styles.cardHead}>
            <span style={{ ...styles.badge, background: statusColor }}>
              {s[result.status]} · {pct}%
            </span>
            <span style={styles.ref}>
              {result.surah}:{result.ayah}
              {result.spanLength > 1 ? `–${result.endAyah}` : ""}
            </span>
            <button type="button" onClick={() => setOpen((v) => !v)} style={styles.cardToggle} aria-expanded={open}>
              {open ? "▾" : "▸"}
            </button>
          </div>
          <div style={styles.bar}>
            <div style={{ ...styles.barFill, width: `${pct}%`, background: statusColor }} />
          </div>
          {open ? <div style={styles.matched} dir="rtl">{result.matchedText}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: "inline-flex", flexDirection: "column", gap: 8, alignItems: "stretch", maxWidth: 420 },
  row: { display: "flex", alignItems: "center", gap: 8 },
  // NOTE: longhand border-* only — never mix `border` shorthand with
  // `borderColor` (React warns and drops the longhand on rerender).
  button: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#d1d5db",
    borderRadius: 999,
    padding: "10px 18px",
    background: "#ffffff",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
    color: "#111827",
    transition: "background 0.2s, border-color 0.2s, transform 0.1s",
  },
  listening: { borderColor: "#dc2626", background: "#fef2f2", color: "#991b1b" },
  glyph: { fontSize: 18, lineHeight: 1 },
  btnLabel: { lineHeight: 1.4 },
  dot: { width: 10, height: 10, borderRadius: "50%", flexShrink: 0 },

  dots: { fontSize: 14, letterSpacing: 2 },
  hint: { fontSize: 12, opacity: 0.7 },
  warn: {
    borderWidth: 1, borderStyle: "solid", borderColor: "#f59e0b",
    background: "#fffbeb", borderRadius: 8, padding: 8, fontSize: 13,
  },
  error: {
    color: "#b91c1c", background: "#fef2f2",
    borderWidth: 1, borderStyle: "solid", borderColor: "#fecaca",
    borderRadius: 8, padding: "6px 10px", fontSize: 12,
  },
  transcript: {
    fontSize: 15, lineHeight: 2, color: "#111827",
    background: "#f9fafb",
    borderWidth: 1, borderStyle: "solid", borderColor: "#e5e7eb",
    borderRadius: 8, padding: "6px 12px",
  },
  interim: { color: "#9ca3af" },
  card: {
    borderWidth: 1, borderStyle: "solid", borderColor: "#e5e7eb",
    borderRadius: 12, padding: 10, background: "#ffffff",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)", maxWidth: 420,
  },
  cardHead: { display: "flex", alignItems: "center", gap: 8 },
  badge: {
    color: "#fff", fontSize: 12, fontWeight: 700,
    borderRadius: 999, padding: "3px 10px", whiteSpace: "nowrap",
  },
  ref: { fontSize: 15, fontWeight: 800, color: "#111827" },
  cardToggle: {
    marginInlineStart: "auto", background: "transparent",
    borderWidth: 0, borderStyle: "none", cursor: "pointer",
    fontSize: 14, color: "#6b7280", padding: "2px 6px",
  },
  bar: { marginTop: 8, height: 6, borderRadius: 999, background: "#f3f4f6", overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 999, transition: "width 0.3s" },
  matched: { marginTop: 8, fontSize: 17, lineHeight: 2.1, color: "#111827" },
};

export default VersetFinderMic;
