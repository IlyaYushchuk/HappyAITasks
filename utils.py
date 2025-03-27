import os
import aiofiles
from aiogram.types import File

async def save_audio(file: File, file_path: str):
    """Сохранение аудиофайла"""
    file_info = await file.get_file()
    content = await file.bot.download_file(file_info.file_path)
    content_bytes = content.getvalue()
    content.close()
    
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content_bytes)