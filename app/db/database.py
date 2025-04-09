from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.sql import text
from app.config import settings

DATABASE_URL = settings.database_url
engine = create_async_engine(DATABASE_URL, echo=True)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session

async def test_connection():
    async with engine.connect() as conn:
        # Используем text() для создания исполняемого запроса
        await conn.execute(text("SELECT 1"))
    print("Database connection successful!")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_connection())