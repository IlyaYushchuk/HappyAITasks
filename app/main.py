import asyncio
from app.bot.handlers import dp, on_startup, on_shutdown, bot 

async def main():
    try:
        await on_startup(None)
        await dp.start_polling(bot)
    finally:
        await on_shutdown(None)

if __name__ == "__main__":
    asyncio.run(main())