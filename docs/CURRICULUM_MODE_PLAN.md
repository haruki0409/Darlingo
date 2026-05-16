# LingoDarling — Curriculum Mode Plan

> A structured, Duolingo-style lesson path for Korean & Japanese, alongside the
> existing Story Mode. See also `docs/STORY_MODE_PLAN.md`.

## 1. Vision

LingoDarling has **two complementary modes**:

- **Story Mode** — immersive, conversational; learn by playing AI-generated
  visual-novel chapters.
- **Curriculum Mode** — structured drills; a Duolingo-style skill path that
  builds foundations level by level.

Curriculum builds the foundation; Story applies it. They share one
vocabulary/progress system, so spaced-repetition review draws from both.

## 2. Structure

```
Level   (JLPT N5…N1  /  TOPIK 1…6)
  └─ Unit     ("Greetings", "Food", "Past tense")
       └─ Lesson   (a few exercises around ~5 target items)
            └─ Exercise   (multiple-choice, translate, match, listen…)
```

## 3. Content strategy — open data for the backbone, AI for pedagogy

For Korean and Japanese the natural syllabus is **JLPT** (Japanese) and
**TOPIK** (Korean) — standardized, well-known proficiency frameworks.

| Layer | Source |
|---|---|
| Vocabulary backbone | Open datasets — `Bluskyo/JLPT_Vocabulary` (JA), `julienshim/combined_korean_vocabulary_list` (KO). Imported as seed data, ordered by level. |
| Kanji (JA) | `davidluzgouveia/kanji-data` (KANJIDIC + JLPT levels). |
| Grammar points | **AI-generated** per level (Gemini knows the JLPT/TOPIK grammar syllabi well), human-reviewed once. No clean open dataset exists. |
| Example sentences | **AI-generated** per exercise (keeps them level-appropriate); Tatoeba as a fallback bank. |
| Definitions | `wiktextract` (shared with Story Mode 2E word lookup). |

**Principle (same as Story Mode):** open data supplies *what* to teach; Gemini
generates *how* — the exercises themselves.

## 4. Data model (new tables)

```
curriculum_items   id, language, level, kind (vocab|kanji|grammar),
                   term, reading, meaning, extra(jsonb)
units              id, language, level, idx, title, description
lessons            id, unit_id, idx, title, target_items(jsonb)
exercises          id, lesson_id, idx, type, prompt, data(jsonb)
lesson_progress    id, user_id, lesson_id, status, score, completed_at
```

Reuses the existing `users` table and the planned `known_words` table (spaced
repetition) — items the learner struggles with feed review, shared with Story.

## 5. AI exercise generation

Lazy generation, mirroring chapter scenes: a lesson's exercises are generated
when the lesson is first started, via Gemini structured output.

`generate_lesson_exercises(target_items, language, level)` → JSON list of
exercises. Each exercise carries its `type`, `prompt`, options, and answer.

## 6. Exercise types

MVP (start small): **multiple-choice** (pick the meaning/translation) and
**translate** (type the answer — AI-graded leniently by Gemini).

Later: **match** (pair terms ↔ meanings), **arrange** (word-order), **listen**
(uses TTS from Story Mode 2C).

## 7. Backend API

```
GET  /curriculum/units?language=&level=     unit list
GET  /units/{id}/lessons                    lessons in a unit
POST /lessons/{id}/start                    generate exercises → return them
POST /lessons/{id}/submit                   grade, record progress + XP, unlock next
```

## 8. Gamification & progress

- **XP** per completed lesson; **lesson unlocking** in sequence.
- **Streaks** (daily activity).
- Missed items flow into **FSRS** spaced-repetition review (shared with Story).

## 9. How it fits with Story Mode

A **home screen mode selector**: Story Mode ／ Curriculum Mode. Both write to
the shared `known_words` table, so one review system covers everything the
learner has touched in either mode.

## 10. Milestones

| Milestone | Delivers |
|---|---|
| **C1 — Syllabus foundation** | Import vocab/kanji seed data; AI-seed grammar points; `units`/`lessons`/`curriculum_items` tables; lesson-path UI |
| **C2 — Exercise play** | AI exercise generation; the exercise player (multiple-choice + translate) |
| **C3 — Progress & gamification** | XP, lesson unlocking, streaks; home-screen mode selector |
| **C4 — Review & listening** | FSRS review integration; match / arrange / listening exercises (TTS) |

Story Mode (2A–2E) and Curriculum Mode (C1–C4) are independent tracks built on
the same backend, auth, and Gemini generation pattern.

## 11. Reuse from what already exists

- Auth, database, Supabase — unchanged.
- Gemini structured-output generation — the exact pattern from `app/story.py`.
- `known_words` / FSRS — one shared spaced-repetition system across both modes.
