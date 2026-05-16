# Bridge

An AI companion language-learning app — chat with a friendly AI companion while
learning **Korean** and **Japanese**.

## Stack

| Layer    | Tech                                          |
| -------- | --------------------------------------------- |
| Frontend | Next.js (React, TypeScript) + Tailwind        |
| Backend  | FastAPI (Python)                              |
| AI       | Gemini API (chat; voice & images in later phases) |
| Storage  | _Phase 1: in-memory only_                     |

## Phase 1 — what works now

A streaming text chat with a companion persona (`Yuna` for Korean, `Yuki` for
Japanese) that adapts to a chosen level (beginner / intermediate / advanced).
Replies stream token-by-token over a WebSocket and include a short English
gloss.

**Not yet built** (later phases): word lookup / tokenization, spaced
repetition, voice, selfies, auth, and a database. Conversation history lives in
memory and is lost when the socket closes.

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

### 2. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open <http://localhost:3000>.

## Project layout

```
bridge/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app + CORS
│   │   ├── config.py        # env-based settings
│   │   ├── persona.py       # companion system prompt
│   │   └── routes/chat.py   # /ws/chat WebSocket → Gemini stream
│   └── requirements.txt
└── frontend/
    ├── app/                 # Next.js app router (layout, page)
    ├── components/ChatWindow.tsx
    └── lib/useChatSocket.ts # WebSocket + streaming state
```

## Roadmap

| Phase | Adds                                             |
| ----- | ------------------------------------------------ |
| 1 ✅  | Core streaming chat companion                    |
| 2     | Tap-a-word lookup (SudachiPy / mecab-ko + dict)  |
| 3     | Spaced repetition (FSRS)                         |
| 4     | Voice — TTS + speech input                       |
| 5     | Companion selfies (consistent character)         |
