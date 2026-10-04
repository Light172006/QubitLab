import uuid
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class SimulationJob(Base):
    __tablename__ = "simulation_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    circuit_id = Column(UUID(as_uuid=True), ForeignKey('circuits.id'), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    backend = Column(String(50), nullable=False)
    status = Column(String(20), default='pending')
    result = Column(JSONB, nullable=True)
    error_message = Column(Text, nullable=True)
    shots = Column(Integer, default=1024)
    options = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="simulation_jobs")
    circuit = relationship("Circuit", back_populates="simulation_jobs")
