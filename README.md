# Bridge

An AI companion language-learning app — chat with a friendly AI companion while
learning **Korean** and **Japanese**.

## Stack

| Layer    | Tech                                          |
| -------- | --------------------------------------------- |
| Client   | Flutter (`flutter_app/`) — Web + Android       |
| Backend  | FastAPI (Python)                              |
| AI       | Gemini API (chat; voice & images in later phases) |
| Database | Supabase Postgres (async SQLAlchemy)          |
| Auth     | Supabase Auth (JWT verified by FastAPI)       |

## Phase 1 — what works now

A streaming text chat with a companion persona (`Yuna` for Korean, `Yuki` for
Japanese) that adapts to a chosen level (beginner / intermediate / advanced).
Replies stream token-by-token over a WebSocket and include a short English
gloss. Users sign in with Supabase Auth, and every message is persisted to
Postgres — conversations survive reconnects.

**Not yet built** (later phases): word lookup / tokenization, spaced
repetition, voice, and selfies.

## Running locally

### 1. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then add your Gemini API key
uvicorn app.main:app --reload --port 8000
```

Get a Gemini API key at <https://aistudio.google.com/apikey>.

### 2. Client (Flutter)

```bash
cd flutter_app
flutter create . --platforms=web,android   # one-time: generate platform files
flutter pub get
flutter run -d chrome \
  --dart-define=SUPABASE_URL=https://<ref>.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=<anon-key> \
  --dart-define=WS_URL=ws://localhost:8000/ws/chat
```

See `flutter_app/README.md` for details.

## Project layout

```
bridge/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app, CORS, startup
│   │   ├── config.py                # env-based settings
│   │   ├── db.py                    # async SQLAlchemy engine + session
│   │   ├── models.py                # users, conversations, messages
│   │   ├── auth.py                  # Supabase JWT verification
│   │   ├── persona.py               # companion system prompt
│   │   └── routes/
│   │       ├── chat.py              # /ws/chat WebSocket → Gemini stream
│   │       └── conversations.py     # REST: history endpoints
│   ├── scripts/smoke_test.py        # end-to-end backend test
│   └── requirements.txt
└── flutter_app/                     # client — Web + Android
    └── lib/
        ├── main.dart                # entry, Supabase init, AuthGate
        ├── config.dart              # build-time config
        ├── models/message.dart
        ├── services/chat_socket.dart
        └── screens/{login,chat}_screen.dart
```

## API contract

- `WS /ws/chat?token=<supabase_jwt>[&conversation_id=<uuid>]` — streaming chat.
  Server emits `{type:"conversation",id}`, then `{type:"chunk",text}`…,
  then `{type:"done"}` (or `{type:"error",text}`).
- `GET /conversations` — list the user's conversations (Bearer token).
- `GET /conversations/{id}/messages` — messages in one conversation.

## Roadmap

| Phase | Adds                                             |
| ----- | ------------------------------------------------ |
| 1 ✅  | Core streaming chat companion                    |
| 2     | Tap-a-word lookup (SudachiPy / mecab-ko + dict)  |
| 3     | Spaced repetition (FSRS)                         |
| 4     | Voice — TTS + speech input                       |
| 5     | Companion selfies (consistent character)         |
