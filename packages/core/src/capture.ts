/**
 * Mic capture helper (MediaRecorder) for REST/WS providers.
 * Browser-only at call time; importing this module in Node is safe.
 */

export interface CaptureHandle {
  stop(): Promise<Blob>;
  cancel(): void;
}

export async function captureAudio(maxMs = 15_000, mimeType?: string): Promise<Blob> {
  const handle = await startCapture(mimeType);
  await new Promise((r) => setTimeout(r, maxMs));
  return handle.stop();
}

export async function startCapture(mimeType?: string): Promise<CaptureHandle> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("capture-not-supported");
  }
  if (typeof MediaRecorder === "undefined") throw new Error("media-recorder-unavailable");
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const candidates = [mimeType, "audio/webm;codecs=opus", "audio/webm", "audio/mp4"].filter(
    (x): x is string => Boolean(x),
  );
  let rec: MediaRecorder | null = null;
  let chosen = "";
  for (const mt of candidates) {
    try {
      if (mt && !MediaRecorder.isTypeSupported(mt)) continue;
      rec = new MediaRecorder(stream, mt ? { mimeType: mt } : undefined);
      chosen = mt;
      break;
    } catch {
      continue;
    }
  }
  if (!rec) {
    try {
      rec = new MediaRecorder(stream);
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      throw new Error("media-recorder-unavailable");
    }
  }
  const recorder: MediaRecorder = rec;
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e: BlobEvent) => {
    if (e.data.size) chunks.push(e.data);
  };
  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      resolve(new Blob(chunks, { type: chosen || "audio/webm" }));
    };
  });
  recorder.start(250);
  let settled = false;
  return {
    stop: async () => {
      if (settled) return done;
      settled = true;
      if (recorder.state !== "inactive") recorder.stop();
      return done;
    },
    cancel: () => {
      if (settled) return;
      settled = true;
      try {
        if (recorder.state !== "inactive") recorder.stop();
      } catch {
        /* noop */
      }
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}
