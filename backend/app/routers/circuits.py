from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID
from app.database import get_db
from app.schemas.circuit import CircuitResponse, CircuitCreate, CircuitUpdate
from app.services import circuit_service
from app.routers.auth import get_current_user_dep

router = APIRouter(tags=['circuits'])

@router.get("/", response_model=List[CircuitResponse])
async def list_circuits(current_user = Depends(get_current_user_dep), db: AsyncSession = Depends(get_db)):
    """List user's circuits."""
    return await circuit_service.get_user_circuits(db, current_user.id)

@router.post("/", response_model=CircuitResponse, status_code=status.HTTP_201_CREATED)
async def create_circuit(circuit: CircuitCreate, current_user = Depends(get_current_user_dep), db: AsyncSession = Depends(get_db)):
    """Create a new circuit."""
    return await circuit_service.create_circuit(db, circuit, current_user.id)

@router.get("/{circuit_id}", response_model=CircuitResponse)
async def get_circuit(circuit_id: UUID, current_user = Depends(get_current_user_dep), db: AsyncSession = Depends(get_db)):
    """Get circuit by ID."""
    return await circuit_service.get_circuit(db, circuit_id, current_user.id)

@router.put("/{circuit_id}", response_model=CircuitResponse)
async def update_circuit(circuit_id: UUID, circuit: CircuitUpdate, current_user = Depends(get_current_user_dep), db: AsyncSession = Depends(get_db)):
    """Update circuit by ID."""
    return await circuit_service.update_circuit(db, circuit_id, circuit, current_user.id)

@router.delete("/{circuit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_circuit(circuit_id: UUID, current_user = Depends(get_current_user_dep), db: AsyncSession = Depends(get_db)):
    """Delete circuit by ID."""
    await circuit_service.delete_circuit(db, circuit_id, current_user.id)
