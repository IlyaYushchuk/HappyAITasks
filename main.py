from aiogram import Bot, Dispatcher, types
from aiogram.utils import executor
from config import TELEGRAM_TOKEN
from voice_handler import handle_voice_message
import os

os.environ.pop("HTTP_PROXY", None)
os.environ.pop("HTTPS_PROXY", None)

# Инициализация бота
bot = Bot(token=TELEGRAM_TOKEN)
dp = Dispatcher(bot)

# Регистрация обработчика голосовых сообщений
@dp.message_handler(content_types=[types.ContentType.VOICE])
async def voice_message_handler(message: types.Message):
    await handle_voice_message(message)

# Обработчик текстовых команд
@dp.message_handler(commands=["start"])
async def start_command(message: types.Message):
    await message.reply("Привет! Отправь мне голосовое сообщение, и я отвечу голосом.")

if __name__ == "__main__":
    executor.start_polling(dp, skip_updates=True)