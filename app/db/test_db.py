import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import engine, async_session
from app.db.crud import get_or_create_user, save_value, get_user_values
from app.db.models import Base


async def init_db():
    """Создаёт таблицы в базе данных (если они ещё не созданы)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def test_database():
    """Тестирует подключение и операции с базой данных."""
    # Инициализируем таблицы
    await init_db()
    
    # Тестовый telegram_id и username
    test_telegram_id = 123456789
    test_username = "test_user"
    test_value = "семья"

    # Создаём или получаем пользователя
    async with async_session() as session:
        print(f"Создаём или получаем пользователя с telegram_id={test_telegram_id}...")
        user = await get_or_create_user(session, test_telegram_id, test_username)
        print(f"Пользователь: id={user.id}, telegram_id={user.telegram_id}, username={user.username}")

        # Добавляем ценность
        print(f"Добавляем ценность '{test_value}' для пользователя...")
        value = await save_value(session, user.id, test_value)
        print(f"Сохранённая ценность: id={value.id}, value={value.value}, user_id={value.user_id}")

        # Получаем все ценности пользователя
        values = await get_user_values(session, test_telegram_id)
        print(f"Все ценности пользователя: {values}")

if __name__ == "__main__":
    asyncio.run(test_database())