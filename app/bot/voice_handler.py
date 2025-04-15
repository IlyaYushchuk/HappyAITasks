from pathlib import Path
from aiogram import Bot, types
from aiogram.types import FSInputFile
from aiogram.fsm.context import FSMContext
from app.openai_client.client import transcribe_audio, text_to_speech, process_assistant_response
from app.bot.utils import save_audio
from app.bot.states import ValueState


async def handle_voice_message(bot: Bot, message: types.Message, state: FSMContext):
    ogg_path = f"temp_{message.message_id}.ogg"
    output_path = f"output_{message.message_id}.mp3"

    try:
     
        await save_audio(bot, message.voice, ogg_path)
       
        text = await transcribe_audio(ogg_path)
        response_text = await process_assistant_response(message.from_user.id, text, message.from_user.username)
     
        await text_to_speech(response_text, output_path)
    
        await message.reply_voice(FSInputFile(output_path))
        if "сохранена" in response_text.lower():
            await state.clear()
            await message.reply("Ценность сохранена! Хочешь добавить ещё? Отправь сообщение.")
        else:
            await state.set_state(ValueState.waiting_for_response)
    finally:
        for path in [ogg_path, output_path]:
            if Path(path).exists():
                try:
                    Path(path).unlink()
                    print(f"Файл удалён: {path}")
                except PermissionError as e:
                    print(f"Не удалось удалить файл {path}: {e}")
                except Exception as e:
                    print(f"Ошибка при удалении файла {path}: {e}")
            else:
                print(f"Файл {path} уже не существует, пропускаем удаление")