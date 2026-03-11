from pydantic import BaseModel
from typing import Optional, List, Any, Union
from datetime import datetime
from uuid import UUID

class ChatRequest(BaseModel):
    message: str
    connection_id: int
    session_id: Optional[UUID] = None

class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    content_type: str = "text"
    created_at: datetime
    
    class Config:
        orm_mode = True

class ChatResponse(BaseModel):
    response: str
    content_type: str = "text"
    session_id: UUID
    history: List[MessageResponse]

class SessionResponse(BaseModel):
    id: UUID
    title: str
    last_active_at: datetime

    class Config:
        orm_mode = True

class ChatSessionUpdate(BaseModel):
    title: str

class CreateChatSessionRequest(BaseModel):
    title: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    avatar_url: Optional[str] = None

    class Config:
        orm_mode = True

class UserUpdate(BaseModel):
    name: str
    email: str

class ColumnSchema(BaseModel):
    name: str
    type: str

class TableSchema(BaseModel):
    name: str
    columns: List[ColumnSchema]

class SchemaResponse(BaseModel):
    tables: List[TableSchema]
