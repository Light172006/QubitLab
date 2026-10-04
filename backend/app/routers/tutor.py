from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID
import json
from app.database import get_db
from app.schemas.tutor import TutorChatRequest, TutorSessionResponse
from app.services import tutor_service
from app.routers.auth import get_current_user_dep

router = APIRouter(tags=['tutor'])

@router.post("/chat")
async def chat_with_tutor(request: TutorChatRequest, current_user = Depends(get_current_user_dep), db: AsyncSession = Depends(get_db)):
    """Send message to AI tutor. Returns SSE stream."""
    session_id = request.session_id
    if not session_id:
        session_id = await tutor_service.create_session(db, current_user.id)
        
    await tutor_service.save_user_message(db, session_id, request.message)
    
    async def sse_generator():
        async for chunk in tutor_service.chat_stream(request.message, request.context):
            yield f'data: {json.dumps({"content": chunk})}\n\n'
        yield 'data: {"done": true}\n\n'
            
    return StreamingResponse(sse_generator(), media_type="text/event-stream")

@router.get("/sessions", response_model=List[TutorSessionResponse])
async def list_sessions(current_user = Depends(get_current_user_dep), db: AsyncSession = Depends(get_db)):
    """List user's tutor sessions."""
    return await tutor_service.get_user_sessions(db, current_user.id)

@router.get("/sessions/{session_id}", response_model=TutorSessionResponse)
async def get_session(session_id: UUID, current_user = Depends(get_current_user_dep), db: AsyncSession = Depends(get_db)):
    """Get session with messages."""
    return await tutor_service.get_session(db, session_id, current_user.id)
