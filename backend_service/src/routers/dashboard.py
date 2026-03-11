from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from ..database import SessionLocal
from ..models import User, ChatSession, ChatMessage, Connection
from ..dependencies import get_db, get_current_user
from typing import List, Dict, Any

router = APIRouter(
    prefix="/api/dashboard",
    tags=["dashboard"]
)

@router.get("/stats")
def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from datetime import datetime, timedelta
    
    # Time threshold for 24h
    time_threshold = datetime.utcnow() - timedelta(hours=24)

    # 1. Total Chats
    total_chats = db.query(ChatSession).filter(ChatSession.user_id == current_user.id).count()
    # 1b. Chats in last 24h
    chats_24h = db.query(ChatSession).filter(
        ChatSession.user_id == current_user.id,
        ChatSession.created_at >= time_threshold
    ).count()

    # 2. Total Messages
    total_messages = db.query(ChatMessage).join(ChatSession).filter(ChatSession.user_id == current_user.id).count()
    # 2b. Messages in last 24h
    messages_24h = db.query(ChatMessage).join(ChatSession).filter(
        ChatSession.user_id == current_user.id,
        ChatMessage.created_at >= time_threshold
    ).count()

    # 3. Active Connections
    active_connections = db.query(Connection).filter(Connection.status == 'active').count()

    # 4. Recent Activity
    recent_sessions = db.query(ChatSession).filter(ChatSession.user_id == current_user.id).order_by(desc(ChatSession.last_active_at)).limit(5).all()

    # Format recent activity
    recent_activity = []
    for session in recent_sessions:
        recent_activity.append({
            "id": str(session.id),
            "title": session.title,
            "updated_at": session.last_active_at,
            "user_email": current_user.email
        })

    return {
        "total_chats": total_chats,
        "chats_24h": chats_24h,
        "total_messages": total_messages,
        "messages_24h": messages_24h,
        "active_connections": active_connections,
        "recent_activity": recent_activity
    }

@router.get("/charts")
def get_dashboard_charts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    import json
    
    # Fetch AI messages that might contain charts
    # We look for role='ai' and assume chart data is JSON.
    # Optimization: Filter by content_type if it was set, but for safety text search broadly or just fetch recent AI messages.
    # Let's fetch last 100 AI messages and parse for charts to avoid full table scan overhead if possible, 
    # but for this specific user dashboard, fetching all user AI messages is likely fine for MVP.
    
    ai_messages = db.query(ChatMessage).join(ChatSession).filter(
        ChatSession.user_id == current_user.id,
        ChatMessage.role == 'ai'
    ).order_by(desc(ChatMessage.created_at)).limit(50).all() 

    charts = []
    for msg in ai_messages:
        try:
            # Parse main content
            content_json = None
            if msg.content.strip().startswith('{') and msg.content.strip().endswith('}'):
                 content_json = json.loads(msg.content)
            
            if not content_json:
                continue

            chart_config = None

            # Case 1: Explicit 'chart' content_type (preferred)
            if msg.content_type == 'chart' and "chart" in content_json:
                chart_config = content_json["chart"]
            
            # Case 2: Implicit structure (fallback)
            elif "chart" in content_json:
                chart_config = content_json["chart"]
            elif "type" in content_json and "data" in content_json:
                chart_config = content_json

            if chart_config:
                 charts.append({
                     "id": str(msg.id),
                     "session_title": msg.session.title,
                     "created_at": msg.created_at,
                     "chart_config": chart_config
                 })
        except Exception:
            continue
            
    return charts
