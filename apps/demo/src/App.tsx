import { useMemo, useState } from "react";
import { QuranIndex, detectAyah } from "@bakemono-san/verset-finder";
import { VersetFinderMic } from "@bakemono-san/verset-finder-react";
import type { DetectionResult } from "@bakemono-san/verset-finder";

// Tiny offline fixture so the manual test works with zero network.
const ROWS = [
  { surah: 1, ayah: 1, text: "بسم الله الرحمن الرحيم" },
  { surah: 1, ayah: 2, text: "الحمد لله رب العالمين" },
  { surah: 1, ayah: 3, text: "الرحمن الرحيم" },
  { surah: 112, ayah: 1, text: "قل هو الله أحد" },
  { surah: 112, ayah: 2, text: "الله الصمد" },
  { surah: 112, ayah: 3, text: "لم يلد ولم يولد" },
  { surah: 112, ayah: 4, text: "ولم يكن له كفوا أحد" },
];

const STATUS_COLOR: Record<string, string> = { accept: "#059669", low: "#d97706", reject: "#6b7280" };

export function App() {
  const index = useMemo(() => new QuranIndex(ROWS), []);
  const [manual, setManual] = useState("قل هو الله أحد الله الصمد");
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [routed, setRouted] = useState("");

  const onDetect = (r: DetectionResult) => {
    setResult(r);
    // mon-coran wiring: setCurrentSurah(r.surah); setCurrentAyah(r.ayah)
    // Next.js wiring: router.push(`/surah/${r.surah}?ayah=${r.ayah}`)
    setRouted(
      r.status === "reject"
        ? `rejeté (confiance ${Math.round(r.confidence * 100)}%) — essayez de réciter plus nettement`
        : `surah=${r.surah} ayah=${r.ayah}${r.spanLength > 1 ? ` endAyah=${r.endAyah}` : ""} (${r.status}, ${Math.round(r.confidence * 100)}%)`,
    );
  };

  return (
    <div dir="ltr" style={s.page}>
      <header style={s.header}>
        <h1 style={s.h1}>🎙️ VersetFinder — démo</h1>
        <p style={s.sub}>Récitez au micro, ou testez en texte. Le composant redirige vers <code>surah:ayah</code>.</p>
      </header>

      <section style={s.card}>
        <h2 style={s.h2}>1 · Composant drop-in <span style={s.tag}>full Quran · 6236 versets</span></h2>
        <VersetFinderMic locale="ar" indexUrl="/verset-finder-index.json" onDetect={onDetect} />
      </section>

      <section style={s.card}>
        <h2 style={s.h2}>2 · Test manuel <span style={s.tag}>headless core · 7 versets</span></h2>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            style={s.input}
            dir="rtl"
            placeholder="اكتب آية…"
          />
          <button onClick={() => onDetect(detectAyah(manual, index))} style={s.btn}>
            Détecter
          </button>
        </div>
      </section>

      {result ? (
        <section style={{ ...s.card, borderColor: `${STATUS_COLOR[result.status]}66` }}>
          <div style={s.resHead}>
            <span style={{ ...s.badge, background: STATUS_COLOR[result.status] }}>
              {result.status} · {Math.round(result.confidence * 100)}%
            </span>
            {result.status !== "reject" ? (
              <strong style={s.ref}>
                {result.surah}:{result.ayah}
                {result.spanLength > 1 ? `–${result.endAyah}` : ""}
              </strong>
            ) : null}
          </div>
          {result.matchedText ? <p style={s.matched} dir="rtl">{result.matchedText}</p> : null}
          <details style={s.details}>
            <summary>JSON brut</summary>
            <pre style={s.pre}>
              {JSON.stringify(
                { surah: result.surah, ayah: result.ayah, endAyah: result.endAyah, status: result.status, confidence: result.confidence, transcript: result.transcript },
                null, 2,
              )}
            </pre>
          </details>
        </section>
      ) : null}
      {routed ? <p style={s.routed}>🧭 Navigation simulée → <code>{routed}</code></p> : null}

      <section style={s.card}>
        <h2 style={s.h2}>3 · Intégration <span style={s.tag}>copier-coller</span></h2>
        <pre style={s.code}>
{`// mon-coran (React+Vite, état local)
// import { VersetFinderMic } from "@bakemono-san/verset-finder-react";
<VersetFinderMic onDetect={(r) => {
  if (r.status === "reject") return;
  setCurrentSurah(r.surah); setCurrentAyah(r.ayah);
}} />

// Next.js (quran-com-clone)
// import { useRouter } from "next/router";
<VersetFinderMic onDetect={(r) => {
  if (r.status === "reject") return;
  router.push(\`/surah/\${r.surah}?ayah=\${r.ayah}\`);
}} />`}
        </pre>
      </section>
    </div>
  );
}
export default App;

const s: Record<string, React.CSSProperties> = {
  page: { fontFamily: "system-ui, sans-serif", padding: 24, maxWidth: 680, margin: "0 auto", background: "#f8fafc", minHeight: "100vh", color: "#111827" },
  header: { marginBottom: 16 },
  h1: { fontSize: 26, margin: "0 0 4px" },
  sub: { color: "#4b5563", margin: 0 },
  card: { background: "#fff", borderWidth: 1, borderStyle: "solid", borderColor: "#e5e7eb", borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" },
  h2: { fontSize: 16, margin: "0 0 12px" },
  tag: { fontSize: 11, fontWeight: 600, color: "#059669", background: "#ecfdf5", borderRadius: 999, padding: "2px 8px", marginInlineStart: 6, whiteSpace: "nowrap" },
  input: { flex: 1, padding: "10px 12px", fontSize: 16, borderWidth: 1, borderStyle: "solid", borderColor: "#d1d5db", borderRadius: 8 },
  btn: { padding: "10px 18px", fontSize: 14, fontWeight: 700, color: "#fff", background: "#059669", borderWidth: 0, borderStyle: "none", borderRadius: 8, cursor: "pointer" },
  resHead: { display: "flex", alignItems: "center", gap: 10, marginBottom: 4 },
  badge: { color: "#fff", fontSize: 12, fontWeight: 700, borderRadius: 999, padding: "3px 10px" },
  ref: { fontSize: 18 },
  matched: { fontSize: 20, lineHeight: 2.1, margin: "8px 0" },
  details: { fontSize: 12, color: "#4b5563" },
  pre: { background: "#f3f4f6", padding: 12, borderRadius: 8, overflowX: "auto", fontSize: 12 },
  routed: { background: "#ecfdf5", borderWidth: 1, borderStyle: "solid", borderColor: "#a7f3d0", borderRadius: 8, padding: "8px 12px", fontSize: 14 },
  code: { background: "#111827", color: "#e5e7eb", padding: 12, borderRadius: 8, overflowX: "auto", fontSize: 12, margin: 0 },
};
