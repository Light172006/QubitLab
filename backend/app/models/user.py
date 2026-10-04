import uuid
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)
    name = Column(String(255), nullable=False)
    role = Column(String(20), default='student')
    avatar_url = Column(String(500), nullable=True)
    oauth_provider = Column(String(50), nullable=True)
    oauth_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    circuits = relationship("Circuit", back_populates="user")
    simulation_jobs = relationship("SimulationJob", back_populates="user")
    tutor_sessions = relationship("TutorSession", back_populates="user")
    lesson_progress = relationship("LessonProgress", back_populates="user")
    challenge_submissions = relationship("ChallengeSubmission", back_populates="user")
    taught_classes = relationship("Class_", back_populates="instructor")
    class_enrollments = relationship("ClassEnrollment", back_populates="student")
