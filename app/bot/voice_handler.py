# app/bot/voice_handler.py
import asyncio
from pathlib import Path
from aiogram import Bot, types
from aiogram.types import FSInputFile
from app.openai_client.client import transcribe_audio, text_to_speech, process_assistant_response
from app.bot.utils import save_audio
from app.bot.states import ValueState

async def handle_voice_message(bot: Bot, message: types.Message, state):
    ogg_path = f"temp_{message.message_id}.ogg"
    output_path = f"output_{message.message_id}.mp3"

    try:
        print(f"Скачиваем файл: {ogg_path}")
        await save_audio(bot, message.voice, ogg_path)
        print(f"Преобразуем аудио в текст: {ogg_path}")
        text = await transcribe_audio(ogg_path)
        print("Обрабатываем ответ через ассистента")
        response_text = await process_assistant_response(message.from_user.id, text)
        print(f"Преобразуем текст в аудио: {output_path}")
        await text_to_speech(response_text, output_path)
        print(f"Отправляем аудио: {output_path}")
        await message.reply_voice(FSInputFile(output_path))
        if "сохранена" in response_text.lower():
            await state.clear()
            await message.reply("Ценность сохранена! Хочешь добавить ещё? Отправь сообщение.")
        else:
            await state.set_state(ValueState.waiting_for_response)
    finally:
        for path in [ogg_path, output_path]:
            if Path(path).exists():
                print(f"Пытаемся удалить файл: {path}")
                for attempt in range(3):
                    try:
                        await asyncio.sleep(0.5)
                        Path(path).unlink()
                        print(f"Файл удалён: {path}")
                        break
                    except PermissionError as e:
                        print(f"Попытка {attempt + 1}: Не удалось удалить файл {path}: {e}")
                        if attempt == 2:
                            print(f"Оставляем файл {path}")