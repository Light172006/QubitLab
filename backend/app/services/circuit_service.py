from typing import Sequence
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.circuit import Circuit
from app.schemas.circuit import CircuitCreate, CircuitUpdate

async def list_circuits(db: AsyncSession, user_id: int) -> Sequence[Circuit]:
    result = await db.execute(select(Circuit).where(Circuit.user_id == user_id))
    return result.scalars().all()

async def get_circuit(db: AsyncSession, circuit_id: int, user_id: int) -> Circuit:
    result = await db.execute(select(Circuit).where(Circuit.id == circuit_id))
    circuit = result.scalars().first()
    
    if not circuit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Circuit not found")
    if circuit.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this circuit")
        
    return circuit

async def create_circuit(db: AsyncSession, user_id: int, data: CircuitCreate) -> Circuit:
    new_circuit = Circuit(
        name=data.name,
        description=data.description,
        num_qubits=data.num_qubits,
        data=data.data.model_dump(),
        user_id=user_id
    )
    db.add(new_circuit)
    await db.commit()
    await db.refresh(new_circuit)
    return new_circuit

async def update_circuit(db: AsyncSession, circuit_id: int, user_id: int, data: CircuitUpdate) -> Circuit:
    circuit = await get_circuit(db, circuit_id, user_id)
    
    if data.name is not None:
        circuit.name = data.name
    if data.description is not None:
        circuit.description = data.description
    if data.num_qubits is not None:
        circuit.num_qubits = data.num_qubits
    if data.data is not None:
        circuit.data = data.data.model_dump()
        
    await db.commit()
    await db.refresh(circuit)
    return circuit

async def delete_circuit(db: AsyncSession, circuit_id: int, user_id: int) -> None:
    circuit = await get_circuit(db, circuit_id, user_id)
    await db.delete(circuit)
    await db.commit()
