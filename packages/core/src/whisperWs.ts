/**
 * Optional streaming transcription over WebSocket.
 * Protocol mirrors Tarteel frontend/lib/useRecitationWebSocket.ts:
 * send binary audio chunks, receive JSON { text | transcript, isFinal }.
 */
export interface WsTranscribeOptions {
  wsUrl: string;
  /** PCM16/Opus chunks produced by the caller (e.g. streamingRecorder) */
  onText?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  protocols?: string | string[];
}

export interface WsSession {
  send(chunk: ArrayBuffer | Blob): void;
  close(): void;
  readonly socket: WebSocket;
}

export function transcribeLive(opts: WsTranscribeOptions): WsSession {
  if (typeof WebSocket === "undefined") throw new Error("websocket-not-supported");
  const socket = new WebSocket(opts.wsUrl, opts.protocols);
  socket.binaryType = "arraybuffer";
  socket.onmessage = (ev) => {
    try {
      const data = JSON.parse(String(ev.data)) as { text?: string; transcript?: string; isFinal?: boolean; is_final?: boolean };
      const text = data.text ?? data.transcript ?? "";
      if (text) opts.onText?.(text, data.isFinal ?? data.is_final ?? false);
    } catch {
      if (typeof ev.data === "string" && ev.data) opts.onText?.(ev.data, false);
    }
  };
  socket.onerror = () => opts.onError?.("ws-error");
  return {
    socket,
    send(chunk) {
      if (socket.readyState === WebSocket.OPEN) socket.send(chunk as ArrayBuffer);
    },
    close() {
      try {
        socket.close();
      } catch {
        /* noop */
      }
    },
  };
}
