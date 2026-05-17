# Darlingo

**🌸 Live app → [darlingo-tau.vercel.app](https://darlingo-tau.vercel.app)**

An AI companion language-learning app. Learn **Korean** and **Japanese** by
talking — through open conversation or interactive visual-novel stories — with
an AI companion that speaks back in real time.

## What it does

- **Free Style** — open-ended chat with an AI companion. Type or **talk**:
  real-time, bidirectional **voice** powered by the Gemini Live API, with live
  captions in both languages.
- **Story Mode** — play interactive, visual-novel-style stories. The
  conversation inside each scene *is* the language practice.
- **Korean & Japanese**, with companion characters and adjustable difficulty.
- **One-tap guest access** — sign in instantly with anonymous Supabase Auth, or
  create an account.

## Architecture

The product is a **Next.js web app**. It talks directly to two services —
Supabase (auth + data) and a standalone AI companion service.

```
   Browser
     │
     ▼
  Next.js web app  ──────────────►  Supabase        (auth + Postgres)
   (Vercel)         │
                    └────────────►  AI service      (Cloud Run)
                                     FastAPI + Google Gemini Live API
                                     voice (WebSocket) + text (SSE)
```

| Layer        | Tech                                                         |
| ------------ | ------------------------------------------------------------ |
| Web app      | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS  |
| Auth & data  | Supabase — Postgres + Supabase Auth (email + anonymous)      |
| AI companion | FastAPI service powered by the Google Gemini Live API        |
| Hosting      | Web app on Vercel · AI service on Google Cloud Run           |

## Repo layout

```
darlingo/
├── frontend/        The Next.js web app — the product. Deployed to Vercel.
│   └── src/
│       ├── app/         routes: landing, login, signup, home, story, freestyle
│       ├── components/  shared UI
│       └── lib/         Supabase client, AI API client, voice audio helpers
├── AI/              AI companion service — FastAPI + Gemini Live API.
│                    Voice + text chat, character personas. Deployed to Cloud Run.
└── backend/         Legacy FastAPI backend from the earlier mobile version.
                     NOT used by the web app — kept for reference (it holds the
                     Supabase data model in app/models.py).
```

## Running locally

You need two terminals: the AI service, then the web app.

### 1. AI companion service

```bash
cd AI
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # add your Gemini API key
uvicorn app.main:app --reload --port 8001
```

Get a Gemini API key at <https://aistudio.google.com/apikey>.

### 2. Web app

```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in Supabase URL/key + AI service URL
npm run dev                        # → http://localhost:3000
```

## Deployment

- **Web app → Vercel.** Import the repo and set the project **Root Directory**
  to `frontend/`. Add the `NEXT_PUBLIC_*` variables from
  `frontend/.env.local.example` under Project Settings → Environment Variables.
- **AI service → Google Cloud Run.** Containerized via `AI/Dockerfile`; runs as
  a single instance (`--min-instances=1 --max-instances=1`) because session
  state is in-memory. The Gemini API key is stored in Secret Manager.
- **Supabase** is fully managed. Add the deployed web-app domain to
  Authentication → URL Configuration so sign-in works on the live site.

## Notes

- `.env*` files are gitignored. The committed `*.example` files document every
  variable the app needs without exposing secrets.
- The AI service is stateful (in-memory sessions + per-user file memory), so it
  runs as a single Cloud Run instance rather than autoscaling.
