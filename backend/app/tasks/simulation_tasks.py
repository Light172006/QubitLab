# These tasks are defined for future use with Celery.
# Currently, simulations run inline in the API handler.
# When scaling, uncomment the Celery integration.

# from celery import Celery
# celery_app = Celery('qubitlab', broker='redis://localhost:6379/0')

async def run_simulation_task(job_id: str, circuit_data: dict, backend: str, shots: int, options: dict = None):
    """Run a simulation job. Currently runs inline, future: Celery task."""
    from app.services.simulation.manager import simulation_manager
    from app.schemas.circuit import CircuitDataSchema
    
    backend_instance = simulation_manager.get_backend(backend)
    circuit = CircuitDataSchema(**circuit_data)
    result = await backend_instance.run_circuit(circuit, shots, options)
    return result
