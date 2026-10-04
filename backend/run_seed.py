import asyncio
from app.seed import seed_database
from app.database import async_session_maker

async def run():
    async with async_session_maker() as session:
        await seed_database(session)

if __name__ == "__main__":
    asyncio.run(run())
