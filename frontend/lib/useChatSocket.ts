"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Role = "user" | "companion";

export interface Message {
  id: string;
  role: Role;
  text: string;
  /** True while companion tokens are still streaming in. */
  streaming?: boolean;
}

type ServerEvent =
  | { type: "chunk"; text: string }
  | { type: "done" }
  | { type: "error"; text: string };

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws/chat";

function uid(): string {
  return Math.random().toString(36).slice(2);
}

/**
 * Manages the chat WebSocket: connection state, the message list, and
 * appending streamed companion tokens into the latest message.
 */
export function useChatSocket() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (event) => {
      const data: ServerEvent = JSON.parse(event.data);

      if (data.type === "chunk") {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === "companion" && last.streaming) {
            // Append to the in-progress companion message.
            return [
              ...prev.slice(0, -1),
              { ...last, text: last.text + data.text },
            ];
          }
          // First chunk of a new companion message.
          return [
            ...prev,
            { id: uid(), role: "companion", text: data.text, streaming: true },
          ];
        });
      } else if (data.type === "done") {
        setBusy(false);
        setMessages((prev) =>
          prev.map((m) => (m.streaming ? { ...m, streaming: false } : m)),
        );
      } else if (data.type === "error") {
        setBusy(false);
        setMessages((prev) => [
          ...prev,
          { id: uid(), role: "companion", text: `⚠️ ${data.text}` },
        ]);
      }
    };

    return () => ws.close();
  }, []);

  const send = useCallback(
    (text: string, language: string, level: string) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN || !text.trim()) return;

      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "user", text },
      ]);
      setBusy(true);
      ws.send(JSON.stringify({ message: text, language, level }));
    },
    [],
  );

  return { messages, connected, busy, send };
}
