import uuid
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    module_id = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    content_md = Column(Text, nullable=False)
    order_index = Column(Integer, nullable=False)
    prerequisites = Column(JSONB, default=[])

    progress_records = relationship("LessonProgress", back_populates="lesson", cascade="all, delete-orphan")

class LessonProgress(Base):
    __tablename__ = "lesson_progress"
    __table_args__ = (UniqueConstraint('user_id', 'lesson_id', name='uq_user_lesson_progress'),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    lesson_id = Column(UUID(as_uuid=True), ForeignKey('lessons.id'), nullable=False)
    status = Column(String(20), default='not_started')
    quiz_score = Column(Float, nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="lesson_progress")
    lesson = relationship("Lesson", back_populates="progress_records")
