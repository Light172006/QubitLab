from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    DATABASE_URL: str = 'postgresql+asyncpg://qubitlab:qubitlab@localhost:5432/qubitlab'
    REDIS_URL: str = 'redis://localhost:6379/0'
    SECRET_KEY: str = 'dev-secret-change-in-production'
    ALGORITHM: str = 'HS256'
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    GEMINI_API_KEY: str = ''
    GEMINI_MODEL: str = 'gemini-2.5-flash'
    CORS_ORIGINS: List[str] = ['http://localhost:5173', 'http://localhost:3000']
    SIMULATION_TIMEOUT: int = 30
    MAX_QUBITS: int = 12
    DEFAULT_SHOTS: int = 1024

    model_config = SettingsConfigDict(env_prefix='QUBITLAB_', env_file='.env', env_file_encoding='utf-8')

settings = Settings()

# Automatically fix database URL for asyncpg if standard postgres URL is provided
if settings.DATABASE_URL.startswith("postgres://"):
    settings.DATABASE_URL = settings.DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif settings.DATABASE_URL.startswith("postgresql://"):
    settings.DATABASE_URL = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
