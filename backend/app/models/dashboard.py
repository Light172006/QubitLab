import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Class_(Base):
    __tablename__ = "classes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    instructor_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    instructor = relationship("User", back_populates="taught_classes")
    enrollments = relationship("ClassEnrollment", back_populates="class_", cascade="all, delete-orphan")

class ClassEnrollment(Base):
    __tablename__ = "class_enrollments"
    __table_args__ = (UniqueConstraint('class_id', 'student_id', name='uq_class_student_enrollment'),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    class_id = Column(UUID(as_uuid=True), ForeignKey('classes.id'), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())

    class_ = relationship("Class_", back_populates="enrollments")
    student = relationship("User", back_populates="class_enrollments")
