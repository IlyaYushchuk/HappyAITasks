import logging
from aiogram import types
from aiogram.fsm.context import FSMContext
from app.openai_client.vision import analyze_mood_from_photo
from app.analytics.amplitude import log_event

logger = logging.getLogger(__name__)

async def handle_photo_message(message: types.Message, state: FSMContext):
    """
    Обрабатывает фото от пользователя, анализирует настроение и отправляет ответ.
    """
    
    telegram_id = message.from_user.id
    username = message.from_user.username or message.from_user.first_name or "unknown"
    
    log_event(telegram_id, "user_sent_photo", {"username": username})
    
    try:
        photo = message.photo[-1]
        file = await message.bot.get_file(photo.file_id)
        file_url = f"https://api.telegram.org/file/bot{message.bot.token}/{file.file_path}"
        
        response = await analyze_mood_from_photo(file_url, telegram_id)
        
        logger.info(f"OpenAI API mood response: {response}")
        log_event(telegram_id, "mood_detected", {"mood_response": response})
        
        await message.reply(response)
    except Exception as e:
        logger.error(f"Error processing photo for telegram_id={telegram_id}: {e}")
        await message.reply("Не удалось обработать фото. Попробуй ещё раз!")
    
    await state.clear()