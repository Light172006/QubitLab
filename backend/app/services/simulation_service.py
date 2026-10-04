from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
from fastapi import HTTPException
from app.models.simulation import SimulationJob
from app.schemas.simulation import SimulateRequest
from app.services.simulation.manager import simulation_manager

def is_backend_valid(backend: str) -> bool:
    try:
        simulation_manager.get_backend(backend)
        return True
    except ValueError:
        return False

def get_available_backends() -> list[str]:
    return simulation_manager.list_backends()

async def create_simulation_job(db: AsyncSession, user_id: UUID, request: SimulateRequest) -> SimulationJob:
    job = SimulationJob(
        user_id=user_id,
        backend=request.backend,
        shots=request.shots,
        options=request.options,
        status="pending"
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job

async def update_simulation_job_status(db: AsyncSession, job_id: UUID, status: str, result: dict = None, error_message: str = None) -> SimulationJob:
    from datetime import datetime, timezone
    stmt = select(SimulationJob).where(SimulationJob.id == job_id)
    res = await db.execute(stmt)
    job = res.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Simulation job not found")
    
    job.status = status
    if result:
        job.result = result.model_dump() if hasattr(result, "model_dump") else result
    if error_message:
        job.error_message = error_message
    if status in ("completed", "failed"):
        job.completed_at = datetime.now(timezone.utc)
        
    await db.commit()
    await db.refresh(job)
    return job

async def run_simulation(circuit_data, backend_name, shots, options):
    backend = simulation_manager.get_backend(backend_name)
    return await backend.run_circuit(circuit_data, shots, options)

async def get_simulation_job(db: AsyncSession, job_id: UUID, user_id: UUID) -> SimulationJob:
    stmt = select(SimulationJob).where(SimulationJob.id == job_id, SimulationJob.user_id == user_id)
    res = await db.execute(stmt)
    job = res.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Simulation job not found")
    return job
