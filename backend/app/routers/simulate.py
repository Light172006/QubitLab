import asyncio
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID
from app.database import get_db
from app.schemas.simulation import SimulateRequest, SimulationJobResponse
from app.services import simulation_service
from app.routers.auth import get_current_user_dep

router = APIRouter(tags=['simulate'])

@router.post("/", response_model=SimulationJobResponse, status_code=status.HTTP_201_CREATED)
async def submit_simulation(request: SimulateRequest, current_user = Depends(get_current_user_dep), db: AsyncSession = Depends(get_db)):
    """Submit simulation job."""
    # 1. Validate backend
    if not simulation_service.is_backend_valid(request.backend):
        raise HTTPException(status_code=400, detail="Invalid simulation backend")
    
    # 2. Create job record
    job = await simulation_service.create_simulation_job(db, current_user.id, request)
    
    # 3. Run inline for prototype
    try:
        result = await simulation_service.run_simulation(
            request.circuit_data,
            request.backend,
            request.shots,
            request.options
        )
        job = await simulation_service.update_simulation_job_status(db, job.id, "completed", result=result)
    except TimeoutError:
        job = await simulation_service.update_simulation_job_status(db, job.id, "failed", error_message="Simulation timed out")
    except Exception as e:
        job = await simulation_service.update_simulation_job_status(db, job.id, "failed", error_message=str(e))
        
    return job

@router.get("/{job_id}/status", response_model=SimulationJobResponse)
async def get_simulation_status(job_id: UUID, current_user = Depends(get_current_user_dep), db: AsyncSession = Depends(get_db)):
    """Get simulation job status."""
    return await simulation_service.get_simulation_job(db, job_id, current_user.id)

@router.get("/backends", response_model=List[str])
async def list_backends():
    """List available simulation backends."""
    return simulation_service.get_available_backends()
