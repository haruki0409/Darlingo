"""Database models.

Phase 1 (persistence): users, conversations, messages.
Later phases will add `known_words` (Phase 2) and `review_cards` (Phase 3) —
both will reference `users.id`, so keep that foreign key consistent.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class User(Base):
    """An app user. The id mirrors the Supabase Auth user id (auth.users.id),
    so this row is the app-side profile for an authenticated account."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    email: Mapped[str | None] = mapped_column(String(320))
    target_lang: Mapped[str] = mapped_column(String(8), default="ko")
    level: Mapped[str] = mapped_column(String(16), default="beginner")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    conversations: Mapped[list["Conversation"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Conversation(Base):
    """One chat session between a user and the companion."""

    __tablename__ = "conversations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE")
    )
    language: Mapped[str] = mapped_column(String(8), default="ko")
    level: Mapped[str] = mapped_column(String(16), default="beginner")
    # Set when this conversation is the dialogue of a story chapter.
    chapter_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("chapters.id", ondelete="SET NULL")
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="conversations")
    messages: Mapped[list["Message"]] = relationship(
        back_populates="conversation",
        order_by="Message.created_at",
        cascade="all, delete-orphan",
    )


class Message(Base):
    """A single turn in a conversation. role is "user" or "companion"."""

    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE")
    )
    role: Mapped[str] = mapped_column(String(16))
    content: Mapped[str] = mapped_column(Text)
    # The partner's emotion for this line (one of story.EMOTIONS); null for
    # user messages and plain non-chapter chat.
    emotion: Mapped[str | None] = mapped_column(String(24))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    conversation: Mapped["Conversation"] = relationship(back_populates="messages")


class Partner(Base):
    """An AI companion character. `persona_prompt` drives behaviour; the
    sprite/voice refs are filled in by the assets team."""

    __tablename__ = "partners"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(80))
    persona_prompt: Mapped[str] = mapped_column(Text)
    language: Mapped[str] = mapped_column(String(8), default="ko")
    sprite_set_ref: Mapped[str | None] = mapped_column(String(255))
    voice_id: Mapped[str | None] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Story(Base):
    """A customized, AI-generated story a user plays chapter by chapter."""

    __tablename__ = "stories"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE")
    )
    partner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("partners.id"))

    title: Mapped[str] = mapped_column(String(200))
    user_premise: Mapped[str] = mapped_column(Text)  # the player's free-text idea
    premise: Mapped[str] = mapped_column(Text)  # AI-refined premise
    setting_overview: Mapped[str] = mapped_column(Text)
    genre: Mapped[str] = mapped_column(String(40))
    tone: Mapped[str] = mapped_column(String(40))

    language: Mapped[str] = mapped_column(String(8), default="ko")
    level: Mapped[str] = mapped_column(String(16), default="beginner")
    total_chapters: Mapped[int] = mapped_column(Integer)
    current_chapter_idx: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(16), default="active")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    chapters: Mapped[list["Chapter"]] = relationship(
        back_populates="story",
        order_by="Chapter.idx",
        cascade="all, delete-orphan",
    )


class Chapter(Base):
    """One chapter of a story. The outline fields are generated up front;
    `scene` and `summary` are filled when the chapter is played (Milestone 2B)."""

    __tablename__ = "chapters"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    story_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("stories.id", ondelete="CASCADE")
    )
    idx: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(200))
    premise: Mapped[str] = mapped_column(Text)
    setting_tag: Mapped[str] = mapped_column(String(32))
    objective: Mapped[str] = mapped_column(Text)
    target_vocab: Mapped[list] = mapped_column(JSONB, default=list)
    target_grammar: Mapped[list] = mapped_column(JSONB, default=list)
    status: Mapped[str] = mapped_column(String(16), default="locked")
    scene: Mapped[dict | None] = mapped_column(JSONB)
    summary: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    story: Mapped["Story"] = relationship(back_populates="chapters")
