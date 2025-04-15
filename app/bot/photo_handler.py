import logging
from aiogram import Bot, types
from aiogram.fsm.context import FSMContext
from app.openai_client.vision import analyze_mood_from_photo
from app.analytics.amplitude import log_event

logger = logging.getLogger(__name__)

async def handle_photo_message(message: types.Message, state: FSMContext):
    """
    Обрабатывает фото от пользователя, анализирует настроение и отправляет ответ.
    """
    print(f"Bot1: {message.bot}")
    telegram_id = message.from_user.id
    username = message.from_user.username or message.from_user.first_name or "unknown"
    
    # Логируем событие отправки фото
    log_event(telegram_id, "user_sent_photo", {"username": username})
    
    try:
        # Берём фото наилучшего качества
        print(f"Bot2: {message.bot}")
        photo = message.photo[-1]
        file = await message.bot.get_file(photo.file_id)
        file_url = f"https://api.telegram.org/file/bot{message.bot.token}/{file.file_path}"
        
        # Анализируем настроение через OpenAI Vision API
        response = await analyze_mood_from_photo(file_url, telegram_id)
        print(f"Response: {response}")
        # Логируем результат анализа
        log_event(telegram_id, "mood_detected", {"mood_response": response})
        
        # Отправляем ответ пользователю
        await message.reply(response)
    except Exception as e:
        logger.error(f"Error processing photo for telegram_id={telegram_id}: {e}")
        await message.reply("Не удалось обработать фото. Попробуй ещё раз!")
    
    # Сбрасываем состояние, чтобы пользователь мог продолжить
    await state.clear()