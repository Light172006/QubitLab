@echo off
echo ==============================================
echo  QubitLab Backend Development Environment
echo ==============================================

cd backend

echo.
echo Creating virtual environment...
python -m venv venv

echo.
echo Activating virtual environment...
call venv\Scripts\activate

echo.
echo Installing requirements...
pip install -r requirements.txt

echo.
echo Starting services with docker-compose (for PostgreSQL and Redis)...
docker-compose up -d db redis

echo.
echo Please copy backend\.env.example to backend\.env and configure it!
echo Once the database is ready, you can run migrations and seed data:
echo.
echo   alembic upgrade head
echo   python -c "import asyncio; from app.seed import seed_database; from app.database import async_sessionmaker; asyncio.run(seed_database(async_sessionmaker()))"
echo.
echo To start the backend API server:
echo.
echo   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
echo.
pause
