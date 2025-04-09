
from aiogram import types
from aiogram import Bot

async def save_audio(bot: Bot, file: types.Voice, file_path: str):
    """Сохраняет голосовое сообщение в файл."""
    file_info = await bot.get_file(file.file_id)
    file_bytes = await bot.download_file(file_info.file_path)
    with open(file_path, "wb") as f:
        f.write(file_bytes.read())