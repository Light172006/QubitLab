import time
from collections import defaultdict
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

class RateLimiterMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.requests = defaultdict(list)
        
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        
        # Determine limit based on path
        if path.startswith("/api/tutor"):
            limit = 30
        elif path.startswith("/api/simulate"):
            limit = 20
        else:
            limit = 100
            
        window = 60 # 1 minute
        
        # Get identifier (user_id from token if available, else IP)
        identifier = getattr(request.state, "user", {}).get("sub")
        if not identifier:
            identifier = request.client.host if request.client else "unknown"
            
        key = f"{identifier}:{path}"
        current_time = time.time()
        
        # Clean up old requests
        self.requests[key] = [t for t in self.requests[key] if current_time - t < window]
        
        if len(self.requests[key]) >= limit:
            reset_time = int(self.requests[key][0] + window)
            headers = {
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(reset_time)
            }
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests"},
                headers=headers
            )
            
        self.requests[key].append(current_time)
        
        remaining = limit - len(self.requests[key])
        reset_time = int(self.requests[key][0] + window) if self.requests[key] else int(current_time + window)
        
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset_time)
        
        return response
