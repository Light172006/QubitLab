from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, RefreshRequest, UserResponse
from app.services.auth_service import register_user, authenticate_user, create_access_token, create_refresh_token, decode_token, get_current_user

router = APIRouter(tags=['auth'])
security = HTTPBearer()

async def get_current_user_dep(credentials: HTTPAuthorizationCredentials = Depends(security), db: AsyncSession = Depends(get_db)):
    return await get_current_user(db, credentials.credentials)

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user and auto-login."""
    user = await register_user(db, request.email, request.password, request.name)
    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    return TokenResponse(access_token=access_token, refresh_token=refresh_token, token_type="bearer")

@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login user."""
    user = await authenticate_user(db, request.email, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    return TokenResponse(access_token=access_token, refresh_token=refresh_token, token_type="bearer")

@router.post("/refresh", response_model=TokenResponse)
async def refresh(request: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Refresh access token."""
    payload = decode_token(request.refresh_token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    access_token = create_access_token({"sub": payload.get("sub")})
    refresh_token = create_refresh_token({"sub": payload.get("sub")})
    return TokenResponse(access_token=access_token, refresh_token=refresh_token, token_type="bearer")

@router.get("/me", response_model=UserResponse)
async def get_me(current_user = Depends(get_current_user_dep)):
    """Get current user info."""
    return current_user
