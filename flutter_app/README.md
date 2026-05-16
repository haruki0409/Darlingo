# LingoDarling — Flutter client

The Flutter client for LingoDarling, targeting **Web** and **Android** from one
codebase. Talks to the FastAPI backend over a WebSocket.

> The `frontend/` directory (Next.js/React) is kept as a **reference only**.
> Active client development happens here.

## First-time setup

This directory contains the hand-written source (`lib/`, `pubspec.yaml`). You
need Flutter to generate the platform folders (`android/`, `web/`, …):

```bash
cd flutter_app
flutter create . --platforms=web,android   # generates platform scaffolding,
                                            # keeps existing lib/ and pubspec
flutter pub get
```

## Running

Configuration is passed at build time with `--dart-define`:

```bash
flutter run -d chrome \
  --dart-define=SUPABASE_URL=https://<project-ref>.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=<your-anon-key> \
  --dart-define=WS_URL=ws://localhost:8000/ws/chat
```

Use `-d chrome` for web or a device id for Android (`flutter devices`).

## Structure

```
lib/
├── main.dart                 # app entry, Supabase init, AuthGate
├── config.dart               # build-time config (--dart-define)
├── models/message.dart       # chat message model
├── services/chat_socket.dart # WebSocket client + event stream
└── screens/
    ├── login_screen.dart     # Supabase email auth
    └── chat_screen.dart      # streaming companion chat
```
