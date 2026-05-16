# LingoDarling AI

Voice + text companion chat backend powered by **Google Gemini Live API**.
Provides the AI persona, real-time voice streaming, and text chat endpoints
that the Flutter client calls.

This is an **API-only** service. There is no built-in UI in this folder.

---

## Stack

| Layer       | Tech                                              |
| ----------- | ------------------------------------------------- |
| Framework   | FastAPI + uvicorn                                 |
| AI          | Google Gemini (`google-genai` SDK)                |
| Voice       | Gemini Live API (native-audio, bidirectional WS)  |
| Text        | Gemini `generateContent` (SSE streaming)          |
| Persistence | In-memory session store + per-user file memory    |

---

## Quick start

```bash
cd AI
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then put your Gemini API key in .env
uvicorn app.main:app --reload --port 8000
```

Get a Gemini API key at <https://aistudio.google.com/apikey>.

Once the server is running, open <http://127.0.0.1:8000/docs> for the
auto-generated OpenAPI docs.

---

## API endpoints

| Method | Path                                | Purpose                                   |
| ------ | ----------------------------------- | ----------------------------------------- |
| GET    | `/api/characters`                   | List available characters                 |
| POST   | `/api/sessions`                     | Create a chat session (text or voice)     |
| DELETE | `/api/sessions/{session_id}`        | End a session                             |
| POST   | `/api/chat/text`                    | Streamed text reply (Server-Sent Events)  |
| WS     | `/api/chat/voice?session_id=...`    | Bidirectional voice (Live API bridge)     |
| GET    | `/health`                           | Liveness check                            |

### Voice WebSocket protocol

Client → server (JSON, one message per chunk):
```json
{"type": "audio", "data": "<base64 PCM16 16kHz mono>"}
{"type": "text",  "text":  "..."}
```

Server → client (JSON):
```json
{"type": "caption_user", "text": "..."}     // user speech transcript (chunks)
{"type": "caption_char", "text": "..."}     // character speech transcript (chunks)
{"type": "audio", "data": "<base64 PCM16 24kHz>"}  // character voice
{"type": "turn_complete"}                    // one model turn finished
{"type": "interrupted"}                      // model was cut off
{"type": "error", "message": "..."}
```

### Text SSE protocol

```
data: {"type": "chunk", "text": "..."}\n\n
data: {"type": "done", "full_text": "..."}\n\n
data: {"type": "error", "message": "..."}\n\n
```

---

## Characters

Defined in [`characters.py`](characters.py). Each entry pins:

- `target_language`: `"ja"` or `"ko"`
- `voice`: a Gemini prebuilt voice (see [`voices.py`](voices.py))
- `model`: Live API model ID
- Persona / speech style / personality / catchphrases

The system prompt is assembled from these fields plus the shared language
rules in [`characters.py`](characters.py).

To add a character, append a new entry to the `CHARACTERS` dict.

---

## Known limitations

- **Native-audio Live API multi-turn quirks**: certain inputs occasionally
  trigger a server-side `1011 Internal error`. The client (Flutter) should
  reconnect transparently. See git history for the receive-loop / config
  tuning we did to mitigate this.
- **In-memory sessions**: session state lives in process memory. Restarting
  the server drops every active session. Long-term persistence belongs in
  the main LingoDarling backend (Supabase), not here.
- **Per-user file memory**: `memory/{user_id}/{character_key}/` holds
  `summary.md` and `facts.md`. Memory injection is currently disabled in
  the chat path (see code comments) until the consolidation prompt is
  tightened. The folder itself is gitignored.

---

## Layout

```
AI/
├── app/
│   ├── main.py              FastAPI app, CORS, routers
│   ├── config.py            Constants (model IDs, sample rates, paths)
│   ├── deps.py              Shared deps (Gemini client)
│   ├── schemas.py           Pydantic request/response models
│   ├── routers/             HTTP + WS endpoints
│   └── services/            Live API bridge, text streaming, memory
├── characters.py            4 character personas + system-prompt builder
├── voices.py                Available Gemini voices
├── requirements.txt
├── .env.example
└── memory/                  Per-user files (gitignored)
```
