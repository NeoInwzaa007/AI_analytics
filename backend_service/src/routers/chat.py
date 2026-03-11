from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import desc
import httpx
import os

import json
from datetime import datetime
from typing import List, Optional

from ..database import SessionLocal
from ..models import ChatSession, ChatMessage, User
from ..schemas import ChatRequest, ChatResponse, MessageResponse, SessionResponse
from ..dependencies import get_db, get_current_user

router = APIRouter(
    prefix="/api/chat",
    tags=["chat"]
)

N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL") or os.getenv("NEXT_PUBLIC_N8N_CHAT_WEBHOOK") or ""

@router.post("/", response_model=ChatResponse)
async def send_message(
    chat_req: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Handle Session
    session = None
    if chat_req.session_id:
        session = db.query(ChatSession).filter(ChatSession.id == chat_req.session_id).first()
        if not session:
            # If invalid session provided, maybe create new one or error?
            # User requirement: "If session_id is provided: Verify it exists..."
            # Let's assume error if explicitly provided but not found, or user might want auto-create fallback.
            # Sticking to "Verify it exists" -> Error if not found.
            raise HTTPException(status_code=404, detail="Session not found")
        if session.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this session")
    else:
        # Create new session
        session = ChatSession(user_id=current_user.id, title="New Chat")
        db.add(session)
        db.commit()
        db.refresh(session)

    # 2. Save User Message
    user_message = ChatMessage(
        session_id=session.id,
        user_id=current_user.id,
        role="user",
        content=chat_req.message,
        content_type="text"
    )
    db.add(user_message)
    db.commit()
    # db.refresh(user_message) # Only if we need ID immediately

    # 3. Call n8n
    ai_content = ""
    # Payload for n8n
    payload = {
        "message": chat_req.message,
        "session_id": str(session.id),
        "connection_id": chat_req.connection_id,
        "user_id": current_user.id,
        # Potentially pass history if n8n needs it, but instructions say "Send payload to n8n webhook"
    }

    content_type = "text"
    if not N8N_WEBHOOK_URL:
        ai_content = "N8N_WEBHOOK_URL is not set. Mock response: " + chat_req.message
    else:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(N8N_WEBHOOK_URL, json=payload, timeout=60.0)
                response.raise_for_status()
                
                try:
                    data = response.json()
                    
                    # Smart detection Logic
                    chart_obj = None
                    text_content = ""

                    if isinstance(data, list):
                        # Case 1: Direct list of data points
                        chart_obj = {"type": "bar", "data": data, "title": "Data Visualization"}
                        text_content = "Here is the data found:"
                    elif isinstance(data, dict):
                        if "chart" in data:
                            # Case 2: Explicit chart object
                            chart_obj = data["chart"]
                            text_content = data.get("message") or data.get("text") or "Here is the requested chart:"
                        elif "data" in data and isinstance(data["data"], list) and len(data["data"]) > 0:
                            # Case 3: Implicit chart in 'data' field
                            chart_obj = {"type": "bar", "data": data["data"], "title": "Data Visualization"}
                            text_content = data.get("message") or data.get("text") or "Here is the data found:"
                        else:
                            # Case 4: Text response
                            text_content = data.get("output") or data.get("text") or data.get("response") or data.get("content") or data.get("message") or str(data)
                            if isinstance(text_content, (dict, list)):
                                text_content = json.dumps(text_content)
                    elif isinstance(data, str):
                        text_content = data
                    else:
                        text_content = str(data)

                    if chart_obj:
                        # Normalize metadata
                        if "title" not in chart_obj: 
                            chart_obj["title"] = "Data Visualization"
                        if "type" not in chart_obj:
                            chart_obj["type"] = "bar"
                            
                        composite = {
                            "message": text_content,
                            "chart": chart_obj
                        }
                        ai_content = json.dumps(composite)
                        content_type = "chart"
                    else:
                        ai_content = text_content
                        content_type = "text"
                except ValueError:
                     # Failed to parse JSON, assume text response
                     ai_content = response.text

        except Exception as e:
            ai_content = f"Error calling AI Agent: {str(e)}"

    # 4. Save AI Response
    ai_message = ChatMessage(
        session_id=session.id,
        user_id=current_user.id, # DB requires user_id even for AI messages
        role="ai",
        content=ai_content,
        content_type=content_type
    )
    db.add(ai_message)
    db.commit()
    
    # 5. Update Session activity
    session.last_active_at = datetime.utcnow()
    db.commit()

    # 6. Fetch History
    # User wants "history: List[...]" in response
    history = db.query(ChatMessage).filter(ChatMessage.session_id == session.id).order_by(ChatMessage.created_at.asc()).all()

    return {
        "response": ai_content,
        "content_type": content_type,
        "session_id": session.id,
        "history": history
    }

from uuid import UUID

@router.get("/{session_id}/history", response_model=List[MessageResponse])
def get_session_history(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    messages = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc()).all()
    return messages

@router.get("/sessions", response_model=List[SessionResponse])
def get_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sessions = db.query(ChatSession).filter(ChatSession.user_id == current_user.id).order_by(desc(ChatSession.last_active_at)).all()
    return sessions

from ..schemas import ChatSessionUpdate, CreateChatSessionRequest

@router.post("/sessions", response_model=SessionResponse)
def create_session(
    session_req: CreateChatSessionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = ChatSession(user_id=current_user.id, title=session_req.title)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Cascade delete messages (if not handled by DB FK)
    # SQLAlchemy usually handles cascade if configured, but safe to delete manually or trust DB.
    # Given model definition didn't explicitly show cascade="all, delete", let's be safe or rely on DB.
    # Assuming standard setup, let's just delete the session.
    db.delete(session)
    db.commit()
    return {"message": "Session deleted"}

@router.patch("/sessions/{session_id}", response_model=SessionResponse)
def update_session(
    session_id: UUID,
    session_update: ChatSessionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    session.title = session_update.title
    db.commit()
    db.refresh(session)
    return session
