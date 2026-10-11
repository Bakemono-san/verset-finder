/**
 * Quran data loading: prebuilt index JSON -> IndexedDB -> network (alquran.cloud).
 * NOTE: the full Hafs text (~2.5MB) is NEVER bundled into dist — it is loaded
 * at runtime via `indexUrl`, IndexedDB cache, or live fetch. This keeps the
 * core bundle <30KB gz. See scripts/build-index.mjs (emits data/quran-simple.json).
 */
import { QuranIndex } from "./trigramIndex.js";
import { loadCachedIndex, saveCachedIndex } from "./cache.js";
import type { SerializedIndex } from "./types.js";

export interface LoadDataOptions {
  /** URL of a prebuilt index JSON or raw quran JSON (e.g. "/verset-finder-index.json"). */
  indexUrl?: string;
  edition?: string;
  fetchFn?: typeof fetch;
  /** Set false to skip IndexedDB. */
  useCache?: boolean;
}

function toRows(payload: unknown): Array<{ surah: number; ayah: number; number?: number; text: string }> {
  const root = payload as Record<string, unknown>;
  const data = (root.data ?? root) as Record<string, unknown>;
  const surahs = data.surahs as
    | Array<{ number: number; ayahs: Array<{ number: number; numberInSurah: number; text: string }> }>
    | undefined;
  if (Array.isArray(surahs)) {
    return surahs.flatMap((s) =>
      (s.ayahs ?? []).map((a) => ({ surah: s.number, ayah: a.numberInSurah, number: a.number, text: a.text })),
    );
  }
  return [];
}

/** Load (or build) the Quran trigram index. Headless; works in Node 18+. */
export async function loadQuranIndex(opts: LoadDataOptions = {}): Promise<QuranIndex> {
  const edition = opts.edition ?? "quran-simple";
  const fetchFn = opts.fetchFn ?? fetch;

  if (opts.useCache !== false) {
    try {
      const cached = await loadCachedIndex();
      if (cached?.ayahs?.length) return QuranIndex.fromJSON(cached);
    } catch {
      /* fall through */
    }
  }

  // 1. Hosted / bundled prebuilt JSON (app copies data/quran-simple.json to public/).
  if (opts.indexUrl) {
    const res = await fetchFn(opts.indexUrl);
    if (!res.ok) throw new Error(`quran-data-fetch-failed:${res.status}`);
    const json = (await res.json()) as SerializedIndex | unknown;
    let idx: QuranIndex;
    if ((json as SerializedIndex).ayahs?.length) {
      idx = QuranIndex.fromJSON(json as SerializedIndex);
    } else {
      const rows = toRows(json);
      if (!rows.length) throw new Error("quran-data-empty");
      idx = new QuranIndex(rows, edition);
    }
    if (opts.useCache !== false) saveCachedIndex(idx.toJSON()).catch(() => {});
    return idx;
  }

  // 2. Live fetch from alquran.cloud (Hafs quran-simple, 6236 ayahs).
  const res = await fetchFn("https://api.alquran.cloud/v1/quran/quran-simple");
  if (!res.ok) throw new Error(`quran-data-fetch-failed:${res.status}`);
  const rows = toRows(await res.json());
  if (!rows.length) throw new Error("quran-data-empty");
  const idx = new QuranIndex(rows, edition);
  if (opts.useCache !== false) saveCachedIndex(idx.toJSON()).catch(() => {});
  return idx;
}
