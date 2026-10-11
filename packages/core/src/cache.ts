/**
 * IndexedDB cache for the built trigram index — mirrors
 * mon-coran/src/services/dbService.js (idb pattern) without adding a dep.
 * No-op in Node / SSR (falls back to memory).
 */
import type { SerializedIndex } from "./types.js";

const DB = "verset-finder";
const STORE = "index";
const KEY = "quran-trigram-v1";

let memory: SerializedIndex | null = null;

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  return openDb().then((db) => {
    if (!db) return null;
    return new Promise<T | null>((resolve) => {
      try {
        const t = db.transaction(STORE, mode);
        const store = t.objectStore(STORE);
        const req = run(store);
        req.onsuccess = () => {
          resolve((req.result as T) ?? null);
          db.close();
        };
        req.onerror = () => {
          resolve(null);
          db.close();
        };
      } catch {
        resolve(null);
      }
    });
  });
}

export async function loadCachedIndex(maxAgeMs = 30 * 24 * 3600 * 1000): Promise<SerializedIndex | null> {
  if (memory) return memory;
  const row = await tx<{ data: SerializedIndex; ts: number }>("readonly", (s) => s.get(KEY));
  if (!row?.data) return null;
  if (Date.now() - row.ts > maxAgeMs) return null;
  memory = row.data;
  return row.data;
}

export async function saveCachedIndex(data: SerializedIndex): Promise<void> {
  memory = data;
  await tx("readwrite", (s) => s.put({ data, ts: Date.now() }, KEY));
}

export async function clearCachedIndex(): Promise<void> {
  memory = null;
  await tx("readwrite", (s) => s.delete(KEY));
}
