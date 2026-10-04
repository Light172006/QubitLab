from pydantic import BaseModel, EmailStr, Field
from typing import Optional
import uuid
from datetime import datetime

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=255)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = 'bearer'

class RefreshRequest(BaseModel):
    refresh_token: str

class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    role: str
    avatar_url: Optional[str] = None
    created_at: datetime
    model_config = {'from_attributes': True}
