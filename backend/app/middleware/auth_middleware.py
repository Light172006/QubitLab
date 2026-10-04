import jwt
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from app.core.config import settings

WHITELISTED_PATHS = {
    "/api/health",
    "/api/auth/login",
    "/api/auth/register",
    "/docs",
    "/openapi.json",
    "/api/simulate/backends"
}

WHITELISTED_PREFIXES = {
    "/api/lessons": ["GET"],
    "/api/challenges": ["GET"]
}

class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        
        # Check exact whitelist
        if path in WHITELISTED_PATHS:
            return await call_next(request)
            
        # Check prefix whitelist with method
        for prefix, methods in WHITELISTED_PREFIXES.items():
            if path.startswith(prefix) and request.method in methods:
                return await call_next(request)

        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=401,
                content={"detail": "Missing or invalid authorization header"}
            )
            
        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(
                token, 
                settings.SECRET_KEY, 
                algorithms=[getattr(settings, "ALGORITHM", "HS256")]
            )
            request.state.user = payload
        except jwt.ExpiredSignatureError:
            return JSONResponse(
                status_code=401,
                content={"detail": "Token has expired"}
            )
        except jwt.PyJWTError:
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid token"}
            )
            
        return await call_next(request)
