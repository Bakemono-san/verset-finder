/** Bring-your-own provider: wrap any STT/noise pipeline behind SpeechProvider. */
import type { ErrorHandler, SpeechProvider, TranscriptHandler } from "./providers.js";

export interface CustomProviderHooks {
  onStart?: (opts: { lang?: string; signal: AbortSignal }) => void | Promise<void>;
  onStop?: () => void | Promise<void>;
  pushResult?: (emit: (text: string, isFinal: boolean) => void) => void;
}

/** Minimal helper to build a custom SpeechProvider from callbacks. */
export function createCustomProvider(name: string, hooks: CustomProviderHooks): SpeechProvider {
  let controller: AbortController | null = null;
  let onResult: TranscriptHandler | undefined;
  let onError: ErrorHandler | undefined;
  return {
    name,
    isSupported: () => true,
    async start(opts) {
      controller = new AbortController();
      onResult = opts?.onResult;
      onError = opts?.onError;
      try {
        await hooks.onStart?.({ lang: opts?.lang, signal: controller.signal });
        hooks.pushResult?.((text, isFinal) => onResult?.(text, isFinal));
      } catch (err) {
        onError?.(err instanceof Error ? err.message : "custom-start-failed");
      }
    },
    async stop() {
      try {
        await hooks.onStop?.();
      } finally {
        controller?.abort();
        controller = null;
      }
    },
    abort() {
      controller?.abort();
      controller = null;
    },
  };
}
