"""End-to-end test of Story Mode (Milestones 2A + 2B).

Runs the full loop: auth -> create story -> start chapter -> chapter chat
(checking emotion tags + in-story replies) -> complete chapter -> verify the
next chapter unlocks.

Run from the backend/ directory, with the server on :8000:
    python -m scripts.story_test <email> <password>
"""

import asyncio
import json
import sys

import httpx
import websockets

from app.config import settings

API = "http://localhost:8000"
WS = "ws://localhost:8000/ws/chat"


async def get_token(email: str, password: str) -> str:
    headers = {
        "apikey": settings.supabase_anon_key,
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(
            f"{settings.supabase_url}/auth/v1/token?grant_type=password",
            headers=headers,
            json={"email": email, "password": password},
        )
        if resp.status_code == 200:
            return resp.json()["access_token"]
        resp = await client.post(
            f"{settings.supabase_url}/auth/v1/signup",
            headers=headers,
            json={"email": email, "password": password},
        )
        resp.raise_for_status()
        token = resp.json().get("access_token")
        if not token:
            sys.exit("Sign-up returned no session; disable 'Confirm email'.")
        return token


async def run_chapter_chat(
    token: str, conversation_id: str, messages: list[str]
) -> list[tuple[str, str, str | None, bool]]:
    """Send messages over one WebSocket connection; collect the replies."""
    url = f"{WS}?token={token}&conversation_id={conversation_id}"
    results: list[tuple[str, str, str | None, bool]] = []
    async with websockets.connect(url) as ws:
        for msg in messages:
            await ws.send(
                json.dumps(
                    {"message": msg, "language": "ko", "level": "beginner"}
                )
            )
            text, emotion, complete = "", None, False
            async for raw in ws:
                event = json.loads(raw)
                kind = event["type"]
                if kind == "conversation":
                    continue
                if kind == "chunk":
                    text = event["text"]
                elif kind == "done":
                    emotion = event.get("emotion")
                    complete = event.get("chapter_complete", False)
                    break
                elif kind == "error":
                    sys.exit(f"chat error: {event['text']}")
            results.append((msg, text, emotion, complete))
    return results


async def main() -> None:
    if len(sys.argv) != 3:
        sys.exit("Usage: python -m scripts.story_test <email> <password>")
    email, password = sys.argv[1], sys.argv[2]

    token = await get_token(email, password)
    auth = {"Authorization": f"Bearer {token}"}
    print("1. auth OK")

    async with httpx.AsyncClient(timeout=120) as client:
        partners = (await client.get(f"{API}/partners", headers=auth)).json()
        yuna = next(p for p in partners if p["name"] == "Yuna")
        print(f"2. partners OK ({len(partners)} found)")

        print("3. creating story (AI outline, ~10s)...")
        resp = await client.post(
            f"{API}/stories",
            headers=auth,
            json={
                "partner_id": yuna["id"],
                "genre": "slice-of-life",
                "tone": "wholesome",
                "setting": "a cozy university campus in Seoul",
                "premise": "I'm a new exchange student and Yuna helps me settle in",
                "language": "ko",
                "level": "beginner",
                "total_chapters": 3,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        story, chapters = data["story"], data["chapters"]
        ch1 = chapters[0]
        print(f"   story: \"{story['title']}\" - {len(chapters)} chapters")

        print(f"4. starting chapter 1: \"{ch1['title']}\" (AI scene, ~8s)...")
        resp = await client.post(
            f"{API}/chapters/{ch1['id']}/start", headers=auth
        )
        resp.raise_for_status()
        start = resp.json()
        conversation_id = start["conversation_id"]
        scene = start["scene"]
        print(f"   emotion: {scene['partner_emotion']}")
        print(f"   opening: {scene['partner_opening_line']}")

        print("5. chapter chat (3 turns over WebSocket)...")
        turns = await run_chapter_chat(
            token,
            conversation_id,
            [
                "안녕하세요! 저는 새 교환학생이에요.",
                "네, 만나서 반가워요. 도서관이 어디예요?",
                "정말 고마워요, 유나 씨!",
            ],
        )
        for msg, text, emotion, complete in turns:
            print(f"   you : {msg}")
            print(f"   Yuna [{emotion}]: {text[:80]}")
            if complete:
                print("   >>> [chapter_complete] signalled by the AI")

        print("6. completing chapter 1 (AI wrap-up)...")
        resp = await client.post(
            f"{API}/chapters/{ch1['id']}/complete", headers=auth
        )
        resp.raise_for_status()
        wrap = resp.json()
        print(f"   summary: {wrap['summary'][:90]}")
        print(f"   vocab  : {wrap['vocab_practiced']}")
        print(f"   story_completed: {wrap['story_completed']}")

        print("7. verifying chapter unlock...")
        chs = (
            await client.get(
                f"{API}/stories/{story['id']}/chapters", headers=auth
            )
        ).json()
        print(f"   ch1: {chs[0]['status']}  |  ch2: {chs[1]['status']}")
        assert chs[0]["status"] == "completed", "chapter 1 not marked completed"
        assert chs[1]["status"] == "available", "chapter 2 did not unlock"

    print("\nStory Mode end-to-end: ALL STEPS PASSED.")


if __name__ == "__main__":
    asyncio.run(main())
