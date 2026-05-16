"""End-to-end smoke test for the Darlingo backend.

Signs in (or signs up) a Supabase test user, then exercises the chat
WebSocket and the conversation REST endpoints. Lets you verify the whole
backend without waiting on the frontend.

Run from the backend/ directory, with the server already running:

    uvicorn app.main:app --reload          # in one terminal
    python -m scripts.smoke_test test@example.com password123
"""

import asyncio
import json
import sys

import httpx
import websockets

from app.config import settings

API_BASE = "http://localhost:8000"
WS_BASE = "ws://localhost:8000/ws/chat"


async def get_token(email: str, password: str) -> str:
    """Get a Supabase access token, signing the test user up if needed."""
    headers = {
        "apikey": settings.supabase_anon_key,
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{settings.supabase_url}/auth/v1/token?grant_type=password",
            headers=headers,
            json={"email": email, "password": password},
        )
        if resp.status_code == 200:
            return resp.json()["access_token"]

        print("   sign-in failed, attempting sign-up...")
        resp = await client.post(
            f"{settings.supabase_url}/auth/v1/signup",
            headers=headers,
            json={"email": email, "password": password},
        )
        resp.raise_for_status()
        token = resp.json().get("access_token")
        if not token:
            sys.exit(
                "Signed up, but no session was returned. Disable 'Confirm "
                "email' in Supabase (Authentication -> Providers -> Email), "
                "then run this again."
            )
        return token


async def chat(token: str) -> str:
    """Open the chat WebSocket, send one message, print the streamed reply."""
    conversation_id = ""
    async with websockets.connect(f"{WS_BASE}?token={token}") as ws:
        await ws.send(
            json.dumps(
                {
                    "message": "안녕! 오늘 뭐 했어?",
                    "language": "ko",
                    "level": "beginner",
                }
            )
        )
        print("\n   Companion: ", end="", flush=True)
        async for raw in ws:
            event = json.loads(raw)
            if event["type"] == "conversation":
                conversation_id = event["id"]
            elif event["type"] == "chunk":
                print(event["text"], end="", flush=True)
            elif event["type"] == "done":
                print()
                break
            elif event["type"] == "error":
                sys.exit(f"\n   Error: {event['text']}")
    return conversation_id


async def check_rest(token: str, conversation_id: str) -> None:
    """Hit the conversation REST endpoints with the same token."""
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=15) as client:
        convos = await client.get(f"{API_BASE}/conversations", headers=headers)
        print(
            f"   GET /conversations -> {convos.status_code}, "
            f"{len(convos.json())} found"
        )
        msgs = await client.get(
            f"{API_BASE}/conversations/{conversation_id}/messages",
            headers=headers,
        )
        print(
            f"   GET /conversations/{{id}}/messages -> {msgs.status_code}, "
            f"{len(msgs.json())} messages"
        )


async def main() -> None:
    if len(sys.argv) != 3:
        sys.exit("Usage: python -m scripts.smoke_test <email> <password>")
    email, password = sys.argv[1], sys.argv[2]

    print("1. Authenticating with Supabase...")
    token = await get_token(email, password)
    print("   got access token")

    print("2. Chatting over WebSocket...")
    conversation_id = await chat(token)
    print(f"   conversation id: {conversation_id}")

    print("3. Checking REST endpoints...")
    await check_rest(token, conversation_id)

    print(
        "\nAll checks passed. The messages above are now persisted in your "
        "Supabase 'messages' table."
    )


if __name__ == "__main__":
    asyncio.run(main())
