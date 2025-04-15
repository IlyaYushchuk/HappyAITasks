import asyncio
import logging
from app.bot.handlers import dp, on_startup, on_shutdown, bot 

logging.basicConfig(
    level=logging.INFO, 
    format='%(name)s - %(levelname)s - %(message)s', 
    handlers=[
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

async def main():
    try:
        logger.info("Starting bot polling...")
        await on_startup(None)
        await dp.start_polling(bot)
    finally:
        logger.info("Shutting down bot...")
        await on_shutdown(None)

if __name__ == "__main__":
    asyncio.run(main())