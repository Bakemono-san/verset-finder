/** Optional server verification via Tarteel-compatible REST: POST /api/transcribe */
import type { ServerVerifyResult } from "./types.js";

export interface RestTranscribeOptions {
  baseUrl: string;
  fetchFn?: typeof fetch;
  /** Extra form fields merged into the multipart body */
  extraFields?: Record<string, string>;
}

/** POST audio blob -> { text } (expects { text | transcript } in JSON). */
export async function transcribeRest(audio: Blob, opts: RestTranscribeOptions): Promise<string> {
  const fetchFn = opts.fetchFn ?? fetch;
  if (!opts.baseUrl) throw new Error("baseUrl-required");
  const form = new FormData();
  form.append("audio", audio, "recitation.webm");
  for (const [k, v] of Object.entries(opts.extraFields ?? {})) form.append(k, v);
  const res = await fetchFn(`${opts.baseUrl.replace(/\/$/, "")}/api/transcribe`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`transcribe-failed:${res.status}`);
  const data = (await res.json()) as { text?: string; transcript?: string };
  return data.text ?? data.transcript ?? "";
}

/** POST /api/speech/add-tashkeel { text, context: "quran" } -> verse hints. */
export async function verifyWithServer(
  text: string,
  opts: { baseUrl: string; fetchFn?: typeof fetch },
): Promise<ServerVerifyResult> {
  const fetchFn = opts.fetchFn ?? fetch;
  const res = await fetchFn(`${opts.baseUrl.replace(/\/$/, "")}/api/speech/add-tashkeel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, context: "quran" }),
  });
  if (!res.ok) throw new Error(`verify-failed:${res.status}`);
  const raw = (await res.json()) as {
    with_tashkeel?: string;
    withTashkeel?: string;
    detected_ayahs?: Array<{ surah: number; ayah: number; similarity?: number }>;
    detectedAyahs?: Array<{ surah: number; ayah: number; similarity?: number }>;
  };
  return {
    withTashkeel: raw.with_tashkeel ?? raw.withTashkeel,
    detectedAyahs: raw.detected_ayahs ?? raw.detectedAyahs,
    raw,
  };
}
