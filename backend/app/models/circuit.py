import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Circuit(Base):
    __tablename__ = "circuits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    gate_data = Column(JSONB, nullable=False)
    code = Column(Text, nullable=True)
    backend = Column(String(50), default='qiskit')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="circuits")
    simulation_jobs = relationship("SimulationJob", back_populates="circuit")
