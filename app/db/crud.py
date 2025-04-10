from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import User, Value

async def get_or_create_user(session: AsyncSession, telegram_id: int, username: str = None) -> User:
    result = await session.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalars().first()
    
    if not user:
        user = User(telegram_id=telegram_id, username=username)
        session.add(user)
    elif user.username != username and username is not None:
        # Обновляем username, если он отличается и не None
        user.username = username
        session.add(user)
    
    await session.commit()
    await session.refresh(user)
    return user

async def save_value(session: AsyncSession, user_id: int, value: str) -> Value:
    """Сохранить ценность для пользователя."""
    print(f"Сохраняем ценность пользователя: {user_id} {value}")
    new_value = Value(user_id=user_id, value=value)
    session.add(new_value)
    await session.commit()
    await session.refresh(new_value)
    return new_value

async def get_user_values(session: AsyncSession, telegram_id: int) -> list[str]:
    """Получить все ценности пользователя."""
    result = await session.execute(
        select(Value).join(User).where(User.telegram_id == telegram_id)
    )
    values = result.scalars().all()
    return [value.value for value in values]

async def get_user_thread_id(session: AsyncSession, telegram_id: int) -> str | None:
    """Получить thread_id пользователя по telegram_id."""
    result = await session.execute(
        select(User.thread_id).where(User.telegram_id == telegram_id)
    )
    return result.scalar_one_or_none()

async def save_user_thread_id(session: AsyncSession, telegram_id: int, thread_id: str) -> None:
    """Сохранить или обновить thread_id для пользователя."""
    user = await get_or_create_user(session, telegram_id)
    user.thread_id = thread_id
    await session.commit()
    print(f"Сохранён thread_id={thread_id} для telegram_id={telegram_id}")