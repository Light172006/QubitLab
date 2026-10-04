import json
from typing import AsyncGenerator, Sequence
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import google.generativeai as genai

from app.config import settings
from app.models.tutor import TutorSession, TutorMessage

SYSTEM_PROMPT = """You are an expert quantum computing tutor for QubitLab.
Explain concepts clearly, help debug circuits, generate framework code (Qiskit, Cirq, PennyLane),
and provide hints (but not direct answers) for challenges. Keep responses concise and educational."""

if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)
    
async def chat(session_id: int | None, user_message: str, context: dict | None, db: AsyncSession, user_id: int) -> AsyncGenerator[str, None]:
    if not settings.GEMINI_API_KEY:
        yield "Error: Gemini API key is not configured. Please contact the administrator."
        return
        
    try:
        session = None
        if session_id:
            result = await db.execute(select(TutorSession).where(TutorSession.id == session_id, TutorSession.user_id == user_id))
            session = result.scalars().first()
            
        if not session:
            session = TutorSession(user_id=user_id, title=user_message[:50] + "...")
            db.add(session)
            await db.commit()
            await db.refresh(session)
            
        # Get history
        result = await db.execute(
            select(TutorMessage)
            .where(TutorMessage.session_id == session.id)
            .order_by(TutorMessage.created_at)
        )
        history = result.scalars().all()
        
        # Build messages for Gemini
        gemini_history = []
        for msg in history:
            role = "user" if msg.role == "user" else "model"
            gemini_history.append({"role": role, "parts": [msg.content]})
            
        # Add user message to DB
        user_db_msg = TutorMessage(session_id=session.id, role="user", content=user_message)
        db.add(user_db_msg)
        await db.commit()
        
        # Append current message and context
        full_message = user_message
        if context:
            full_message += f"\n\nContext: {json.dumps(context)}"
            
        # Setup model
        model = genai.GenerativeModel('gemini-1.5-flash', system_instruction=SYSTEM_PROMPT)
        chat_session = model.start_chat(history=gemini_history)
        
        response = chat_session.send_message(full_message, stream=True)
        
        full_response = ""
        for chunk in response:
            if chunk.text:
                full_response += chunk.text
                yield chunk.text
                
        # Save assistant message to DB
        assistant_db_msg = TutorMessage(session_id=session.id, role="assistant", content=full_response)
        db.add(assistant_db_msg)
        await db.commit()
        
    except Exception as e:
        yield f"\n\nAn error occurred while communicating with the AI Tutor: {str(e)}"

async def get_sessions(db: AsyncSession, user_id: int) -> Sequence[TutorSession]:
    result = await db.execute(select(TutorSession).where(TutorSession.user_id == user_id).order_by(TutorSession.updated_at.desc()))
    return result.scalars().all()

async def get_session(db: AsyncSession, session_id: int, user_id: int) -> TutorSession:
    result = await db.execute(select(TutorSession).where(TutorSession.id == session_id, TutorSession.user_id == user_id))
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
        
    # Eager load or fetch messages
    msg_result = await db.execute(select(TutorMessage).where(TutorMessage.session_id == session.id).order_by(TutorMessage.created_at))
    session.messages = msg_result.scalars().all()
    return session
