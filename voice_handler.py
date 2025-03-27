import asyncio
from pathlib import Path
from aiogram import types
from openai_client import transcribe_audio, generate_response, text_to_speech
from utils import save_audio

async def handle_voice_message(message: types.Message):
    """Обработка голосового сообщения"""
    ogg_path = f"temp_{message.message_id}.ogg"
    output_path = f"output_{message.message_id}.mp3"

    try:
        print(f"Скачиваем файл: {ogg_path}")
        await save_audio(message.voice, ogg_path)

        print(f"Преобразуем аудио в текст: {ogg_path}")
        text = await transcribe_audio(ogg_path)

        print("Генерируем текстовый ответ")
        response_text = await generate_response(text)

        print(f"Преобразуем текст в аудио: {output_path}")
        await text_to_speech(response_text, output_path)

        print(f"Отправляем аудио: {output_path}")
        with open(output_path, "rb") as audio:
            await message.reply_voice(audio)
            
    finally:
        for path in [ogg_path, output_path]:
            if Path(path).exists():
                print(f"Пытаемся удалить файл: {path}")
                for attempt in range(3):
                    try:
                        await asyncio.sleep(0.5)
                        Path(path).unlink()
                        print(f"Файл удален: {path}")
                        break
                    except PermissionError as e:
                        print(f"Попытка {attempt + 1}: Не удалось удалить файл {path}: {e}")
                        if attempt == 2:
                            print(f"Оставляем файл {path}, так как не удалось удалить")