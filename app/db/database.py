from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.sql import text
from app.config import settings


engine = create_async_engine(settings.database_url, echo=False)
# Неявно заменяет QueuePool на AsyncAdaptedPool для работы в асинхронном пуле
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session

async def test_connection():
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
    print("Database connection successful!")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_connection())