# Darlingo — Story Mode Plan

> The plan for turning Darlingo into a visual-novel language-learning app
> with AI-generated, customizable, chaptered stories.

## 1. Vision

A **visual-novel language-learning app**. The user customizes a story up front,
then plays AI-generated **chapters**, conversing (text or voice) with an AI
partner inside each scene. The conversation *is* the language practice; the
story gives it direction and engagement.

Three pillars on top of the Phase 1 chat foundation:

1. **VN presentation** — background + character sprite + dialogue box.
2. **Customizable, chaptered story** — set up at onboarding, played chapter by chapter.
3. **AI story generation** — Gemini writes the story arc and each chapter's scenario.

## 2. Core principle

The story is **not a pre-written script**. It is a *frame*: a premise, a
per-chapter scenario, and an objective. The actual dialogue is generated **live**
by the chat engine, constrained to stay inside that frame. This keeps the
language practice free-form while still feeling like a story.

## 3. AI generation — three tiers

| Tier | When | Output |
|---|---|---|
| **1 — Story outline** | Once, at story creation | Title, premise, and N chapter outlines (title, premise, setting, objective, target vocab/grammar) |
| **2 — Chapter scene** | When a chapter starts | Opening narration, partner's first line, emotion, target vocab |
| **3 — Live dialogue** | Each turn in a chapter | Streamed reply + `[emotion:x]` tag; partner emits `[chapter_complete]` when the objective is met |
| **Wrap-up** | Chapter ends | Chapter summary (continuity into next chapter) + vocab recap |

Generation is **lazy**: the outline is made up front; each chapter's detail is
generated on entry, so it can react to what actually happened earlier.

## 4. Locked decisions

| Topic | Decision |
|---|---|
| Chapter count | User-chosen at onboarding |
| Story premise | Free text (with wholesome-content guardrails) |
| Backgrounds | Curated asset pack keyed by `setting_tag` |
| Chapter completion | AI-decided (`[chapter_complete]` signal) + manual fallback |
| Partners | One partner per story |
| Suggested replies | Shown for beginners only |
| Word lookup | In scope (Milestone 2E) |

## 5. Data model

```
partners      id, name, persona_prompt, language, sprite_set_ref, voice_id
stories       id, user_id, partner_id, title, user_premise, premise,
              setting_overview, genre, tone, language, level,
              total_chapters, current_chapter_idx, status
chapters      id, story_id, idx, title, premise, setting_tag, objective,
              target_vocab(jsonb), target_grammar(jsonb), status,
              scene(jsonb), summary
conversations + chapter_id   (added in Milestone 2B)
messages      + emotion, + audio_url   (added in Milestone 2B)
```

## 6. Backend API

```
GET  /partners                      list selectable partners
POST /stories                       create from customization → outline generation
GET  /stories, /stories/{id}
GET  /stories/{id}/chapters
POST /chapters/{id}/start            scene generation (2B)
WS   /ws/chat?...&chapter_id=...     chapter-aware live dialogue (2B)
POST /chapters/{id}/complete         wrap-up generation (2B)
POST /stt, POST /tts                 voice I/O (2C)
```

## 7. VN chat UI (Milestone 2B)

Layered: background (by `setting_tag`) → partner sprite (swapped by emotion) →
dialogue box (name label + target-language line + English gloss). Dual input:
text field + mic. Beginner-only suggested replies. Chapter HUD with objective hint.

## 8. Coordination contract — voice & appearance team

The assets team works in parallel. These interfaces must be agreed and stable:

- **Emotion enum** — the fixed set the AI may emit and sprites must cover:
  `neutral, happy, sad, surprised, embarrassed, shy, thinking, excited`
- **Sprite delivery** — one image per `(partner, emotion)`; naming
  `partner_<id>/<emotion>.png`. Referenced by `partners.sprite_set_ref`.
- **Voice** — each partner has a `voice_id` (TTS voice/config); the backend's
  TTS call uses it. Stored in `partners.voice_id`.
- **Backgrounds** — a curated set keyed by `setting_tag`. The AI may only pick
  a tag from this list; each tag = one background image.

### `setting_tag` enum (must match the background asset pack)

```
classroom · schoolyard · hallway · cafe · restaurant · street
park · home_room · train_station · convenience_store · rooftop · park_night
```

## 9. Milestones

| Milestone | Delivers |
|---|---|
| **2A — Story foundation** | `partners`/`stories`/`chapters` tables; `POST /stories` + outline generation; partner endpoint; customization wizard; chapter-list screen |
| **2B — VN chapter play** | VN-rendered chat; chapter scene generation; chapter-aware chat; emotion→sprite; AI completion + summary |
| **2C — Voice I/O** | Mic input (STT) + partner TTS using `voice_id` |
| **2D — Assets & polish** | Background pack, partner sprite integration, save/resume, transitions, suggested replies |
| **2E — Word lookup** | Tap-a-word in the dialogue box (`wiktextract` + JA/KO tokenizers) |

Phase 1 (chat, persistence, Supabase auth) remains the foundation and is unchanged.
