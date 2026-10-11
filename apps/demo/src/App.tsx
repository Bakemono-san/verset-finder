import { useMemo, useState } from "react";
import { QuranIndex, detectAyah } from "@bakemono_san/verset-finder";
import { VersetFinderMic } from "@bakemono_san/verset-finder-react";
import type { DetectionResult } from "@bakemono_san/verset-finder";

// Tiny offline fixture so the demo works with zero network.
const ROWS = [
  { surah: 1, ayah: 1, text: "بسم الله الرحمن الرحيم" },
  { surah: 1, ayah: 2, text: "الحمد لله رب العالمين" },
  { surah: 1, ayah: 3, text: "الرحمن الرحيم" },
  { surah: 112, ayah: 1, text: "قل هو الله أحد" },
  { surah: 112, ayah: 2, text: "الله الصمد" },
];

export function App() {
  const index = useMemo(() => new QuranIndex(ROWS), []);
  const [manual, setManual] = useState("الحمد لله رب العالمين");
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [routed, setRouted] = useState("");

  const onDetect = (r: DetectionResult) => {
    setResult(r);
    // mon-coran wiring: setCurrentSurah(r.surah); setCurrentAyah(r.ayah)
    // Next.js wiring: router.push(`/surah/${r.surah}?ayah=${r.ayah}`)
    setRouted(`surah=${r.surah} ayah=${r.ayah}${r.spanLength > 1 ? ` endAyah=${r.endAyah}` : ""} (${r.status}, ${r.confidence})`);
  };

  return (
    <div dir="rtl" style={{ fontFamily: "system-ui", padding: 24, maxWidth: 640 }}>
      <h1>🎙️ VersetFinder — démo</h1>
      <p>Récitez au micro, ou testez en texte. Le composant redirige vers surah:ayah.</p>

      <h2>1. Composant drop-in</h2>
      <VersetFinderMic locale="ar" onDetect={onDetect} />

      <h2>2. Test manuel (headless core)</h2>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          style={{ flex: 1, padding: 8, fontSize: 16 }}
          dir="rtl"
        />
        <button onClick={() => onDetect(detectAyah(manual, index))}>Détecter</button>
      </div>

      {result ? (
        <pre style={{ background: "#f3f4f6", padding: 12, borderRadius: 8 }}>
          {JSON.stringify({ surah: result.surah, ayah: result.ayah, endAyah: result.endAyah, status: result.status, confidence: result.confidence, matchedText: result.matchedText }, null, 2)}
        </pre>
      ) : null}
      {routed ? <p>🧭 Navigation simulée → <code>{routed}</code></p> : null}

      <h2>3. Intégration (copier-coller)</h2>
      <pre style={{ background: "#111827", color: "#e5e7eb", padding: 12, borderRadius: 8, overflowX: "auto" }}>
{`// mon-coran (React+Vite, état local)
// import { VersetFinderMic } from "@bakemono_san/verset-finder/react";
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
    </div>
  );
}
export default App;
