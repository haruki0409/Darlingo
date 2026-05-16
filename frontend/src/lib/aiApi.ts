/**
 * LingoDarling AI 서버 클라이언트.
 *
 * AI/ 폴더(FastAPI + Gemini Live)의 모든 엔드포인트를 프론트에서 호출하는 얇은 래퍼.
 *   - GET    /api/characters                     캐릭터 목록
 *   - GET    /api/characters/{key}               캐릭터 단건 (시스템 프롬프트 프리뷰)
 *   - POST   /api/sessions                       세션 생성 (text|voice)
 *   - GET    /api/sessions/{id}                  세션 상태
 *   - DELETE /api/sessions/{id}                  세션 종료
 *   - POST   /api/chat/text   (SSE)              텍스트 채팅 스트리밍
 *   - WS     /api/chat/voice?session_id=...      음성 양방향 (Live API 브릿지)
 *   - GET    /api/memory/{user}/{char}           장기 기억 조회
 *   - DELETE /api/memory/{user}/{char}           장기 기억 초기화
 */

const AI_BASE = (
  process.env.NEXT_PUBLIC_AI_API_URL ?? "http://127.0.0.1:8001"
).replace(/\/+$/, "");

/** REST base (http/https). */
export function aiBase(): string {
  return AI_BASE;
}

/** 음성 WebSocket base — http→ws, https→wss. */
export function aiWsBase(): string {
  return AI_BASE.replace(/^http/i, (m) => (m.toLowerCase() === "https" ? "wss" : "ws"));
}

// ============================================================
//  타입 (AI/app/schemas.py 와 1:1)
// ============================================================

export type ChatMode = "text" | "voice";

export type CharacterMeta = {
  key: string;
  name: string;
  age: number;
  target_language: string; // "ja" | "ko"
  language_code: string; // "ja-JP" | "ko-KR"
  description: string;
  voice: string;
  voice_tone: string;
  voice_gender: string; // "M" | "F" | "N"
  model: string;
  audition_sample: string;
};

export type SessionInfo = {
  session_id: string;
  user_id: string;
  character_key: string;
  mode: ChatMode;
  created_at: string;
  turn_count: number;
};

export type MemorySnapshot = {
  user_id: string;
  character_key: string;
  summary: string;
  facts: string;
};

/** POST /api/chat/text 가 SSE 로 흘리는 이벤트. */
export type TextEvent =
  | { type: "chunk"; text: string }
  | { type: "done"; full_text: string }
  | { type: "error"; message: string };

// ============================================================
//  REST
// ============================================================

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${AI_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body?.detail ?? detail;
    } catch {
      // ignore
    }
    throw new Error(`AI ${res.status}: ${detail}`);
  }
  return (await res.json()) as T;
}

export function listCharacters(): Promise<CharacterMeta[]> {
  return jsonFetch<CharacterMeta[]>("/api/characters");
}

export function getCharacter(
  key: string,
): Promise<CharacterMeta & { system_instruction_preview: string }> {
  return jsonFetch(`/api/characters/${encodeURIComponent(key)}`);
}

export function createSession(
  userId: string,
  characterKey: string,
  mode: ChatMode,
): Promise<SessionInfo> {
  return jsonFetch<SessionInfo>("/api/sessions", {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      character_key: characterKey,
      mode,
    }),
  });
}

export function getSession(sessionId: string): Promise<SessionInfo> {
  return jsonFetch<SessionInfo>(`/api/sessions/${encodeURIComponent(sessionId)}`);
}

/** 세션 종료. 실패해도 조용히 무시 (정리 목적 호출). */
export async function endSession(sessionId: string): Promise<void> {
  try {
    await fetch(`${AI_BASE}/api/sessions/${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
      keepalive: true,
    });
  } catch {
    // best-effort
  }
}

export function getMemory(
  userId: string,
  characterKey: string,
): Promise<MemorySnapshot> {
  return jsonFetch<MemorySnapshot>(
    `/api/memory/${encodeURIComponent(userId)}/${encodeURIComponent(characterKey)}`,
  );
}

export async function resetMemory(
  userId: string,
  characterKey: string,
): Promise<void> {
  await jsonFetch(
    `/api/memory/${encodeURIComponent(userId)}/${encodeURIComponent(characterKey)}`,
    { method: "DELETE" },
  );
}

// ============================================================
//  텍스트 채팅 — SSE 스트림 파서
// ============================================================

/**
 * POST /api/chat/text 를 호출하고 SSE 이벤트를 하나씩 yield.
 *
 * SSE 한 덩어리 = `data: {json}\n\n`. EventSource 는 GET 만 되므로
 * fetch + ReadableStream 으로 직접 파싱한다.
 */
export async function* streamText(
  sessionId: string,
  message: string,
  signal?: AbortSignal,
): AsyncGenerator<TextEvent> {
  const res = await fetch(`${AI_BASE}/api/chat/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, message }),
    signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`AI ${res.status}: 텍스트 채팅 스트림을 열 수 없어요`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      let sep: number;
      while ((sep = buf.indexOf("\n\n")) >= 0) {
        const block = buf.slice(0, sep);
        buf = buf.slice(sep + 2);

        const dataLine = block
          .split("\n")
          .find((l) => l.startsWith("data:"));
        if (!dataLine) continue;

        const json = dataLine.slice(5).trim();
        if (!json) continue;
        try {
          yield JSON.parse(json) as TextEvent;
        } catch {
          // 깨진 라인은 스킵
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
