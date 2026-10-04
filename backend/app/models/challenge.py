import uuid
from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Challenge(Base):
    __tablename__ = "challenges"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    difficulty = Column(String(20), nullable=False)
    starter_circuit = Column(JSONB, nullable=True)
    validation_rules = Column(JSONB, nullable=False)
    points = Column(Integer, default=100)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    submissions = relationship("ChallengeSubmission", back_populates="challenge", cascade="all, delete-orphan")

class ChallengeSubmission(Base):
    __tablename__ = "challenge_submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    challenge_id = Column(UUID(as_uuid=True), ForeignKey('challenges.id'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    circuit_data = Column(JSONB, nullable=True)
    code = Column(Text, nullable=True)
    score = Column(Integer, default=0)
    passed = Column(Boolean, default=False)
    feedback = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    challenge = relationship("Challenge", back_populates="submissions")
    user = relationship("User", back_populates="challenge_submissions")
